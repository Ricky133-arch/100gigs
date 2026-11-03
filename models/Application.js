import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema({
  job: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Job',
    required: true,
  },
  applicant: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },
  coverLetter: {
    type:      String,
    required:  true,
    trim:      true,
    maxlength: 3000,
  },
  proposedRate: {
    type: Number,
    min:  0,
  },
  status: {
    type:    String,
    enum:    ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending',
  },
  // Set when client marks job as done
  completedAt: {
    type: Date,
  },
  // Set when payment is made through 100Gigs
  paidAt: {
    type: Date,
  },
  paymentReference: {
    type: String,
  },
}, { timestamps: true });

// One application per provider per job — the database itself refuses a second one
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
// Fast "who's hired on this job" lookups
ApplicationSchema.index({ job: 1, status: 1 });

export default mongoose.models.Application ||
  mongoose.model('Application', ApplicationSchema);