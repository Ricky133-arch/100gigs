/**
 * models/Payment.js
 * Records every payment made through 100Gigs.
 * Tracks both the client payment and the provider payout status.
 */
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  reference:      { type: String, required: true, unique: true },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job',  required: true, index: true },
  applicationId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true }, // the hire this pays for
  clientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  totalAmount:    { type: Number, required: true, min: 0 }, // what client paid
  commission:     { type: Number, required: true, min: 0 }, // 100Gigs cut
  providerShare:  { type: Number, required: true, min: 0 }, // what provider gets

  // ── Client payment (Paystack collection) ───────────────────────────────
  paystackStatus: { type: String, default: 'pending' }, // success | failed
  paidAt:         { type: Date },

  // ── Provider payout (Paystack Transfer) ────────────────────────────────
  transferStatus:    {
    type:    String,
    enum:    ['awaiting_settlement', 'pending', 'success', 'failed'],
    default: 'awaiting_settlement', // funds need to settle first (T+1/T+3)
    index:   true,
  },
  transferCode:      { type: String },   // Paystack transfer code
  transferReference: { type: String, unique: true, sparse: true }, // one transfer per payment, never two
  transferFailReason:{ type: String },   // if transfer failed, why
  transferInitiatedAt: { type: Date },
  transferCompletedAt: { type: Date },

}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);