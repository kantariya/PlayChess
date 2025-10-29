import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Main Nav */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-white">PlayChess</Link>
          </div>
          
          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-gray-300">Welcome, {user.username}!</span>
            )}
            <button
              onClick={logout}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md text-sm transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;