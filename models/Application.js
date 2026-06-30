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
  },
  coverLetter: {
    type:     String,
    required: true,
  },
  proposedRate: {
    type: Number,
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

export default mongoose.models.Application ||
  mongoose.model('Application', ApplicationSchema);