import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Game from './models/Game.model.js';
import User from './models/User.model.js';

const seedGames = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for game seeding.");

    // 1. Find our main user
    const userKishan = await User.findOne({ username: 'kishan' });
    if (!userKishan) {
      console.log("User 'kishan' not found. Please create the user first by running seed.js.");
      await mongoose.disconnect();
      return;
    }

    // 2. Find or create the opponent user
    let opponentUser = await User.findOne({ username: 'dummyOpponent' });
    if (!opponentUser) {
      console.log("Opponent user not found, creating one...");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      opponentUser = new User({
        username: 'dummyOpponent',
        email: 'opponent@example.com',
        password: hashedPassword,
        name: 'John Doe',
        country: 'US',
        ratings: { bullet: 1000, blitz: 1000, rapid: 1000, daily: 1000 }
      });
      await opponentUser.save();
      console.log("User 'dummyOpponent' created successfully!");
    }

    const opponentId = opponentUser._id;

    // 3. Define the dummy games using real user IDs
    const dummyGames = [
      {
        players: [
          { user: userKishan._id, color: 'w', rating: 1100 },
          { user: opponentId, color: 'b', rating: 1050 }
        ],
        status: 'completed',
        pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0',
        finalFen: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
        timeControl: '10+0',
        winner: 'white',
        endReason: 'resignation'
      },
      {
        players: [
          { user: opponentId, color: 'w', rating: 1210 },
          { user: userKishan._id, color: 'b', rating: 1105 }
        ],
        status: 'completed',
        pgn: '1. d4 d5 2. c4 e6 0-1',
        finalFen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
        timeControl: '5+3',
        winner: 'black',
        endReason: 'timeout'
      },
      {
        players: [
          { user: userKishan._id, color: 'w', rating: 1110 },
          { user: opponentId, color: 'b', rating: 1115 }
        ],
        status: 'completed',
        pgn: '1. f3 e5 2. g4 Qh4# 0-1',
        finalFen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
        timeControl: '3+2',
        winner: 'black',
        endReason: 'checkmate'
      }
    ];

    // 4. Clear old games and insert new ones
    await Game.deleteMany({ 'players.user': userKishan._id });
    await Game.insertMany(dummyGames);
    
    console.log(`${dummyGames.length} dummy games created for user 'kishan' against 'dummyOpponent'.`);

  } catch (error) {
    console.error("Error seeding games:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

seedGames();