import express from 'express';
import { getUserProfile } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get the profile and ratings of the currently logged-in user
// @access  Private
router.get('/profile', protect, getUserProfile);

export default router;