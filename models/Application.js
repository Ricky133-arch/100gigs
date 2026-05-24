import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  applicant: { // ✅ renamed from 'provider'
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  coverLetter: {
    type: String,
    required: true,
  },
  proposedRate: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true }); // ✅ use timestamps instead of manual createdAt

export default mongoose.models.Application || mongoose.model('Application', ApplicationSchema);