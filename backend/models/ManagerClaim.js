const mongoose = require('mongoose');

const ManagerClaimSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    propertyName: { type: String, default: '' },

    // ---- Identity-bearing fields used for confidence scoring ----
    workEmail: { type: String, required: true, trim: true, lowercase: true },
    emailDomain: { type: String, default: '', lowercase: true, index: true },
    companyWebsite: { type: String, default: '', trim: true },
    websiteDomain: { type: String, default: '', lowercase: true },
    phoneNumber: { type: String, default: '' },
    roleTitle: { type: String, default: '' },
    proofMessage: { type: String, default: '' },

    confidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'low',
      index: true,
    },
    confidenceReason: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One open claim per (manager, listing) is enforced in the route layer.
ManagerClaimSchema.index({ manager: 1, listing: 1, status: 1 });

ManagerClaimSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    manager: this.manager,
    listing: this.listing,
    propertyName: this.propertyName,
    workEmail: this.workEmail,
    emailDomain: this.emailDomain,
    companyWebsite: this.companyWebsite,
    websiteDomain: this.websiteDomain,
    phoneNumber: this.phoneNumber,
    roleTitle: this.roleTitle,
    proofMessage: this.proofMessage,
    confidence: this.confidence,
    confidenceReason: this.confidenceReason,
    status: this.status,
    adminNote: this.adminNote,
    reviewedAt: this.reviewedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('ManagerClaim', ManagerClaimSchema);
