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

  // ── Shareable username ──────────────────────────────────────────────────
  username: {
    type:      String,
    unique:    true,
    sparse:    true,
    lowercase: true,
    trim:      true,
    match:     [/^[a-z0-9_-]{3,30}$/, 'Username can only contain letters, numbers, hyphens and underscores (3–30 chars)'],
  },

  // ── Social links ────────────────────────────────────────────────────────
  socialLinks: {
    instagram: { type: String, default: '' },
    facebook:  { type: String, default: '' },
    twitter:   { type: String, default: '' },
    tiktok:    { type: String, default: '' },
    linkedin:  { type: String, default: '' },
    youtube:   { type: String, default: '' },
  },

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

  // ── Password reset ──────────────────────────────────────────────────────
  resetPasswordToken:   { type: String },
  resetPasswordExpires: { type: Date },

}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);