import axios from 'axios';
import toast from 'react-hot-toast'; // Import toast

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// --- Global Response Interceptor ---
axiosInstance.interceptors.response.use(
  // 1. On Success (if the response is 2xx)
  // We just pass the response right through
  (response) => response,

  // 2. On Error (if the response is 4xx or 5xx)
  (error) => {
    // Extract the most helpful error message
    const errorMessage = 
      error.response?.data?.message || // 1. Backend error message
      error.message ||                 // 2. Generic axios error
      'An unexpected error occurred.'; // 3. Fallback message

    // Display the error message as a toast
    toast.error(errorMessage);

    // We must reject the promise to allow individual components
    // to still handle the error if they need to (e.g., stop a loader)
    return Promise.reject(error);
  }
);

export default axiosInstance;