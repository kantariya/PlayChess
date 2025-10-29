// server/models/Game.model.js
import mongoose from 'mongoose';
import { Chess } from 'chess.js';

const PlayerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  color: { type: String, enum: ['w', 'b'], required: true },
  rating: { type: Number, required: true },
});

const MoveSchema = new mongoose.Schema({
  from: String,
  to: String,
  promotion: { type: String, default: null },
  san: String,
  fen: String,
  captured: { type: String, default: null }
}, { _id: false });

const GameSchema = new mongoose.Schema({
  players: [PlayerSchema],
  status: {
    type: String,
    enum: ['inprogress', 'completed', 'aborted'],
    default: 'inprogress'
  },
  fen: {
    type: String,
    required: true,
    default: new Chess().fen()
  },
  pgn: { type: String, default: '' },
  moves: { type: [MoveSchema], default: [] }, // persisted move array
  timeControl: { type: String, required: true },
  category: { type: String, required: true }, // e.g., 'bullet', 'blitz', 'rapid', 'classical'
  winner: { type: String }, // 'white' | 'black' | 'draw'
  endReason: { type: String } // 'checkmate' | 'timeout' | 'draw' | etc
}, { timestamps: true });

const Game = mongoose.model('Game', GameSchema);
export default Game;
