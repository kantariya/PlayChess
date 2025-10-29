// client/src/socket.js
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5001"; // Get the base server URL
export const socket = io(URL, { 
    autoConnect: false, // Don't connect automatically
    withCredentials: true 
});