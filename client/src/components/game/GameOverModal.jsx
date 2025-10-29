import React from "react";
import { FaTrophy, FaFlag, FaHandshake } from "react-icons/fa";

const GameOverModal = ({ winner, reason, players, onReplay }) => {
  console.log('winner:', winner);
  const winnerPlayer =
    winner === "draw" ? null : winner === "white" ? players.white : players.black;
  const loserPlayer =
    winner === "draw" ? null : winner === "white" ? players.black : players.white;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-xl shadow-xl w-[90%] max-w-lg p-6 relative">
        <h2 className="text-2xl font-bold text-center mb-4">Game Over</h2>

        {winner === "draw" ? (
          <div className="flex flex-col items-center space-y-3">
            <FaHandshake className="text-yellow-400" size={40} />
            <p className="text-lg font-semibold">Draw</p>
            <p className="text-gray-300">Reason: {reason}</p>
            <div className="flex justify-between w-full mt-2 px-4">
              <div className="text-center">
                <p className="text-sm">{players.white.username}</p>
                <p className="text-sm text-gray-300">
                  {players.white.oldRating} → {players.white.newRating}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm">{players.black.username}</p>
                <p className="text-sm text-gray-300">
                  {players.black.oldRating} → {players.black.newRating}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            {/* Winner Card */}
            <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
              <div>
                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                  <FaTrophy /> {winnerPlayer.username}
                </h3>
                <p className="text-sm text-gray-300">
                  Rating: {winnerPlayer.oldRating} → {winnerPlayer.newRating}
                </p>
                <p className="text-sm text-gray-400">
                  Color: {winner === "white" ? "White" : "Black"}
                </p>
              </div>
            </div>

            {/* Loser Card */}
            <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
              <div>
                <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                  <FaFlag /> {loserPlayer.username}
                </h3>
                <p className="text-sm text-gray-300">
                  Rating: {loserPlayer.oldRating} → {loserPlayer.newRating}
                </p>
                <p className="text-sm text-gray-400">
                  Color: {winner === "white" ? "Black" : "White"}
                </p>
              </div>
            </div>

            {/* Reason */}
            <p className="text-center text-gray-400">Game ended by: {reason}</p>
          </div>
        )}

        {/* Button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={onReplay}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg transition"
          >
            View Replay
          </button>
        </div>
      </div>
    </div>
  );
};


export default GameOverModal;
