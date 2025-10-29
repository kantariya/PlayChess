// client-side: MainLayout.jsx
import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { socket } from '../socket'; // shared socket instance

const MainLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // handler for when server finds a match
    const onMatchFound = (data) => {
      console.log('Match found! Navigating to game:', data.gameId);
      navigate(`/game/${data.gameId}`, { state: { gameData: data } });
    };

    // Ensure the global socket is connected once, and supply token if available
    try {
      // If using socket.io-client v4, set auth before connect:
      if (socket && !socket.connected) {
        // try to attach token from localStorage (adjust if you store elsewhere)
        const token = localStorage.getItem('token');
        if (token) {
          // set auth for initial handshake
          socket.auth = { token };
        }
        socket.connect();
      }
    } catch (err) {
      console.warn('Socket connect check failed:', err);
      socket.connect();
    }

    socket.on('matchFound', onMatchFound);

    // cleanup: remove listener but DO NOT disconnect the global socket,
    // so navigation between pages won't drop the connection.
    return () => {
      socket.off('matchFound', onMatchFound);
    };
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-gray-200">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
