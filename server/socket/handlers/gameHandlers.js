// server/handlers/gameHandlers.js
import Game from '../../models/Game.model.js';
import User from '../../models/User.model.js';
import { getTimeControlInfo } from '../../utils/timeControl.js';
import { Chess } from 'chess.js';
import getRatingTypeFromTimeControl from '../../utils/getRatingTypeFromTimeControl.js';



function calculateElo(playerRating, opponentRating, score, K = 32) {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  return Math.round(playerRating + K * (score - expected));
}


async function finalizeGame(io, liveGames, gameId, game, winner, reason, resultTag, whiteScore, blackScore, terminationText) {
  const newFen = game.fen;
  const finalChess = new Chess();

  for (const m of game.moves) finalChess.move(m.san);

  const white = game.players.find(p => p.color === "w");
  const black = game.players.find(p => p.color === "b");

  // Determine the time control of the game
  const ratingKey = game.category.toLowerCase(); // e.g., 'bullet', 'blitz', 'rapid', 'classical'

 

  const newWhiteRating = calculateElo(
    white.rating,
    black.rating,
    whiteScore
  );
  const newBlackRating = calculateElo(
    black.rating,
    white.rating,
    blackScore
  );

  console.log('new ratings:', {
    white: { old: white.rating, new: newWhiteRating },
    black: { old: black.rating, new: newBlackRating }
  });

  await Promise.all([
    User.findByIdAndUpdate(white.user._id, { [`ratings.${ratingKey}`]: newWhiteRating }),
    User.findByIdAndUpdate(black.user._id, { [`ratings.${ratingKey}`]: newBlackRating }),
  ]);

  // Set PGN headers
  finalChess.setHeader({
    Event: "PlayChess",
    Site: "PlayChess",
    Date: new Date().toISOString().split("T")[0].replace(/-/g, "."),
    Round: "1",
    White: `${white.user.username} (${white.rating})`,
    Black: `${black.user.username} (${black.rating})`,
    Result: resultTag,
    Termination: terminationText,
  });

  // Save in DB
  await Game.findByIdAndUpdate(gameId, {
    status: "completed",
    winner,
    endReason: reason,
    fen: newFen,
    pgn: finalChess.pgn(),
    [`players.0.rating`]: newWhiteRating,
    [`players.1.rating`]: newBlackRating,
  });

  // Emit gameOver event with updated ratings
  io.to(gameId).emit("gameOver", {
    reason,
    winner,
    players: {
      white: { username: white.user.username, oldRating: white.rating, newRating: newWhiteRating },
      black: { username: black.user.username, oldRating: black.rating, newRating: newBlackRating },
    },
    pgn: finalChess.pgn(),
    fen: newFen,
  });

  delete liveGames[gameId];
}




/**
 * findMatch, createGame, gameTick, handleMove, getLiveGameState
 * - liveGames is passed in by the socket initializer and is the source of truth for timers while server is running
 */

export const findMatch = (timeControl, category, io, matchmakingPools, liveGames) => {
  const pool = matchmakingPools[timeControl];
  if (!pool || pool.length < 2) return;

  pool.sort((a, b) => a.rating - b.rating);

  for (let i = 0; i < pool.length - 1; i++) {
    const player1 = pool[i];

    let bestOpponent = null;
    let smallestDiff = Infinity;

    for (let j = i + 1; j < pool.length; j++) {
      const player2 = pool[j];
      if (player1.userId === player2.userId) continue;
      const diff = Math.abs(player1.rating - player2.rating);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        bestOpponent = player2;
      }
    }

    console.log('Best opponent for', player1.userId, 'is', bestOpponent ? bestOpponent.userId : 'none', 'with diff', smallestDiff);

    if (bestOpponent) {
      const waitTime = (Date.now() - player1.joinedAt) / 1000;
      const acceptableRange = 100 + (Math.floor(waitTime / 10) * 50);

      if (smallestDiff <= acceptableRange) {
        matchmakingPools[timeControl] = pool.filter(p => p.userId !== player1.userId && p.userId !== bestOpponent.userId);

        const players = Math.random() < 0.5 ? [player1, bestOpponent] : [bestOpponent, player1];

        console.log(`Match found between ${players[0].userId} and ${players[1].userId} in pool ${timeControl} (${category}) with rating diff ${smallestDiff} (acceptable: ${acceptableRange})`);

        createGame(players[0], players[1], timeControl, io, liveGames,category);

        // schedule next match attempt asynchronously
        setTimeout(() => findMatch(timeControl,category, io, matchmakingPools, liveGames), 0);
        return;
      }
    }
  }
};

export const createGame = async (whitePlayer, blackPlayer, timeControl, io, liveGames,category) => {
  try {
    const { minutes, increment } = getTimeControlInfo(timeControl);
    const initialFen = new Chess().fen();

    const newGame = new Game({
      players: [
        { user: whitePlayer.userId, color: 'w', rating: whitePlayer.rating },
        { user: blackPlayer.userId, color: 'b', rating: blackPlayer.rating }
      ],
      timeControl,
      category,
      status: 'inprogress',
      fen: initialFen,
      moves: []
    });
    await newGame.save();

    const gameId = newGame._id.toString();

    const socket1 = io.sockets.sockets.get(whitePlayer.socketId);
    const socket2 = io.sockets.sockets.get(blackPlayer.socketId);

    const whiteUserDetails = await User.findById(whitePlayer.userId).select('username country').lean();
    const blackUserDetails = await User.findById(blackPlayer.userId).select('username country').lean();

    if (!whiteUserDetails || !blackUserDetails) {
      console.error('User details missing for players', whitePlayer.userId, blackPlayer.userId);
      await Game.findByIdAndUpdate(newGame._id, { status: 'aborted', endReason: 'user_missing' });
      return;
    }

    // normalize ids to strings
    whiteUserDetails._id = String(whiteUserDetails._id);
    blackUserDetails._id = String(blackUserDetails._id);

    if (socket1 && socket2) {
      socket1.join(gameId);
      socket2.join(gameId);

      liveGames[gameId] = {
        players: [
          { userId: String(whitePlayer.userId), user: whiteUserDetails, socketId: whitePlayer.socketId, color: 'w', rating: whitePlayer.rating },
          { userId: String(blackPlayer.userId), user: blackUserDetails, socketId: blackPlayer.socketId, color: 'b', rating: blackPlayer.rating }
        ],
        fen: newGame.fen || initialFen,
        whiteTime: minutes * 60 * 1000,
        blackTime: minutes * 60 * 1000,
        increment: increment * 1000,
        turn: 'w',
        lastMoveTimestamp: Date.now(),
        timer: setInterval(() => gameTick(gameId, io, liveGames), 5000),
        timeControl,
        category,
        moves: [] // in-memory moves for quick access
      };

      io.to(gameId).emit('matchFound', {
        players: [
          { user: whiteUserDetails, userId: String(whitePlayer.userId), color: 'w', rating: whitePlayer.rating },
          { user: blackUserDetails, userId: String(blackPlayer.userId), color: 'b', rating: blackPlayer.rating }
        ],
        gameId,
        white: { ...whiteUserDetails, rating: whitePlayer.rating },
        black: { ...blackUserDetails, rating: blackPlayer.rating },
        timeControl,
        category,
        turn: 'w',
        fen: liveGames[gameId].fen,
        initialTimes: { w: liveGames[gameId].whiteTime, b: liveGames[gameId].blackTime }
      });
    } else {
      console.warn('Missing socket(s) when creating game', { socket1: !!socket1, socket2: !!socket2 });
      await Game.findByIdAndUpdate(newGame._id, { status: 'aborted', endReason: 'socket_missing' });
    }
  } catch (error) {
    console.error('Error in createGame:', error);
  }
};

export const gameTick = async (gameId, io, liveGames) => {
  const game = liveGames[gameId];
  if (!game) return;

  const now = Date.now();
  const timeElapsed = now - game.lastMoveTimestamp;
  game.lastMoveTimestamp = now;

  // Decrement active player's clock
  if (game.turn === 'w') game.whiteTime -= timeElapsed;
  else game.blackTime -= timeElapsed;

  // Check if time expired
  if (game.whiteTime <= 0 || game.blackTime <= 0) {
    clearInterval(game.timer);

    const losingColor = game.whiteTime <= 0 ? 'w' : 'b';
    const winnerColor = losingColor === 'w' ? 'black' : 'white';

    // Define PGN result and rating scores
    const resultTag = winnerColor === "white" ? "1-0" : "0-1";
    const whiteScore = winnerColor === "white" ? 1 : 0;
    const blackScore = winnerColor === "black" ? 1 : 0;

    try {
      await finalizeGame(
        io,
        liveGames,
        gameId,
        game,
        winnerColor,
        "timeout",
        resultTag,
        whiteScore,
        blackScore,
        "Game lost on time"
      );
    } catch (err) {
      console.error("Error finalizing timeout game:", err);
    }

    return;
  }

  // Still ongoing — emit updated time to both players
  io.to(gameId).emit("timeUpdate", { white: game.whiteTime, black: game.blackTime });

};

export const handleMove = async (io, socket, liveGames, { gameId, move }) => {
  try {
    const game = liveGames[gameId];
    if (!game) {
      // Could optionally fetch from DB (server restart) — not implemented here
      return;
    }

    const player = game.players.find(p => String(p.userId) === String(socket.userId));
    if (!player) {
      return socket.emit('invalidMove', { message: 'Player not found in this game.' });
    }
    if (player.color !== game.turn) {
      return socket.emit('invalidMove', { message: 'Not your turn.' });
    }

    const chess = new Chess(game.fen);
    const result = chess.move(move); // { from, to, san, piece, color, captured, promotion, flags }

    if (!result) {
      return socket.emit('invalidMove', { message: 'Illegal move.' });
    }

    const newFen = chess.fen();
    game.fen = newFen;
    game.turn = chess.turn();

    const now = Date.now();
    const timeSpent = now - game.lastMoveTimestamp;
    if (player.color === 'w') game.whiteTime = Math.max(0, game.whiteTime - timeSpent) + game.increment;
    else game.blackTime = Math.max(0, game.blackTime - timeSpent) + game.increment;
    game.lastMoveTimestamp = now;

    // build move object for DB & clients
    const moveObj = {
      from: result.from,
      to: result.to,
      promotion: result.promotion || null,
      san: result.san,
      fen: newFen,
      captured: result.captured || null
    };

    // persist move to DB (push to moves and set fen)
    Game.findByIdAndUpdate(gameId, { $push: { moves: moveObj }, $set: { fen: newFen } })
      .catch(err => console.error('Failed to persist move to DB:', err));

    // also keep in memory
    if (!game.moves) game.moves = [];
    game.moves.push(moveObj);

    // broadcast authoritative update
    io.to(gameId).emit('gameUpdate', {
      newFen,
      turn: game.turn,
      newTimes: { w: game.whiteTime, b: game.blackTime },
      lastMove: moveObj
    });

    // Check for terminal states
    if (chess.isCheckmate && chess.isCheckmate()) {
      const winner = chess.turn() === "w" ? "black" : "white"; // turn() is the losing side
      const whiteScore = winner === "white" ? 1 : 0;
      const blackScore = winner === "black" ? 1 : 0;
      try {
        await finalizeGame(io, liveGames, gameId, game, winner, "checkmate",
          winner === "white" ? "1-0" : "0-1",
          whiteScore, blackScore, "Checkmate"
        );
      }
      catch (err) {
        console.error('Error saving finished game (checkmate):', err);
      }

      return;
    }

    if ((chess.isDraw && chess.isDraw()) ||
      (chess.isStalemate && chess.isStalemate()) ||
      (chess.isThreefoldRepetition && chess.isThreefoldRepetition()) ||
      (chess.isInsufficientMaterial && chess.isInsufficientMaterial())) {
      clearInterval(game.timer);


      try {
        await finalizeGame(io, liveGames, gameId, game, null, "draw",
          "1/2-1/2", 0.5, 0.5,
          chess.isStalemate?.() ? "Stalemate" :
            chess.isThreefoldRepetition?.() ? "Threefold repetition" :
              "Draw by agreement"
        );
      }
      catch (err) {
        console.error('Error saving finished game (draw):', err);
      }
    }

    // otherwise, game continues (fen persisted earlier asynchronously)
  } catch (error) {
    console.error('Error handling move:', error);
  }
};

export const getLiveGameState = (liveGames, gameId) => {
  const g = liveGames[gameId];
  if (!g) return null;
  return {
    fen: g.fen,
    turn: g.turn,
    players: g.players,
    initialTimes: { w: g.whiteTime, b: g.blackTime },
    moves: g.moves || []
  };
};


export const handleResign = async (io, socket, liveGames) => {
  try {
    const gameId = findGameIdBySocketId(socket.id, liveGames);
    if (!gameId) return;

    const game = liveGames[gameId];
    clearInterval(game.timer);

    const resigningPlayer = game.players.find(p => p.userId === socket.userId);
    const winnerColor = resigningPlayer.color === "w" ? "black" : "white";

    // Define result fields
    const resultTag = winnerColor === "white" ? "1-0" : "0-1";
    const whiteScore = winnerColor === "white" ? 1 : 0;
    const blackScore = winnerColor === "black" ? 1 : 0;

    await finalizeGame(
      io,
      liveGames,
      gameId,
      game,
      winnerColor,
      "resignation",
      resultTag,
      whiteScore,
      blackScore,
      "Game terminated by resignation"
    );
  } catch (error) {
    console.error("Error handling resignation:", error);
  }
};

export const handleOfferDraw = (io, socket, liveGames) => {
  const gameId = findGameIdBySocketId(socket.id, liveGames);
  if (!gameId) return;
  const game = liveGames[gameId];

  const offeringPlayer = game.players.find(p => p.userId === socket.userId);
  const opponent = game.players.find(p => p.userId !== socket.userId);

  if (opponent) {
    const opponentSocket = io.sockets.sockets.get(opponent.socketId);
    if (opponentSocket) {
      opponentSocket.emit("drawOffered", {
        from: offeringPlayer.user.username,
        gameId
      });
    }
  }
};

export const handleAcceptDraw = async (io, socket, liveGames) => {
  try {
    const gameId = findGameIdBySocketId(socket.id, liveGames);
    if (!gameId) return;

    const game = liveGames[gameId];
    clearInterval(game.timer);

    const resultTag = "1/2-1/2";
    const whiteScore = 0.5;
    const blackScore = 0.5;

    await finalizeGame(
      io,
      liveGames,
      gameId,
      game,
      "draw",
      "agreement",
      resultTag,
      whiteScore,
      blackScore,
      "Game drawn by mutual agreement"
    );
  } catch (error) {
    console.error("Error handling draw acceptance:", error);
  }
};

const findGameIdBySocketId = (socketId, liveGames) => {
  return Object.keys(liveGames).find(gameId =>
    liveGames[gameId].players.some(p => p.socketId === socketId)
  );
};