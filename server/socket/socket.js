// server/socket.init.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { getTimeControlInfo } from '../utils/timeControl.js';
import { findMatch, handleMove, getLiveGameState ,  handleResign, handleOfferDraw, handleAcceptDraw } from './handlers/gameHandlers.js';

// In-memory
const matchmakingPools = {};
export const liveGames = {};
const onlineUsers = new Map();

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
      const token = socket.handshake.auth?.token || (socket.handshake.headers.cookie || '').split('token=')[1];
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

        if (!matchmakingPools[timeControl]) matchmakingPools[timeControl] = [];

        const player = { socketId: socket.id, userId: socket.userId, rating: userRating, joinedAt: Date.now() };
        matchmakingPools[timeControl].push(player);

        console.log(`Player ${player.userId} joined pool ${timeControl} (${category})`);
        console.log('timeControl:', timeControl, 'category:', category, 'rating:', userRating);
        findMatch(timeControl,category, io, matchmakingPools, liveGames);
      } catch (err) {
        console.error('joinPool error:', err);
      }
    });

    socket.on('leavePool', () => {
      for (const poolName in matchmakingPools) {
        matchmakingPools[poolName] = matchmakingPools[poolName].filter(p => p.socketId !== socket.id);
      }
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

    socket.on('resign', () =>{
      try{
        handleResign(io, socket, liveGames);
      }
      catch(err){
        console.error('resign handler error:', err);
      }
    });
    socket.on('offerDraw', () => {
      try{
        handleOfferDraw(io, socket, liveGames);
      } catch(err){
        console.error('offerDraw handler error:', err);
      }
    });
    socket.on('acceptDraw', () => {
      try{
        handleAcceptDraw(io, socket, liveGames);
      } catch(err){
        console.error('acceptDraw handler error:', err);
      }
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

      for (const poolName in matchmakingPools) {
        matchmakingPools[poolName] = matchmakingPools[poolName].filter(p => p.socketId !== socket.id);
      }
    });
  });

  return io;
};
