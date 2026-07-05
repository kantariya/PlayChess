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

    // Ensure the global socket is connected once.
    try {
      if (socket && !socket.connected && !socket.active) {
        socket.connect();
      }
    } catch (err) {
      console.warn('Socket connect check failed:', err);
      if (!socket.connected && !socket.active) {
        socket.connect();
      }
    }

    socket.on('matchFound', onMatchFound);

    const onConnectError = (error) => {
      console.error('Frontend socket connect_error:', error.message);
    };
    socket.on('connect_error', onConnectError);

    // cleanup: remove listener but DO NOT disconnect the global socket,
    // so navigation between pages won't drop the connection.
    return () => {
      socket.off('matchFound', onMatchFound);
      socket.off('connect_error', onConnectError);
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
