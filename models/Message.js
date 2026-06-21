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
  // ── replyTo: embedded snapshot, not a ref ─────────────────────────
  // _id stored as Mixed/String so it accepts either an ObjectId or a
  // string without Mongoose silently rejecting the whole sub-document.
  replyTo: {
    type: new mongoose.Schema({
      _id: { type: mongoose.Schema.Types.Mixed },
      content: { type: String },
      senderName: { type: String },
    }, { _id: false }),
    default: null,
  },
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);