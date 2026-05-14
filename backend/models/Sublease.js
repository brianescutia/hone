const mongoose = require('mongoose');

const SubleaseSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    poster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, required: true },
    roomType: {
      type: String,
      enum: ['private room', 'shared room', 'studio', 'whole unit'],
      required: true,
    },
    bathroomType: {
      type: String,
      enum: ['private', 'shared'],
      required: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    price: { type: Number, required: true }, // monthly
    utilitiesIncluded: { type: Boolean, default: false },
    utilitiesEstimate: { type: Number, default: 0 },

    roommates: { type: Number, default: 0 },
    furnished: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    petPolicy: { type: String, default: '' },

    genderPreference: {
      type: String,
      enum: ['any', 'female', 'male', 'non-binary'],
      default: 'any',
    },

    description: { type: String, default: '' },
    photos: [String],

    // How to reach the poster — required per spec
    contactPreference: {
      type: String,
      enum: ['in_app_message', 'email', 'phone', 'text'],
      default: 'in_app_message',
    },
    contactDetail: { type: String, default: '' }, // optional phone/email if not in-app

    // Lifecycle status (poster-controlled)
    status: {
      type: String,
      enum: ['available', 'pending', 'taken'],
      default: 'available',
    },

    // Admin moderation status
    moderation: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sublease', SubleaseSchema);
