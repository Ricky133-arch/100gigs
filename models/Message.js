import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: { type: String, required: true },
  seen: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);