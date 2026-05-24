import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: [
      'Plumbing', 'Electrical', 'Carpentry', 'Makeup & Hair',
      'Cleaning', 'Painting', 'Car Repair', 'Tailoring',
      'Graphic Design', 'Photography', 'Tutoring', 'Delivery',
      'Event Planning', 'AC Repair', 'Other'
    ],
  },
  budgetMin: { type: Number, required: true },
  budgetMax: { type: Number, required: true },
  location: { type: String, required: true },
  deadline: { type: Date },
  images: [{ type: String }],
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'cancelled'],
    default: 'open',
  },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.models.Job || mongoose.model('Job', JobSchema);