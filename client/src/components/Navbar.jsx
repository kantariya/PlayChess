import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser } from 'react-icons/fa';
import { FaUserCircle } from 'react-icons/fa';

import { FaRegUserCircle } from 'react-icons/fa';

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
              <Link to={`/profile`} className="flex items-center space-x-2 hover:text-gray-300 transition duration-200">
                <span className="text-gray-300 flex gap-1">Welcome, <FaUserCircle size={25} color='skyblue' /> {user.username}!</span>
              </Link>
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