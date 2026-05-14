const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    overall: { type: Number, min: 1, max: 5, required: true },
    management: { type: Number, min: 1, max: 5 },
    noise: { type: Number, min: 1, max: 5 },
    safety: { type: Number, min: 1, max: 5 },
    maintenance: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
    commute: { type: Number, min: 1, max: 5 },

    body: { type: String, default: '' },
    anonymous: { type: Boolean, default: false },

    // Admin moderation
    flagged: { type: Boolean, default: false },
    removed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', ReviewSchema);
