const mongoose = require('mongoose');

const ClaimRequestSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    company: String,
    phone: String,
    note: String,

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    adminNote: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClaimRequest', ClaimRequestSchema);
