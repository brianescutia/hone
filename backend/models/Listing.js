const mongoose = require('mongoose');

const FloorPlanSchema = new mongoose.Schema(
  {
    name: String,            // e.g. "2-Bedroom, 1.5-Bath Standard Unit"
    bedrooms: Number,
    bathrooms: Number,
    sqft: Number,
    price: Number,           // monthly
    deposit: Number,
    specialAvailability: String,
    imageUrl: String,
  },
  { _id: false }
);

const ListingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      // GeoJSON-ish; we just use lat/lng for the map
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    description: String,

    priceMin: { type: Number, required: true },
    priceMax: Number,
    bedroomsMin: Number,
    bedroomsMax: Number,
    bathroomsMin: Number,
    bathroomsMax: Number,

    rating: { type: Number, default: 0 }, // denormalized avg
    reviewCount: { type: Number, default: 0 },

    photos: [String],            // image URLs
    amenities: [String],         // ["in-unit washer & dryer", ...]
    feesAndPolicies: [String],   // free-form
    keyAmenities: [String],      // 1-3 chip-displayed

    tags: [String],              // ["long term","sublease","pet-friendly","4+ stars","10 minute bus", ...]
    petFriendly: { type: Boolean, default: false },

    contactPhone: String,
    contactEmail: String,
    officeHours: String,

    floorPlans: [FloorPlanSchema],

    commute: {
      bus: { minutes: Number, line: String, stops: Number },
      car: { minutes: Number, miles: Number },
      bike: { minutes: Number, miles: Number },
      walk: { minutes: Number, miles: Number },
    },

    // Manager who has claimed this listing (null if unclaimed)
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    claimable: { type: Boolean, default: true },

    // ---- New manager-claim fields ----
    // True iff an approved ManagerClaim exists for this listing.
    claimedByManager: { type: Boolean, default: false, index: true },
    // The User whose claim is currently active. May be null even when
    // claimedByManager=false (e.g., during revocation).
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    // Approved claim's confidence ≥ medium AND domain match was at least medium.
    managerVerified: { type: Boolean, default: false },
    // Snapshot of the website domain from the approved claim (for UI display
    // and future verification audits).
    officialManagerDomain: { type: String, default: '' },
    // Granular state for the public UI: 'unclaimed' | 'pending' | 'claimed'.
    claimStatus: {
      type: String,
      enum: ['unclaimed', 'pending', 'claimed'],
      default: 'unclaimed',
      index: true,
    },
    // Last time the (approved) manager edited any official field on this listing.
    lastManagerUpdateAt: { type: Date, default: null },

    // ---- Source tracking & verification ----
    // Where did this listing come from?
    sourceType: {
      type: String,
      enum: ['manual_seed', 'manager_posted', 'student_posted', 'external_import'],
      default: 'manual_seed',
    },
    sourceName: { type: String, default: '' }, // e.g. "Apartments.com", "Facebook Marketplace"
    sourceUrl: { type: String, default: '' },
    // hone's verification of the listing itself.
    verificationStatus: {
      type: String,
      enum: ['verified', 'unverified', 'pending_review', 'claimed'],
      default: 'verified', // seed data is trusted by default
    },
    lastImportedAt: { type: Date, default: null },
    hidden: { type: Boolean, default: false }, // admin can hide a listing
  },
  { timestamps: true }
);

ListingSchema.index({ 'location.lat': 1, 'location.lng': 1 });
ListingSchema.index({ name: 'text', address: 'text', description: 'text' });

module.exports = mongoose.model('Listing', ListingSchema);
