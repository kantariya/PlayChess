import React, { useState } from 'react';

const CustomGameModal = ({ isOpen, onClose, onPlay }) => {
  const [minutes, setMinutes] = useState(15);
  const [increment, setIncrement] = useState(10);

  if (!isOpen) return null;

  const handlePlayClick = () => {
    // Sanitize and cap initial inputs
    let finalMinutes = Math.max(1, Math.min(minutes, 1440));
    let finalIncrement = Math.max(0, Math.min(increment, 180));

    // Apply FIDE rules for Rapid and re-categorize if needed
    if (finalMinutes > 10 && finalMinutes < 60) {
      finalIncrement = Math.min(finalIncrement, 60);
    } else if (finalMinutes >= 60) {
      finalIncrement = Math.min(finalMinutes, 1440);
      finalIncrement = 0;
    }
    
    const timeControl = `${finalMinutes}+${finalIncrement}`;
    onPlay(timeControl);
    onClose();
  };

  const handleMinutesChange = (e) => {
    // --- FIX: Add fallback to 0 if input is empty ---
    setMinutes(parseInt(e.target.value) || 0);
  };

  const handleIncrementChange = (e) => {
    // --- FIX: Add fallback to 0 if input is empty ---
    setIncrement(parseInt(e.target.value) || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-700 p-8 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold text-white mb-6">Custom Game</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Minutes per side</label>
            <input 
              type="number" 
              value={minutes} 
              onChange={handleMinutesChange}
              className="w-full p-2 bg-gray-900 rounded-md"
              min="1"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Increment in seconds</label>
            <input
              type="number" 
              value={increment} 
              onChange={handleIncrementChange}
              className="w-full p-2 bg-gray-900 rounded-md"
              min="0"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
          <button onClick={handlePlayClick} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md">Play</button>
        </div>
      </div>
    </div>
  );
};

export default CustomGameModal;