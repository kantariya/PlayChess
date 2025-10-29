import React from 'react';

const RatingCard = ({ title, rating, icon }) => {
  return (
    <div className="bg-gray-700 rounded-lg p-4 flex flex-col justify-between hover:bg-gray-600 transition-colors duration-200 cursor-pointer">
      <div className="flex items-center justify-between text-gray-400 mb-2">
        <span className="text-lg">{title}</span>
        {icon && React.cloneElement(icon, { size: 24 })}
      </div>
      <div>
        <div className="flex items-baseline space-x-2 mb-2">
          <span className="text-3xl font-bold text-white">{rating}</span>
        </div>
        {/* Placeholder for the small graph */}
        <div className="h-10 w-full bg-gray-600 rounded-sm">
          {/* A real graph would go here */}
        </div>
      </div>
    </div>
  );
};

export default RatingCard;