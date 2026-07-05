// client/src/pages/GamePage.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import GameOverModal from '../components/game/GameOverModal';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { Chessboard } from 'react-chessboard';
import Loader from '../components/Loader';
import { Chess } from 'chess.js';

/* ---------------- UI helpers ---------------- */
const pieceIcons = {
  p: '♟',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚'
};

const PlayerInfo = ({ player }) => (
  <div className="flex items-center space-x-3 p-2 w-full">
    <div className="w-10 h-10 bg-gray-600 rounded-full flex-shrink-0" />
    <div>
      <h3 className="text-lg font-semibold truncate">{player?.username} {player?.rating ? `(${player.rating})` : ''}</h3>
    </div>
  </div>
);

const Clock = ({ timeInMillis }) => {
  const formatTime = (ms = 0) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };
  return <div className="bg-gray-900 text-white text-3xl font-mono p-2 rounded-md ml-auto">{formatTime(timeInMillis)}</div>;
};

const MoveHistoryPanel = ({ history, index, onJump }) => (
  <div className="bg-gray-900 h-full rounded-md p-2 flex flex-col">
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm text-gray-300">Move history</div>
      <div className="flex space-x-1">
        <button onClick={() => onJump(0)} className="px-2 py-1 bg-gray-600 rounded">Start</button>
        <button onClick={() => onJump(Math.max(0, index - 1))} className="px-2 py-1 bg-gray-600 rounded">Prev</button>
        <button onClick={() => onJump(index + 1)} className="px-2 py-1 bg-gray-600 rounded">Next</button>
        <button onClick={() => onJump(history.length)} className="px-2 py-1 bg-gray-600 rounded">Live</button>
      </div>
    </div>

    <div className="overflow-y-auto flex-1 p-1">
      <ol className="list-decimal pl-4 space-y-1 text-sm text-gray-200">
        {history.map((m, i) => (
          <li key={i} className={i === (index - 1) ? "bg-gray-700 p-1 rounded" : ""}>
            <span className="font-mono">{m.san}</span>
            {m.captured && <span className="ml-2 text-red-400">× {pieceIcons[m.captured.toLowerCase()]}</span>}
            <div className="text-xs text-gray-400">{m.from}-{m.to}{m.promotion ? `=${m.promotion}` : ''}</div>
          </li>
        ))}
      </ol>
    </div>
  </div>
);

/* ---------------- normalize payloads ---------------- */
const normalizeGameData = (raw) => {
  const data = { ...raw };
  const players = (raw.players || []).map(p => {
    const userObj = (p.user && typeof p.user === 'object')
      ? { _id: String(p.user._id || p.user), username: p.user.username, country: p.user.country, rating: p.rating }
      : { _id: String(p.user) };
    return {
      ...p,
      user: userObj,
      userId: String((p.user && (p.user._id || p.user)) || p.userId || userObj._id),
    };
  });

  if (players.length === 0 && raw.white && raw.black) {
    players.push({
      user: { _id: String(raw.white._id), username: raw.white.username, country: raw.white.country },
      userId: String(raw.white._id),
      color: 'w',
      rating: raw.white.rating
    });
    players.push({
      user: { _id: String(raw.black._id), username: raw.black.username, country: raw.black.country },
      userId: String(raw.black._id),
      color: 'b',
      rating: raw.black.rating
    });
  }

  return {
    ...data,
    players,
    fen: raw.fen || new Chess().fen(),
    initialTimes: raw.initialTimes || { w: 0, b: 0 }
  };
};



/* ------------------ main component ------------------ */
const GamePage = () => {
  const { gameId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(new Chess().fen());
  const [playerColor, setPlayerColor] = useState(null);
  const [turn, setTurn] = useState('w');
  const [gameData, setGameData] = useState(location.state?.gameData ? normalizeGameData(location.state.gameData) : null);

  const [displayTime, setDisplayTime] = useState({ w: 0, b: 0 });
  const [isLoading, setIsLoading] = useState(!location.state?.gameData);

  // history + replay
  const [moveHistory, setMoveHistory] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0); // index = #moves shown. index === moveHistory.length -> live

  const [gameOver, setGameOver] = useState(false);
  const [gameOverData, setGameOverData] = useState(null);
  const [promotionMove, setPromotionMove] = useState(null); // { from, to, fenBefore }


  const serverTimeRef = useRef({ w: 0, b: 0 });
  const lastSyncTimeRef = useRef(Date.now());

  // keep local chess in sync with fen
  useEffect(() => {
    try {
      chessRef.current.load(fen);
    } catch {
      chessRef.current.reset();
    }
  }, [fen]);

  // UI clock tick interpolation
  useEffect(() => {
    const t = setInterval(() => {
      if (gameOver) return; // stop clock if game over
      const now = Date.now();
      const elapsed = now - lastSyncTimeRef.current;
      const whiteRemaining = serverTimeRef.current.w - (turn === 'w' ? elapsed : 0);
      const blackRemaining = serverTimeRef.current.b - (turn === 'b' ? elapsed : 0);
      setDisplayTime({ w: Math.max(0, whiteRemaining), b: Math.max(0, blackRemaining) });
    }, 500);
    return () => clearInterval(t);
  }, [turn]);

  // initial load (from location.state or fetch)
  useEffect(() => {
    if (!user) return;

    const setupGame = (raw) => {
      const normalized = normalizeGameData(raw);
      setGameData(normalized);
      setFen(normalized.fen || chessRef.current.fen());
      setTurn(normalized.turn || 'w');

      const me = normalized.players.find(p => String(p.user._id) === String(user._id) || String(p.userId) === String(user._id));
      if (me) setPlayerColor(me.color);

      serverTimeRef.current = normalized.initialTimes || { w: 0, b: 0 };
      lastSyncTimeRef.current = Date.now();
      setDisplayTime(serverTimeRef.current);

      // load persisted moves if present
      setMoveHistory(normalized.moves || []);
      setReplayIndex((normalized.moves || []).length);

      setIsLoading(false);
    };

    // Check location.state directly, NOT the gameData state variable
    console.log("Fetching authoritative game data from API...");
    axiosInstance.get(`/games/${gameId}`)
      .then(res => {
        console.log("Authoritative data with moves received:", res.data);
        // This setupGame call will have res.data.moves
        // This is the call that will correctly populate the move history
        setupGame(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch authoritative game data', err);
        // Only set loading false on error if we didn't have location.state
        if (!location.state?.gameData) {
          setIsLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, user]); // Dependencies are now correct

  // socket listeners
  // NEW HOOK: Handles connection and joining/leaving the room
  useEffect(() => {
    if (!gameId) return;

    if (!socket.connected && !socket.active) {
      socket.connect();
    }

    // Join the room
    socket.emit('joinGameRoom', gameId);

    // Return a cleanup function to leave the room
    return () => {
      socket.emit('leaveGameRoom', gameId);
    };
  }, [gameId]); // This hook ONLY runs when gameId changes

  // MODIFIED HOOK: Handles setting up event listeners
  useEffect(() => {
    // We no longer connect or join the room here.
    // We just attach listeners.
    if (!gameId) return;

    const handleGameUpdate = (data) => {
      // console.log('gameUpdate (client):', data);
      const atLive = replayIndex === moveHistory.length;

      if (data.newFen) {
        if (atLive) setFen(data.newFen); // only auto-update board if user is viewing live
      }
      if (data.turn) setTurn(data.turn);
      if (data.newTimes) {
        serverTimeRef.current = data.newTimes;
        lastSyncTimeRef.current = Date.now();
        setDisplayTime(data.newTimes);
      }

      // if server sent players (reconnect), merge
      if (data.players) {
        setGameData(prev => {
          const merged = { ...(prev || {}), players: data.players, timeControl: data.timeControl || prev?.timeControl };
          const me = merged.players.find(p => String(p.user?._id) === String(user?._id) || String(p.userId) === String(user?._id));
          if (me) setPlayerColor(me.color);
          return merged;
        });
      }

      // append lastMove to history (server is authoritative)
      if (data.lastMove) {
        setMoveHistory(prev => {
          // prevent duplicates: check last element
          const last = prev[prev.length - 1];
          if (last && last.from === data.lastMove.from && last.to === data.lastMove.to && last.san === data.lastMove.san) {
            // duplicate — just update times/fen handled above
            return prev;
          }
          const next = [...prev, data.lastMove];
          // if user is viewing live, advance replay index
          if (replayIndex === prev.length) { // Check against PREV length
            setReplayIndex(next.length);
            if (data.newFen) setFen(data.newFen);
          }
          return next;
        });
      }
    };

    const handleTimeUpdate = (data) => {
      console.log('timeUpdate (client):', data);
      if (data.white !== undefined && data.black !== undefined) {
        serverTimeRef.current = { w: data.white, b: data.black };
        lastSyncTimeRef.current = Date.now();
        setDisplayTime(serverTimeRef.current);
      }
    };

    const handleGameOver = (data) => {
      console.log("gameOver (client) received:", data);
      setGameOverData(data); // store winner + reason
      setGameOver(true);
    };

    const handleDrawOffer = ({ from }) => {
      if (window.confirm(`${from} offered a draw. Accept?`)) {
        socket.emit('acceptDraw', { gameId });
      }
    };

    // Attach listeners
    socket.on('gameUpdate', handleGameUpdate);
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('gameOver', handleGameOver);
    socket.on('drawOffered', handleDrawOffer);

    // Return a cleanup function to remove listeners
    return () => {
      socket.off('gameUpdate', handleGameUpdate);
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('gameOver', handleGameOver);
      socket.off('drawOffered', handleDrawOffer);
    };

  }, [gameId, moveHistory.length, replayIndex, user]); // These dependencies are now safe

  /* ---------- helpers for interaction ---------- */

  // parse piece string like "wP" -> { color: 'w', type: 'p' }
  const parsePieceString = (pieceStr) => {
    if (!pieceStr || typeof pieceStr !== 'string') return null;
    return { color: pieceStr[0], type: pieceStr[1].toLowerCase() };
  };

  // apply a promotion / move sequence to build a fen for replay
  const buildFenFromHistory = (count) => {
    const temp = new Chess();
    for (let i = 0; i < Math.min(count, moveHistory.length); i++) {
      const mv = moveHistory[i];
      temp.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
    }
    return temp.fen();
  };

  const jumpToIndex = (idx) => {
    const clamped = Math.max(0, Math.min(idx, moveHistory.length));
    setReplayIndex(clamped);
    if (clamped === moveHistory.length) {
      // live
      // keep current fen (should already be latest), but ensure we reflect server if known
      // do nothing here (gameUpdate will push fen)
      return;
    } else {
      const f = buildFenFromHistory(clamped);
      setFen(f);
    }
  };



  // move handlers for react-chessboard v4 (source, target, piece)
  // client/src/pages/GamePage.jsx

  const onPieceDrop = useCallback((sourceSquare, targetSquare, pieceStr) => {
    if (gameOver) return false;
    if (!playerColor) return false;
    if (chessRef.current.turn() !== playerColor) return false;

    // detect promotion by source piece + target rank
    const srcPiece = chessRef.current.get(sourceSquare); // {type:'p', color:'w'|'b'} or null
    if (srcPiece && srcPiece.type === 'p') {
      const targetRank = targetSquare[1];
      const willPromote =
        (srcPiece.color === 'w' && targetRank === '8') ||
        (srcPiece.color === 'b' && targetRank === '1');

      if (willPromote) {
        // open our modal; DO NOT move yet
        setPromotionMove({
          from: sourceSquare,
          to: targetSquare,
          color: srcPiece.color,
          fenBefore: chessRef.current.fen(),
        });
        return false; // keep board as-is until user picks a piece
      }
    }

    // normal move path
    const temp = new Chess(chessRef.current.fen());
    const result = temp.move({ from: sourceSquare, to: targetSquare });
    if (!result) return false;

    if (replayIndex === moveHistory.length) {
      setFen(temp.fen());
    }

    socket.emit('move', { gameId, move: { from: sourceSquare, to: targetSquare } });
    return true;
  }, [gameOver, playerColor, replayIndex, moveHistory.length, gameId]);





  const onDropFallback = useCallback((from, to, piece) => onPieceDrop(from, to, piece), [onPieceDrop]);



  const lastClickedSquare = useRef(null);

  const onSquareClick = useCallback((square) => {
    if (!lastClickedSquare.current) {
      const piece = chessRef.current.get(square);
      if (!piece) return;
      if (!playerColor || piece.color !== playerColor) return;
      lastClickedSquare.current = square;
      return;
    }

    const from = lastClickedSquare.current;
    const to = square;
    lastClickedSquare.current = null;

    const srcPiece = chessRef.current.get(from);
    if (srcPiece && srcPiece.type === 'p') {
      const targetRank = to[1];
      const willPromote =
        (srcPiece.color === 'w' && targetRank === '8') ||
        (srcPiece.color === 'b' && targetRank === '1');

      if (willPromote) {
        setPromotionMove({
          from,
          to,
          color: srcPiece.color,
          fenBefore: chessRef.current.fen(),
        });
        return; // wait for modal selection
      }
    }

    // normal move
    const temp = new Chess(chessRef.current.fen());
    const result = temp.move({ from, to });
    if (!result) return;

    if (replayIndex === moveHistory.length) {
      setFen(temp.fen());
    }

    socket.emit('move', { gameId, move: { from, to } });
  }, [playerColor, replayIndex, moveHistory.length, gameId]);





  // This is called by react-chessboard AFTER the user
  // clicks a piece in the built-in dialog.
  const handlePromotion = useCallback((pieceChar) => {
    // pieceChar is one of: 'q','r','b','n'
    if (!promotionMove) return;

    try {
      // restore the exact pre-move state
      const temp = new Chess(promotionMove.fenBefore);

      const moveData = {
        from: promotionMove.from,
        to: promotionMove.to,
        promotion: pieceChar, // 'q' | 'r' | 'b' | 'n'
      };

      const result = temp.move(moveData);
      if (!result) {
        console.warn('Invalid promotion move:', moveData);
        setPromotionMove(null);
        return;
      }

      // sync local board
      chessRef.current.load(temp.fen());
      if (replayIndex === moveHistory.length) {
        setFen(temp.fen());
      }

      // emit to server
      socket.emit('move', { gameId, move: moveData });

    } finally {
      setPromotionMove(null); // close modal
    }
  }, [promotionMove, replayIndex, moveHistory.length, gameId]);






  // captured pieces and material diff
  const capturedInfo = useMemo(() => {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const captured = { w: [], b: [] }; // pieces captured of each color
    let material = { white: 0, black: 0 };

    for (const mv of moveHistory) {
      if (mv.captured) {
        const capturedColor = mv.color === 'w' ? 'b' : 'w'; // captured piece belonged to opposite color of mover
        captured[capturedColor].push(mv.captured);
        const pts = values[mv.captured] || 0;
        if (mv.color === 'w') material.white += pts;
        else material.black += pts;
      }
    }

    const diff = material.white - material.black; // positive => white ahead
    return { captured, material, diff };
  }, [moveHistory]);

  /* ---------------- render guards ---------------- */
  if (isLoading) return <Loader message="Loading Game..." />;
  if (!gameData) return <Loader message="Waiting for game data..." />;
  if (!gameData.players || gameData.players.length < 2) return <Loader message="Waiting for player data..." />;

  const me = gameData.players.find(p => String(p.user._id) === String(user._id) || String(p.userId) === String(user._id));
  const opponent = gameData.players.find(p => !(String(p.user._id) === String(user._id) || String(p.userId) === String(user._id)));
  if (!me || !opponent) return <Loader message="Processing player data..." />;

  const boardOrientation = playerColor === 'b' ? 'black' : 'white';
  const bottomClock = playerColor === 'w' ? displayTime.w : displayTime.b;
  const topClock = playerColor === 'w' ? displayTime.b : displayTime.w;

  const whitePlayer = (playerColor === 'w') ? me.user : opponent.user;
  const blackPlayer = (playerColor === 'b') ? me.user : opponent.user;

  return (
    <div className="w-screen h-screen bg-gray-800 text-white flex flex-col">
      {promotionMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">

          <div className="bg-[#222] p-3 rounded-lg shadow-xl border border-gray-600 flex space-x-2">

            {['q', 'r', 'b', 'n'].map(p => {
              // pick correct unicode symbol per piece + color
              const symbols = {
                w: { q: "♕", r: "♖", b: "♗", n: "♘" },
                b: { q: "♛", r: "♜", b: "♝", n: "♞" }
              };

              const icon = symbols[promotionMove.color][p];

              return (
                <button
                  key={p}
                  onClick={() => handlePromotion(p)}
                  className="
              w-16 h-16 
              flex items-center justify-center 
              bg-[#333] 
              hover:bg-[#444]
              border border-gray-500 
              rounded-md 
              text-4xl
              text-white
              transition
              shadow-lg
            "
                >
                  {icon}
                </button>
              );
            })}

          </div>
        </div>
      )}

      <nav className="bg-gray-900 w-full p-2 flex items-center justify-between shadow-md flex-shrink-0">
        <Link to="/" className="text-xl font-bold">← Dashboard</Link>
        <div className="text-center">
          <h2 className="font-semibold">{gameData.timeControl} • {/* category optionally */}</h2>
        </div>
        <div />
      </nav>

      <div className="flex-1 w-full flex flex-col md:flex-row p-2 gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col justify-center items-center h-full min-h-0">
          <div className="w-full flex items-center">
            <PlayerInfo player={blackPlayer} />
            <Clock timeInMillis={topClock} />
          </div>

          <div className="w-full max-w-[calc(100vh-150px)] aspect-square my-2">
            <Chessboard
              id="MainChessboard"
              position={fen}
              boardOrientation={boardOrientation}
              onPieceDrop={onPieceDrop}
              onSquareClick={onSquareClick}
              onPromotionDialogOpen={() => { }}
              showPromotionDialog={(false)} // we handle promotion ourselves
              customPromotionDialog={null}
              arePiecesDraggable={playerColor === turn && replayIndex === moveHistory.length && !promotionMove}
              customBoardStyle={{ borderRadius: '4px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}
              customDarkSquareStyle={{ backgroundColor: '#779952' }}
              customLightSquareStyle={{ backgroundColor: '#edeed1' }}
            />
          </div>

          <div className="w-full flex items-center">
            <PlayerInfo player={whitePlayer} />
            <Clock timeInMillis={bottomClock} />
          </div>
        </div>

        <div className="w-full md:w-96 bg-gray-700 p-2 rounded-lg flex flex-col space-y-2">
          <div className="flex-1 overflow-hidden">
            <MoveHistoryPanel history={moveHistory} index={replayIndex} onJump={jumpToIndex} />
          </div>

          <div className="bg-gray-800 p-2 rounded">
            <div className="flex justify-between">
              <div>
                <div className="text-sm text-gray-300">Captured</div>
                <div className="text-xs text-gray-200">
                  You captured: {playerColor === 'w' ? (capturedInfo.captured.b.join(', ') || '—') : (capturedInfo.captured.w.join(', ') || '—')}
                </div>
                <div className="text-xs text-gray-200">
                  Opp captured: {playerColor === 'w' ? (capturedInfo.captured.w.join(', ') || '—') : (capturedInfo.captured.b.join(', ') || '—')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-300">Material</div>
                <div className="text-lg font-bold">
                  {(() => {
                    const diff = capturedInfo.diff;
                    const val = playerColor === 'w' ? diff : -diff;
                    if (val > 0) return `+${val}`;
                    if (val < 0) return `${val}`;
                    return '0';
                  })()}
                </div>
              </div>
            </div>

            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to resign?")) {
                    socket.emit("resign", { gameId });
                  }
                }}
                className="w-full bg-red-600 p-2 rounded hover:bg-red-500"
              >
                Resign
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Offer a draw?")) {
                    socket.emit("offerDraw", { gameId });
                  }
                }}
                className="w-full bg-yellow-600 p-2 rounded hover:bg-yellow-500"
              >
                Draw
              </button>
            </div>
          </div>
        </div>
      </div>
      {gameOverData && (
        <GameOverModal
          winner={gameOverData.winner}
          reason={gameOverData.reason}
          players={gameOverData.players}
          onReplay={() => {
            setGameOverData(null);
            navigate(`/replay/${gameData._id || gameId}`);
          }}
        />
      )}

    </div>
  );
};

export default GamePage;