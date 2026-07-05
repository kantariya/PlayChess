import User from '../models/User.model.js';
import mongoose from 'mongoose';


// @desc    Get current user's profile and ratings
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    // req.user.id is attached by the 'protect' middleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


/**
 * @desc    Update user profile (name and country only)
 * @route   PUT /api/users/:userId
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  const { userId } = req.params;
  const { name, country } = req.body;

  // --- Security Check ---
  // Ensure the :userId param matches the authenticated user's ID
  // We assume your auth middleware adds the user object to req.user
  if (!req.user || req.params.userId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
  }

  // --- Validation ---
  // Check if ID is a valid Mongoose ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // Check for required fields
  if (!name || !country) {
    return res.status(400).json({ message: 'Name and country are required.' });
  }

  try {
    // Find the user by their ID and update only 'name' and 'country'
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          name: name,
          country: country,
        },
      },
      {
        new: true, // Return the *updated* document, not the old one
        runValidators: true, // Ensure schema validation (like 'required') runs
        select: '-password', // IMPORTANT: Never send the password hash back
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send the updated user object back
    res.status(200).json(updatedUser);

  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};