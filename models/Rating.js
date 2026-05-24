import mongoose from 'mongoose';

const RatingSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    trim: true,
    maxlength: 500,
  },
}, { timestamps: true });

// One rating per client per job
RatingSchema.index({ client: 1, job: 1 }, { unique: true });

export default mongoose.models.Rating || mongoose.model('Rating', RatingSchema);