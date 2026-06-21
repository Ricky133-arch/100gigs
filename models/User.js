import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  phone:    { type: String },
  role:     { type: String, enum: ['client', 'provider', 'admin'], required: true },
  bio:      { type: String },
  skills:   [{ type: String }],
  location: { type: String },
  avatar:   { type: String },
  portfolio:[{ type: String }],

  // ── Verification (providers only) ──────────────────────────────────────
  verificationStatus: {
    type:    String,
    enum:    ['unsubmitted', 'pending', 'verified', 'rejected'],
    default: 'unsubmitted',
  },
  verificationDoc:             { type: String },
  verificationSubmittedAt:     { type: Date },
  verificationReviewedAt:      { type: Date },
  verificationRejectionReason: { type: String },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Suspension ──────────────────────────────────────────────────────────
  isSuspended:     { type: Boolean, default: false },
  suspendedReason: { type: String },
  suspendedAt:     { type: Date },

}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);