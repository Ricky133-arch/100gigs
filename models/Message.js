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
  content: { type: String, required: true, trim: true, maxlength: 2000 },
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

// Opening a chat: all messages in one conversation, in order
MessageSchema.index({ conversationId: 1, createdAt: -1 });
// Conversation list + the "30 messages a minute" limit
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, createdAt: -1 });
// Unread badges
MessageSchema.index({ receiver: 1, seen: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);