const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Optional now — Google-only users won't have one. The Google route sets
    // a random unguessable value so this still satisfies anything that
    // expected the field to exist.
    passwordHash: { type: String, default: null },

    role: {
      type: String,
      enum: ['student', 'manager', 'admin'],
      default: 'student',
    },

    // ---- Auth provider ----
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: { type: String, default: null, index: true, sparse: true },

    // ---- Verification ----
    emailVerified: { type: Boolean, default: false },
    studentVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: [
        'unverified',
        'email_pending',
        'email_verified',
        'verified_student',
        'not_ucdavis',
      ],
      default: 'unverified',
    },

    emailVerifyTokenHash: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },

    verified: { type: Boolean, default: false },

    // ---- Moderation ----
    suspended: { type: Boolean, default: false },
    suspendedReason: { type: String, default: '' },

    // ---- Manager-only fields ----
    company: { type: String, default: '' },
    managerStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    // ---- Student-only fields ----
    savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

UserSchema.pre('save', function (next) {
  // Verification field derivation.
  if (this.emailVerified) {
    const isUCDavis = /@ucdavis\.edu$/i.test(this.email);
    this.studentVerified = this.role === 'student' && isUCDavis;
    if (this.studentVerified) {
      this.verificationStatus = 'verified_student';
    } else if (this.role === 'student' && !isUCDavis) {
      // Email is verified by Google but not a UC Davis address.
      this.verificationStatus = 'not_ucdavis';
    } else {
      this.verificationStatus = 'email_verified';
    }
  } else if (this.emailVerifyTokenHash) {
    this.studentVerified = false;
    this.verificationStatus = 'email_pending';
  } else {
    this.studentVerified = false;
    this.verificationStatus = 'unverified';
  }
  this.verified = this.studentVerified;
  next();
});

UserSchema.statics.hashPassword = function (pw) {
  return bcrypt.hash(pw, 10);
};

UserSchema.methods.checkPassword = function (pw) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(pw, this.passwordHash);
};

UserSchema.methods.issueVerificationToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.emailVerifyTokenHash = crypto
    .createHash('sha256')
    .update(raw)
    .digest('hex');
  this.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return raw;
};

UserSchema.statics.hashToken = function (raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
};

UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    authProvider: this.authProvider,
    emailVerified: this.emailVerified,
    studentVerified: this.studentVerified,
    verificationStatus: this.verificationStatus,
    verified: this.studentVerified,
    suspended: this.suspended,
    company: this.company,
    managerStatus: this.managerStatus,
    savedListings: this.savedListings,
    bio: this.bio,
    avatarUrl: this.avatarUrl,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
