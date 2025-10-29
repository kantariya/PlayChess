import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  country: { type: String, required: true },
  ratings: {
    bullet: { type: Number, default: 1200 },
    blitz: { type: Number, default: 1200 },
    rapid: { type: Number, default: 1200 },
    daily: { type: Number, default: 1200 },
  }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;