const mongoose = require('mongoose');

// ExternalLead holds raw imported housing leads (from Apify, manual paste,
// or any other off-platform source) BEFORE admin review. Approving a lead
// creates a corresponding Listing or Sublease and links them with
// importedListing / importedSublease.
//
// Important: leads are never shown to public users. Even after approval,
// the resulting Listing/Sublease carries `sourceType: external_import` and
// `verificationStatus: unverified` until a verified UC Davis student, an
// approved manager, or an admin explicitly claims/verifies it.

const ExternalLeadSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    price: { type: Number, default: null }, // monthly, USD; null if unknown
    locationText: { type: String, default: '' }, // free-form "Davis, CA" etc.

    sourceName: { type: String, default: '' }, // e.g. "Facebook Marketplace"
    sourceUrl: { type: String, required: true, unique: true, index: true },

    description: { type: String, default: '' },
    imageUrls: [String],

    scrapedAt: { type: Date, default: Date.now },
    // The raw, un-normalized result from the upstream source. Keeping this
    // lets us re-normalize without re-scraping if the schema changes.
    rawData: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: ['new', 'needs_review', 'approved', 'rejected', 'duplicate', 'claimed'],
      default: 'needs_review',
      index: true,
    },

    // Best-effort match guesses populated by the import normalizer.
    // These are HINTS for the moderator — never auto-merged.
    possibleListingMatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },
    possibleSubleaseMatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sublease',
      default: null,
    },

    // Filled in once a moderator approves and creates a public record.
    importedListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },
    importedSublease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sublease',
      default: null,
    },

    notes: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ExternalLeadSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ExternalLead', ExternalLeadSchema);
