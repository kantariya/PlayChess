import Game from '../models/Game.model.js';

// @desc    Get recent (last 15) game history for the dashboard
// @route   GET /api/games/history/recent
// @access  Private
export const getRecentGameHistory = async (req, res) => {
  try {
    const games = await Game.find({ 
        'players.user': req.user.id, 
        status: 'completed' 
      })
      .sort({ createdAt: -1 })
      .limit(15) // Fetches only the last 15 games
      .populate('players.user', 'username country');

    res.json(games);
  } catch (error) {
    console.error('Error fetching recent game history:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all game history for a user's profile page
// @route   GET /api/games/history/all
// @access  Private
export const getAllGameHistory = async (req, res) => {
  try {
    const games = await Game.find({ 
        'players.user': req.user.id, 
        status: 'completed' 
      })
      .sort({ createdAt: -1 }) // No .limit(), so it fetches all games
      .populate('players.user', 'username country');

    res.json(games);
  } catch (error) {
    console.error('Error fetching all game history:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Get a single game by its ID for replay
// @route   GET /api/games/:id
// @access  Private
export const getGameById = async (req, res) => {
    try {
        const game = await Game.findById(req.params.id)
            .populate('players.user', 'username country rating');

        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        const isPlayer = game.players.some(p => p.user._id.equals(req.user.id));
        if (!isPlayer) {
            return res.status(403).json({ message: 'Not authorized to view this game' });
        }

        res.json(game);
    } catch (error) {
        console.error('Error fetching game by ID:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};