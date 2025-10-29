// client/src/pages/RegisterPage.jsx
import React, { useState, useMemo } from 'react'; // Import useMemo
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getData } from 'country-list'; // Import the getData function

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '', 
    email: '', 
    password: '', 
    name: '', 
    country: 'IN', // Set a default, e.g., 'IN' for India
    level: 'intermediate'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  // useMemo ensures the country list is generated only once
  const countries = useMemo(() => getData(), []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await register(formData);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4">
      <h1 className="text-4xl font-bold text-white mb-10 tracking-wider">PlayChess</h1>
      <div className="w-full max-w-2xl bg-gray-700 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-center text-white mb-6">Create an account</h2>
        <form onSubmit={handleSubmit}>
          <div className="md:grid md:grid-cols-2 md:gap-x-6">
            {/* Username, Name, Email, Password fields remain the same */}
            <div className="mb-4">
                <label className="block text-gray-400 text-sm font-bold mb-2 uppercase">Username</label>
                <input className="w-full px-3 py-2 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" type="text" name="username" onChange={handleChange} required disabled={isLoading} />
            </div>
            <div className="mb-4">
                <label className="block text-gray-400 text-sm font-bold mb-2 uppercase">Name</label>
                <input className="w-full px-3 py-2 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" type="text" name="name" onChange={handleChange} required disabled={isLoading} />
            </div>
            <div className="mb-4">
                <label className="block text-gray-400 text-sm font-bold mb-2 uppercase">Email</label>
                <input className="w-full px-3 py-2 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" type="email" name="email" onChange={handleChange} required disabled={isLoading} />
            </div>
             <div className="mb-4">
                <label className="block text-gray-400 text-sm font-bold mb-2 uppercase">Password</label>
                <input className="w-full px-3 py-2 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" type="password" name="password" onChange={handleChange} required disabled={isLoading} />
            </div>

            {/* --- THIS IS THE UPDATED COUNTRY FIELD --- */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-bold mb-2 uppercase">Country</label>
              <select 
                name="country" 
                value={formData.country} 
                onChange={handleChange} 
                className="w-full px-3 py-2 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
                disabled={isLoading}
              >
                <option value="" disabled>Select a country</option>
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-bold mb-2 uppercase">Your chess level</label>
              <select name="level" value={formData.level} onChange={handleChange} className="w-full px-3 py-2 bg-gray-900 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading}>
                <option value="beginner">Beginner (~400)</option>
                <option value="intermediate">Intermediate (~1100)</option>
                <option value="master">Master (~1500)</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-200 mt-4 disabled:bg-blue-400" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'REGISTER'}
          </button>
        </form>
        <div className="text-center mt-4">
          <Link to="/login" className="text-blue-400 hover:underline text-sm">Already have an account?</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;