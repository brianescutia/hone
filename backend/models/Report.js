const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['review', 'message', 'sublease', 'listing', 'user'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    category: {
      type: String,
      enum: [
        'scam',
        'harassment',
        'fake_listing',
        'inappropriate_content',
        'wrong_information',
        'spam',
        'other',
      ],
      default: 'other',
    },
    reason: { type: String, default: '' },
    status: {
      type: String,
      enum: ['open', 'resolved', 'dismissed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);
