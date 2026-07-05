import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { getData } from 'country-list'; // <-- 1. IMPORT FROM 'country-list'
import Loader from '../components/Loader';
import RatingCard from '../components/dashboard/RatingCard';
import { FaBolt, FaRocket, FaClock, FaSun } from 'react-icons/fa';
import GameHistory from '../components/dashboard/GameHistory';



// Helper component for a single profile field
const ProfileField = ({ label, value, isEditing, children }) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
    <dt className="text-sm font-medium text-gray-300">{label}</dt>
    <dd className="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
      {isEditing ? children : (value || <span className="text-gray-400">Not set</span>)}
    </dd>
  </div>
);

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', country: '' });

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [gameHistory, setGameHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- 2. USE getData() FROM THE PACKAGE ---
  // Get the list of countries *once*
  const countries = useMemo(() => getData(), []);

  // Create a map for fast country name lookups (e.g., "IN" -> "India")
  const countryMap = useMemo(() =>
    new Map(countries.map(country => [country.code, country.name]))
    , [countries]); // Use 'countries' as dependency

  // Fetch the full user profile on component mount
  useEffect(() => {
    if (!user?._id) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    axiosInstance.get(`/users/profile`)
      .then(res => {
        setUserData(res.data);
        setFormData({
          name: res.data.name || '',
          country: res.data.country || '',
        });
      })
      .catch(err => {
        console.error("Failed to fetch user data", err);
        setError("Could not load your profile. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user?._id, navigate]);

  useEffect(() => {
    if (!user?._id) {
      return; // Don't fetch if no user
    }

    setHistoryError(null);
    axiosInstance.get('/games/history/all')
      .then(res => {
        setGameHistory(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch game history", err);
        setHistoryError("Could not load game history.");
      });

  }, [user?._id]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel
      setIsEditing(false);
      setError(null);
      setSuccess(null);
      setFormData({
        name: userData.name || '',
        country: userData.country || '',
      });
    } else {
      // Edit
      setIsEditing(true);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    axiosInstance.put(`/users/${user._id}`, formData)
      .then(res => {
        setUserData(res.data);
        setIsEditing(false);
        setSuccess("Profile updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
      })
      .catch(err => {
        console.error("Failed to update profile", err);
        const errMsg = err.response?.data?.message || "An error occurred. Please try again.";
        setError(errMsg);
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  if (isLoading) {
    return <Loader message="Loading Profile..." />;
  }

  return (
    <div className="w-screen min-h-screen bg-gray-800 text-white">

      {/* Profile Content */}
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        {!userData ? (
          <div className="text-center text-gray-400">{error || "No user data found."}</div>
        ) : (
          <div className="bg-gray-700 shadow-xl rounded-lg overflow-hidden">

            {/* Header with Username and Edit Button */}
            <div className="px-6 py-5 border-b border-gray-600 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">{userData.username}</h2>
                <p className="text-sm text-gray-400">{userData.email}</p>
              </div>
              <button
                onClick={handleEditToggle}
                className={`px-4 py-2 rounded-md font-semibold ${isEditing
                  ? "bg-gray-600 hover:bg-gray-500"
                  : "bg-blue-600 hover:bg-blue-500"
                  } transition-colors`}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            {/* Ratings Grid */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Ratings</h3>
              <div className="lg:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <RatingCard title="Blitz" rating={userData.ratings?.blitz} icon={<FaBolt className="text-yellow-400" />} />
                  <RatingCard title="Bullet" rating={userData.ratings?.bullet} icon={<FaRocket className="text-orange-400" />} />
                  <RatingCard title="Rapid" rating={userData.ratings?.rapid} icon={<FaClock className="text-green-400" />} />
                  <RatingCard title="Daily" rating={userData.ratings?.daily} icon={<FaSun className="text-teal-400" />} />
                </div>
              </div>
            </div>

            {/* User Details Form */}
            <form onSubmit={handleSubmit}>
              <div className="border-t border-gray-600 px-6 py-5">
                <dl className="divide-y divide-gray-600">
                  <ProfileField label="Username" value={userData.username} isEditing={false} />
                  <ProfileField label="Email" value={userData.email} isEditing={false} />

                  <ProfileField
                    label="Name"
                    value={userData.name}
                    isEditing={isEditing}
                  >
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full max-w-lg bg-gray-800 border border-gray-600 rounded-md shadow-sm px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </ProfileField>

                  <ProfileField
                    label="Country"
                    value={countryMap.get(userData.country) || userData.country}
                    isEditing={isEditing}
                  >
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full max-w-lg bg-gray-800 border border-gray-600 rounded-md shadow-sm px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a country</option>
                      {/* --- 3. MAP OVER THE 'countries' VARIABLE --- */}
                      {countries.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </ProfileField>

                  <ProfileField label="Member Since" value={new Date(userData.createdAt).toLocaleDateString()} isEditing={false} />
                </dl>
              </div>

              {/* Form Actions */}
              {isEditing && (
                <div className="px-6 py-4 bg-gray-750 border-t border-gray-600 flex flex-col items-center">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full max-w-xs bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>

                  {/* Feedback Messages */}
                  {error && (
                    <div className="mt-3 text-sm text-red-400">{error}</div>
                  )}
                  {success && (
                    <div className="mt-3 text-sm text-green-400">{success}</div>
                  )}
                </div>
              )}
            </form>

            {/* --- 4. RENDER GAME HISTORY --- */}
            <div className="border-t border-gray-600">
              {/* Note: GameHistory already has its own padding, so we don't add p-6 here */}
              {historyError ? (
                <div className="p-6 text-center text-red-400">{historyError}</div>
              ) : (
                <GameHistory games={gameHistory} currentUser={user} />
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;