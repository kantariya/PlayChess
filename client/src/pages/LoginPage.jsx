// client/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

const LoginPage = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth(); // Get login function from context

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await login(formData);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4">
      <h1 className="text-4xl font-bold text-white mb-10 tracking-wider">PlayChess</h1>
      <div className="w-full max-w-md bg-gray-700 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-center text-white mb-6">Sign in</h2>
        <form onSubmit={handleSubmit}>
          {/* ... form inputs are the same ... */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-bold mb-2 uppercase" htmlFor="username">User name or email</label>
            <input className="w-full px-3 py-2 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" type="text" id="username" name="username" value={formData.username} onChange={handleChange} required disabled={isLoading} />
          </div>
          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-bold mb-2 uppercase" htmlFor="password">Password</label>
            <input className="w-full px-3 py-2 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" type="password" id="password" name="password" value={formData.password} onChange={handleChange} required disabled={isLoading} />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:bg-blue-400" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'SIGN IN'}
          </button>
        </form>
        <div className="text-center mt-4">
          <Link to="/register" className="text-blue-400 hover:underline text-sm">Register</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;