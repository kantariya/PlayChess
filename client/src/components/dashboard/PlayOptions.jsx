import React, { useState } from 'react';
import { socket } from '../../socket'; // Assuming your shared socket instance is here
import CustomGameModal from './CustomGameModal'; // Import the modal component

// This sub-component helps keep the button grid clean
const TimeControlButton = ({ time, type, onClick }) => (
  <button 
    onClick={() => onClick(time)}
    // flex and items-center ensure vertical centering if one line is shorter
    className="bg-gray-700 hover:bg-gray-600 rounded-md p-3 text-center transition-colors duration-200 flex flex-col justify-center items-center min-h-[76px]"
  >
    <span className="text-xl font-semibold text-white">{time}</span>
    <span className="block text-sm text-gray-400">{type}</span>
  </button>
);

const PlayOptions = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePlayClick = (timeControl) => {
    setIsSearching(true);
    socket.connect(); // Ensure the socket is connected before emitting
    socket.emit('joinPool', { timeControl });
    console.log('timeControl selected:', timeControl);
  };

  // This UI is shown when the user is waiting for a match
  if (isSearching) {
    return (
      <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col items-center justify-center h-full min-h-[260px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
        <p className="text-white font-semibold">Searching for opponent...</p>
        <button 
          onClick={() => {
            socket.emit('leavePool'); // You will need to implement this on the backend
            setIsSearching(false);
          }} 
          className="mt-4 text-sm text-gray-400 hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  // The main component view
  return (
    <>
      <CustomGameModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlay={handlePlayClick}
      />
      <div className="bg-gray-900/50 p-4 rounded-lg">
        <div className="grid grid-cols-3 gap-2">
          <TimeControlButton time="1+0" type="Bullet" onClick={handlePlayClick} />
          <TimeControlButton time="2+1" type="Bullet" onClick={handlePlayClick} />
          <TimeControlButton time="3+0" type="Blitz" onClick={handlePlayClick} />
          <TimeControlButton time="3+2" type="Blitz" onClick={handlePlayClick} />
          <TimeControlButton time="5+0" type="Blitz" onClick={handlePlayClick} />
          <TimeControlButton time="5+3" type="Blitz" onClick={handlePlayClick} />
          <TimeControlButton time="10+0" type="Rapid" onClick={handlePlayClick} />
          <TimeControlButton time="15+10" type="Rapid" onClick={handlePlayClick} />
          
          {/* Custom button opens the modal */}
          <button 
            onClick={() => setIsModalOpen(true)}
            // Here we use flexbox utilities for alignment instead of &nbsp;
            className="bg-gray-700 hover:bg-gray-600 rounded-md p-3 text-center transition-colors duration-200 flex flex-col justify-center items-center min-h-[76px]"
          >
            <span className="text-xl font-semibold text-white">Custom</span>
          </button>
        </div>
        {/* <div className="mt-4 flex flex-col space-y-2">
          <button className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 rounded-md">Create a Game</button>
          <button className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 rounded-md">Play with a Friend</button>
        </div> */}
      </div>
    </>
  );
};

export default PlayOptions;