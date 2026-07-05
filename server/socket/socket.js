// server/socket.init.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { getTimeControlInfo } from '../utils/timeControl.js';
import {
  findMatch,
  handleMove,
  getLiveGameState,
  handleResign,
  handleOfferDraw,
  handleAcceptDraw,
  createGame,
  enqueuePlayerInPool,
  removePlayerFromAllPools,
} from './handlers/gameHandlers.js';

// In-memory
const matchmakingPools = {};
export const liveGames = {};
const onlineUsers = new Map();

const lobbyPlayers = new Map();

const getCookieValue = (cookieHeader, key) => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const c of cookies) {
    const [name, ...rest] = c.trim().split('=');
    if (name === key) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
};

export const initializeSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  // Auth middleware
  io.use((socket, next) => {
    try {
      const tokenFromAuth = socket.handshake.auth?.token;
      const tokenFromCookie = getCookieValue(socket.handshake.headers.cookie, 'token');
      const token = tokenFromAuth || tokenFromCookie;

      if (!token) return next(new Error('Authentication error: No token'));
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error: Invalid token'));
        socket.userId = decoded.user.id;
        next();
      });
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (socket ${socket.id})`);
    onlineUsers.set(socket.userId, socket.id);

    socket.on('joinPool', async ({ timeControl: rawTimeControl }) => {
      try {
        const { timeControl, category } = getTimeControlInfo(rawTimeControl);
        const user = await User.findById(socket.userId).exec();
        const userRating = user ? user.ratings?.[category?.toLowerCase()] ?? 1200 : 1200;

        const player = { socketId: socket.id, userId: socket.userId, rating: userRating, joinedAt: Date.now() };
        enqueuePlayerInPool(timeControl, category, matchmakingPools, player);

        console.log(`Player ${player.userId} joined pool ${timeControl} (${category})`);
        console.log('timeControl:', timeControl, 'category:', category, 'rating:', userRating);
        findMatch(timeControl, category, io, matchmakingPools, liveGames);
      } catch (err) {
        console.error('joinPool error:', err);
      }
    });

    socket.on('leavePool', () => {
      removePlayerFromAllPools(matchmakingPools, socket.id);
      console.log(`Player ${socket.userId} left matchmaking pools`);
    });

    socket.on('joinGameRoom', (gameId) => {
      try {
        socket.join(gameId);
        console.log(`Socket ${socket.id} joined room ${gameId}`);
        const state = getLiveGameState(liveGames, gameId);
        if (state) {
          socket.emit('gameUpdate', {
            newFen: state.fen,
            turn: state.turn,
            newTimes: { w: state.initialTimes.w, b: state.initialTimes.b },
            players: state.players,
            // optionally include moves to fully sync client:
            lastMove: state.moves.length ? state.moves[state.moves.length - 1] : undefined
          });
        } else {
          // If server restarted and liveGames not present, client should fetch DB state via REST GET /games/:id
        }
      } catch (err) {
        console.error('joinGameRoom error:', err);
      }
    });

    socket.on('leaveGameRoom', (gameId) => {
      try {
        socket.leave(gameId);
        console.log(`Socket ${socket.id} left room ${gameId}`);
      } catch (err) {
        console.error('leaveGameRoom error:', err);
      }
    });

    socket.on('move', (data) => {
      try {
        handleMove(io, socket, liveGames, data);
      } catch (err) {
        console.error('move handler error:', err);
      }
    });

    socket.on('resign', () => {
      try {
        handleResign(io, socket, liveGames);
      }
      catch (err) {
        console.error('resign handler error:', err);
      }
    });
    socket.on('offerDraw', () => {
      try {
        console.log('offerDraw received (server) from', socket.userId);
        handleOfferDraw(io, socket, liveGames);
      } catch (err) {
        console.error('offerDraw handler error:', err);
      }
    });
    socket.on('acceptDraw', () => {
      try {
        handleAcceptDraw(io, socket, liveGames);
      } catch (err) {
        console.error('acceptDraw handler error:', err);
      }
    });

    socket.on('joinLobby', async () => {
      try {
        const user = await User.findById(socket.userId).select('username ratings country').lean();
        if (!user) return;

        const playerData = {
          socketId: socket.id,
          userId: socket.userId,
          username: user.username,
          rating: user.ratings?.blitz || 1200, 
          country: user.country
        };

        lobbyPlayers.set(socket.id, playerData);

        
        socket.join('lobbyRoom');
        io.to('lobbyRoom').emit('lobbyUpdate', Array.from(lobbyPlayers.values()));

        console.log(`${user.username} joined the challenge lobby`);
      } catch (err) {
        console.error("Error joining lobby:", err);
      }
    });

    
    socket.on('leaveLobby', () => {
      lobbyPlayers.delete(socket.id);
      socket.leave('lobbyRoom');
      io.to('lobbyRoom').emit('lobbyUpdate', Array.from(lobbyPlayers.values()));
    });

    
    socket.on('sendChallenge', ({ targetSocketId, timeControl }) => {
      const sender = lobbyPlayers.get(socket.id);
      if (!sender) return;

      
      io.to(targetSocketId).emit('challengeReceived', {
        from: {
          socketId: socket.id,
          username: sender.username,
          rating: sender.rating
        },
        timeControl: timeControl || '5+0' // Default to Blitz if not specified
      });
    });

   
    socket.on('acceptChallenge', async ({ challengerSocketId, timeControl }) => {
      const challenger = lobbyPlayers.get(challengerSocketId);
      const accepter = lobbyPlayers.get(socket.id);

      if (!challenger || !accepter) {
        socket.emit('challengeError', 'Player is no longer in the lobby.');
        return;
      }

     
      lobbyPlayers.delete(challengerSocketId);
      lobbyPlayers.delete(socket.id);

      
      io.to('lobbyRoom').emit('lobbyUpdate', Array.from(lobbyPlayers.values()));

      
      const whitePlayer = { ...challenger, color: 'w' }; 
      const blackPlayer = { ...accepter, color: 'b' };  

    
      const { category } = getTimeControlInfo(timeControl);

      await createGame(whitePlayer, blackPlayer, timeControl, io, liveGames, category);
    });

    
    socket.on('declineChallenge', ({ challengerSocketId }) => {
      const decliner = lobbyPlayers.get(socket.id);
      io.to(challengerSocketId).emit('challengeDeclined', {
        by: decliner?.username || 'Opponent'
      });
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);

      // update lastSeen
      try {
        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
      } catch (err) {
        console.error('Failed to update lastSeen', err);
      }

      removePlayerFromAllPools(matchmakingPools, socket.id);

      if (lobbyPlayers.has(socket.id)) {
        lobbyPlayers.delete(socket.id);
        io.to('lobbyRoom').emit('lobbyUpdate', Array.from(lobbyPlayers.values()));
      }
    });
  });

  return io;
};
