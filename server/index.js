// server/index.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http'; // You must import this
import { initializeSocketIO } from './socket/socket.js';



import authRoutes from './routes/auth.route.js'; // Using your new file name convention
import userRoutes from './routes/user.route.js';
import gameRoutes from './routes/game.route.js';

const app = express();
const httpServer = createServer(app); 
// Initialize Socket.IO and pass it the HTTP server instance
const io = initializeSocketIO(httpServer);
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CLIENT_URL, // Your frontend URL
  credentials: true,  // Allow cookies to be sent from the client
}));
app.use(express.json());
app.use(cookieParser());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch(err => console.error("MongoDB connection error:", err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);

// Add other routes for game logic, puzzles, etc. later
// app.use('/api/games', gameRoutes);
// app.use('/api/puzzles', puzzleRoutes);

httpServer.listen(PORT, () => {
  console.log(`PlayChess server is running on port ${PORT}`);
});