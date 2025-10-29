import express from 'express';
import { 
    getRecentGameHistory, 
    getAllGameHistory, 
    getGameById 
} from '../controllers/game.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Route for the dashboard's recent game history
router.get('/history/recent', protect, getRecentGameHistory);

// Route for the profile page's complete game history
router.get('/history/all', protect, getAllGameHistory);

// Route for fetching a single game for replay
router.get('/:id', protect, getGameById);

export default router;