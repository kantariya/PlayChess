import React, { useState, useEffect } from 'react';
import { socket } from '../../socket';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaGamepad, FaTimes } from 'react-icons/fa';

const Lobby = ({ currentUser }) => {
    const navigate = useNavigate();
    const [isInLobby, setIsInLobby] = useState(false);
    const [players, setPlayers] = useState([]);
    const [incomingChallenge, setIncomingChallenge] = useState(null);
    const [outgoingChallenge, setOutgoingChallenge] = useState(null); 
    const [selectedFormat, setSelectedFormat] = useState('5+0');

    const timeControls = [
        { label: 'Bullet 1+0', value: '1+0' },
        { label: 'Blitz 3+0', value: '3+0' },
        { label: 'Blitz 5+0', value: '5+0' },
        { label: 'Rapid 10+0', value: '10+0' }
    ];

    useEffect(() => {
        // Listeners
        socket.on('lobbyUpdate', (updatedPlayers) => {
            // Filter out self from the list
            setPlayers(updatedPlayers.filter(p => p.userId !== currentUser._id));
        });

        socket.on('challengeReceived', (challenge) => {
            setIncomingChallenge(challenge);
        });

        socket.on('challengeDeclined', ({ by }) => {
            setOutgoingChallenge(null);
            alert(`${by} declined your challenge.`);
        });

        socket.on('matchFound', ({ gameId }) => {
            navigate(`/game/${gameId}`, { state: { gameData: null } }); 
        });

        return () => {
            socket.off('lobbyUpdate');
            socket.off('challengeReceived');
            socket.off('challengeDeclined');
            socket.off('matchFound');
            if (isInLobby) {
                socket.emit('leaveLobby');
            }
        };
    }, [currentUser._id, isInLobby, navigate]);

    const toggleLobby = () => {
        if (isInLobby) {
            socket.emit('leaveLobby');
            setIsInLobby(false);
            setPlayers([]);
        } else {
            socket.emit('joinLobby');
            setIsInLobby(true);
        }
    };

    const sendChallenge = (targetSocketId) => {
        setOutgoingChallenge(targetSocketId);
        socket.emit('sendChallenge', { targetSocketId, timeControl: selectedFormat });
    };

    const acceptChallenge = () => {
        if (!incomingChallenge) return;
        socket.emit('acceptChallenge', {
            challengerSocketId: incomingChallenge.from.socketId,
            timeControl: incomingChallenge.timeControl
        });
        setIncomingChallenge(null);
    };

    const declineChallenge = () => {
        if (!incomingChallenge) return;
        socket.emit('declineChallenge', { challengerSocketId: incomingChallenge.from.socketId });
        setIncomingChallenge(null);
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FaGamepad className="text-blue-400" /> Challenge Lobby
                </h2>
                <button
                    onClick={toggleLobby}
                    className={`px-4 py-2 rounded font-bold transition ${isInLobby
                            ? 'bg-red-600 hover:bg-red-500'
                            : 'bg-green-600 hover:bg-green-500'
                        }`}
                >
                    {isInLobby ? 'Leave Lobby' : 'Enter Lobby'}
                </button>
            </div>

            
            {incomingChallenge && (
                <div className="mb-4 p-3 bg-blue-900 border border-blue-500 rounded-md animate-pulse">
                    <p className="text-white font-bold mb-2">
                        ⚔️ {incomingChallenge.from.username} ({incomingChallenge.from.rating}) challenges you!
                    </p>
                    <p className="text-sm text-gray-300 mb-3">Format: {incomingChallenge.timeControl}</p>
                    <div className="flex gap-2">
                        <button onClick={acceptChallenge} className="flex-1 bg-green-600 hover:bg-green-500 py-1 rounded font-bold">Accept</button>
                        <button onClick={declineChallenge} className="flex-1 bg-red-600 hover:bg-red-500 py-1 rounded font-bold">Decline</button>
                    </div>
                </div>
            )}

            <div className="mb-2 px-2">
                <label className="text-xs text-gray-400 uppercase font-bold">Select Format:</label>
                <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="w-full mt-1 bg-gray-700 text-white text-sm rounded p-2 border border-gray-600 focus:border-blue-500 outline-none"
                >
                    {timeControls.map(tc => (
                        <option key={tc.value} value={tc.value}>{tc.label}</option>
                    ))}
                </select>
            </div>

            
            <div className="flex-1 overflow-y-auto bg-gray-900 rounded p-2">
                {!isInLobby ? (
                    <div className="text-gray-500 text-center mt-4">
                        Click "Enter Lobby" to see players.
                    </div>
                ) : players.length === 0 ? (
                    <div className="text-gray-400 text-center mt-4">
                        No other players in lobby...<br />Waiting for others to join.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {players.map((player) => (
                            <li key={player.socketId} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                                        <FaUser />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{player.username}</div>
                                        <div className="text-xs text-gray-400">Rating: {player.rating} | {player.country}</div>
                                    </div>
                                </div>
                                {outgoingChallenge === player.socketId ? (
                                    <span className="text-yellow-400 text-xs font-bold animate-pulse">Sent...</span>
                                ) : (
                                    <button
                                        onClick={() => sendChallenge(player.socketId)}
                                        disabled={!!outgoingChallenge}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs px-3 py-1 rounded font-bold"
                                    >
                                        Challenge
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Lobby;