const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    // Conversation is anchored either to a listing or a sublease
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null },
    sublease: { type: mongoose.Schema.Types.ObjectId, ref: 'Sublease', default: null },

    contextLabel: { type: String, default: '' }, // e.g. "Apartment Manager - Almondwood"

    messages: [MessageSchema],
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
