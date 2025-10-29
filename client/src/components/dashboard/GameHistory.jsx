import React, { useState } from 'react';
import { FaBolt, FaRocket, FaClock, FaPlus, FaMinus, FaEquals } from 'react-icons/fa';
import GameReplay from '../../pages/GameReplay.jsx';
import { useNavigate } from 'react-router-dom'; 

const Flag = ({ code }) => <span className="ml-2">{code}</span>;

const ResultIcon = ({ winner, playerColor }) => {
  if (winner === 'draw') {
    return <FaEquals size={12} className="text-gray-400" />;
  }
  // This logic is also updated to use the first letter
  if (winner.startsWith(playerColor)) {
    return <FaPlus size={12} className="text-green-400" />;
  }
  return <FaMinus size={12} className="text-red-400" />;
};

const getRatingCategory = (timeControl) => {
  const [minutes] = timeControl.split('+').map(Number);
  if (minutes < 3) return 'bullet';
  if (minutes < 10) return 'blitz';
  return 'rapid';
};

const GameHistory = ({ games, currentUser }) => {

    const navigate = useNavigate(); 
  const [selectedGame, setSelectedGame] = useState(null);

  if (!currentUser) {
    return null;
  }

  const getGameIcon = (category) => {
    if (category === 'blitz') return <FaBolt className="text-yellow-400" />;
    if (category === 'bullet') return <FaRocket className="text-orange-400" />;
    if (category === 'rapid') return <FaClock className="text-green-400" />;
    return null;
  };

  const handleGameClick = (gameId) => {
    navigate(`/replay/${gameId}`); // Navigate to the new replay URL
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4 text-white">Game History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-gray-400 uppercase text-sm">
            <tr>
              <th className="p-2">Players</th>
              <th className="p-2 text-center">Result</th>
              <th className="p-2">Moves</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            {games.map(game => {
              const playerInfo = game.players.find(p => p.user?._id === currentUser._id);
              const opponentInfo = game.players.find(p => p.user?._id !== currentUser._id);

              if (!playerInfo || !opponentInfo) return null;

              // --- THIS IS THE CORRECTED LOGIC ---
              // Old line: const isWin = (game.winner === playerInfo.color);
              const isWin = game.winner.startsWith(playerInfo.color);

              const resultText = game.winner === 'draw' ? '½ - ½' : (isWin ? '1 - 0' : '0 - 1');
              const ratingCategory = getRatingCategory(game.timeControl);
              const playerRating = playerInfo.rating;

              return (
                <tr key={game._id} onClick={() => handleGameClick(game._id)} className="hover:bg-gray-600">
                  <td className="p-3">
                    <div className="flex items-center">
                      <div className="mr-2">{getGameIcon(ratingCategory)}</div>
                      <div>
                        <div className="flex items-center font-semibold text-white">
                          {currentUser.username} ({playerRating}) <Flag code={currentUser.country} />
                        </div>
                        <div className="flex items-center text-gray-300">
                          {opponentInfo.user.username} ({opponentInfo.rating}) <Flag code={opponentInfo.user.country} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="font-bold text-lg text-gray-300">{resultText}</span>
                      <ResultIcon winner={game.winner} playerColor={playerInfo.color} />
                    </div>
                  </td>
                  <td className="p-3 text-gray-300">{Math.ceil(game.pgn.split(' ').length / 2)}</td>
                  <td className="p-3 text-gray-400">{new Date(game.createdAt).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameHistory;