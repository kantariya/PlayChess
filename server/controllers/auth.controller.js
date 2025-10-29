// server/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// --- REGISTER USER ---
export const register = async (req, res) => {
    const { username, email, password, name, country, level } = req.body;
    try {
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        let initialRating = 1100;
        if (level === 'beginner') initialRating = 400;
        if (level === 'master') initialRating = 1500;

        user = new User({
            username, email, password: hashedPassword, name, country,
            ratings: { bullet: initialRating, blitz: initialRating, rapid: initialRating, daily: initialRating }
        });

        await user.save();

        // --- LOGIN USER IMMEDIATELY AFTER REGISTER ---
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });

                // Also send back user data (without password)
                const userResponse = { _id: user.id, username: user.username, email: user.email, name: user.name, country: user.country, ratings: user.ratings };
                res.status(201).json(userResponse);
            }
        );

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// --- LOGIN USER ---
export const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ $or: [{ email: username }, { username: username }] });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
                const userResponse = { _id: user.id, username: user.username, email: user.email, name: user.name, country: user.country, ratings: user.ratings };
                res.status(200).json(userResponse);
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// --- LOGOUT USER ---
export const logout = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

// --- GET CURRENT USER ---
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};