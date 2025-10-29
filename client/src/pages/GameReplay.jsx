import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axiosInstance from '../api/axiosInstance';
import Loader from '../components/Loader';
import { FaStepBackward, FaCaretLeft, FaCaretRight, FaStepForward, FaPlay, FaPause, FaArrowLeft } from 'react-icons/fa';

// --- Sub-components for a cleaner layout ---

const MoveHistoryPanel = ({ history, currentIndex, onJump }) => (
  <div className="bg-gray-900 h-full rounded-md p-2 flex-1 overflow-y-auto">
    <div className="grid grid-cols-3 gap-x-2 text-gray-300">
      {history.map((move, index) => {
        if (index % 2 === 0) {
          const moveNumber = index / 2 + 1;
          const whiteMove = history[index];
          const blackMove = history[index + 1];
          return (
            <React.Fragment key={index}>
              <div className="text-right text-gray-500 pr-2">{moveNumber}.</div>
              <div
                onClick={() => onJump(index + 1)}
                className={`p-1 rounded cursor-pointer ${currentIndex === index + 1 ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              >
                {whiteMove?.san}
              </div>
              {blackMove && (
                <div
                  onClick={() => onJump(index + 2)}
                  className={`p-1 rounded cursor-pointer ${currentIndex === index + 2 ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                >
                  {blackMove.san}
                </div>
              )}
            </React.Fragment>
          );
        }
        return null;
      })}
    </div>
  </div>
);

const GameReplay = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [gameData, setGameData] = useState(null);
  const [fen, setFen] = useState('start');
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const moveHistory = useMemo(() => {
    if (!gameData?.pgn) return [];
    try {
      const chess = new Chess();
      chess.loadPgn(gameData.pgn);
      return chess.history({ verbose: true });
    } catch (e) {
      console.error("Invalid PGN:", e);
      return [];
    }
  }, [gameData]);

  const jumpToMove = useCallback((index) => {
    const newIndex = Math.max(0, Math.min(index, moveHistory.length));
    const tempGame = new Chess();
    for (let i = 0; i < newIndex; i++) {
      tempGame.move(moveHistory[i]);
    }
    setFen(tempGame.fen());
    setCurrentIndex(newIndex);
  }, [moveHistory]);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await axiosInstance.get(`/games/${gameId}`);
        setGameData(response.data);
        console.log("Fetched game data:", response.data);
      } catch (error) {
        console.error("Failed to fetch game for replay", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGame();
  }, [gameId]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentIndex >= moveHistory.length) {
      setIsPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      jumpToMove(currentIndex + 1);
    }, 1500); // 1.5 seconds per move
    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, moveHistory.length, jumpToMove]);

  if (isLoading) return <Loader message="Loading Replay..." />;
  if (!gameData) return <div className="text-center p-8">Game not found.</div>;

  let resultText = '';
  if (gameData.winner === 'draw') {
    resultText = 'Game Drawn (½-½)';
  } else {
    // Find the player object whose color matches the winner string ('white' or 'black')
    const winningPlayer = gameData.players.find(p => p.color === gameData.winner.charAt(0));
    if (winningPlayer) {
      resultText = `${winningPlayer.user.username} won by ${gameData.endReason}`;
    }
  }

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Nav */}
      <nav className="w-full max-w-7xl mx-auto flex justify-between items-center p-3 border-b border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="text-lg font-bold flex items-center gap-2 hover:text-gray-300 transition"
        >
          <FaArrowLeft /> Back
        </button>
        <div className="text-center">
          <h2 className="font-semibold text-lg">
            {gameData.players[0].user.username} vs{" "}
            {gameData.players[1].user.username}
          </h2>
          <h3 className="font-bold text-xl text-yellow-400">{resultText}</h3>
        </div>
        <div className="w-28 text-right text-sm text-gray-400">
          {new Date(gameData.createdAt).toLocaleDateString()}
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-4 p-3 overflow-hidden">
        {/* Chessboard */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-[min(100%,calc(100vh-160px))] aspect-square">
              <Chessboard position={fen} arePiecesDraggable={false} />
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-full md:w-80 bg-gray-800 rounded-xl flex flex-col shadow-lg overflow-hidden">
          <h3 className="text-lg font-semibold text-center py-3 bg-gray-700 border-b border-gray-600">
            Move History
          </h3>

          {/* Scrollable Move History */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <MoveHistoryPanel
              history={moveHistory}
              currentIndex={currentIndex}
              onJump={jumpToMove}
            />
          </div>

          {/* Controls */}
          <div className="bg-gray-900 p-3 border-t border-gray-700 flex justify-center items-center gap-3">
            <button
              onClick={() => jumpToMove(0)}
              className="p-2 text-lg rounded-full hover:bg-gray-700 transition"
            >
              <FaStepBackward />
            </button>
            <button
              onClick={() => jumpToMove(currentIndex - 1)}
              className="p-2 text-lg rounded-full hover:bg-gray-700 transition"
            >
              <FaCaretLeft />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-3 text-xl bg-blue-600 hover:bg-blue-500 rounded-full shadow-md mx-1 transition"
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button
              onClick={() => jumpToMove(currentIndex + 1)}
              className="p-2 text-lg rounded-full hover:bg-gray-700 transition"
            >
              <FaCaretRight />
            </button>
            <button
              onClick={() => jumpToMove(moveHistory.length)}
              className="p-2 text-lg rounded-full hover:bg-gray-700 transition"
            >
              <FaStepForward />
            </button>
          </div>
        </div>
      </div>
    </div>

  );
};

export default GameReplay;