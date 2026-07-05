// client/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

// Import Components
import RatingCard from '../components/dashboard/RatingCard';
import GameHistory from '../components/dashboard/GameHistory';
import PlayOptions from '../components/dashboard/PlayOptions';
import Loader from '../components/Loader';
import Lobby from '../components/dashboard/Lobby';

// Icons from react-icons
import { FaBolt, FaRocket, FaClock, FaSun } from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [profileRes, historyRes] = await Promise.all([
          axiosInstance.get('/users/profile'),
          axiosInstance.get('/games/history/recent') // Fetch recent games for dashboard
        ]);

        setProfileData(profileRes.data);
        setGameHistory(historyRes.data);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
      fetchData();
    } else {
      console.log("Dashboard useEffect: User does not exist yet, not fetching data.");
    }
  }, [user]);

  if (isLoading) {
    return <Loader message="Loading Dashboard..." />;
  }

  const ratings = profileData?.ratings || { blitz: 0, bullet: 0, rapid: 0, daily: 0 };

  return (
    <div className="container mx-auto p-4 md:p-8 text-gray-200">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

        {/* Left Column: Stats and Game History */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Ratings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RatingCard title="Blitz" rating={ratings.blitz} icon={<FaBolt className="text-yellow-400" />} />
            <RatingCard title="Bullet" rating={ratings.bullet} icon={<FaRocket className="text-orange-400" />} />
            <RatingCard title="Rapid" rating={ratings.rapid} icon={<FaClock className="text-green-400" />} />
            <RatingCard title="Daily" rating={ratings.daily} icon={<FaSun className="text-teal-400" />} />
          </div>

          {/* Play Options (Random Matchmaking) */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-4 text-gray-300">Quick Match</h2>
            <PlayOptions />
          </div>

          {/* Game History */}
          <div>
            <GameHistory games={gameHistory} currentUser={user} />
          </div>
        </div>

        {/* Right Column: Challenge Lobby  */}
        <div className="lg:col-span-1">
          {/* Pass user to lobby so it can filter 'self' out of the list */}
          <div className="sticky top-4 h-[600px]">
            <Lobby currentUser={user} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;