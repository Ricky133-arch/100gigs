import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String },
  role: { type: String, enum: ['client', 'provider'], required: true },
  bio: { type: String },
  skills: [{ type: String }],
  location: { type: String },
  avatar: { type: String },
  portfolio: [{ type: String }],
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);