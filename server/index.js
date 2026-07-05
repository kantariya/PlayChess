// server/index.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http'; // You must import this
import { initializeSocketIO } from './socket/socket.js';
import helmet from "helmet";
import compression from "compression";
import { apiLimiter } from "./middlewares/rateLimiter.js";



import authRoutes from './routes/auth.route.js'; // Using your new file name convention
import userRoutes from './routes/user.route.js';
import gameRoutes from './routes/game.route.js';

const app = express();
const httpServer = createServer(app); 
// Initialize Socket.IO and pass it the HTTP server instance
const io = initializeSocketIO(httpServer);
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL;


app.set("trust proxy", 1);


app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

app.use(compression());

app.use("/api", apiLimiter);

// Middleware
app.use(cors({
  origin: CLIENT_URL, // Your frontend URL
  credentials: true,  // Allow cookies to be sent from the client
}));
app.use(cookieParser());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.stack || err.message);

  res.status(status).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Add other routes for game logic, puzzles, etc. later
// app.use('/api/games', gameRoutes);
// app.use('/api/puzzles', puzzleRoutes);

const mongoURI = process.env.MONGO_URI;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully.");
    
    // Server only listens after a successful DB connection
    httpServer.listen(PORT, () => {
      console.log(`PlayChess server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error. Server startup aborted:", err);
    process.exit(1); // Force exit if database connection fails
  });