import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  // Who receives this notification
  recipient: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  // Who triggered it (optional — system notifications have no sender)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
  },
  type: {
    type: String,
    enum: [
      'new_application',   // provider applied to your job
      'application_accepted', // your application was accepted
      'application_rejected', // your application was rejected
      'new_message',       // new chat message
      'job_posted',        // new job in your category
      'verification_approved', // your account is verified
      'verification_rejected', // verification rejected
      'account_suspended', // account suspended
      'account_reinstated',// account reinstated
      'system',            // generic system notification
    ],
    required: true,
  },
  title:   { type: String, required: true },
  body:    { type: String, required: true },
  url:     { type: String, default: '/' }, // where to go when clicked
  isRead:  { type: Boolean, default: false },
}, { timestamps: true });

// Index for fast unread count queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);