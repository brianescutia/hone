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
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ['student', 'manager', 'admin'],
      default: 'student',
    },

    // ---- Verification ----
    // Has the user clicked the verification link sent to their inbox?
    emailVerified: { type: Boolean, default: false },
    // True iff role === 'student', email is @ucdavis.edu, AND emailVerified.
    studentVerified: { type: Boolean, default: false },
    // Denormalized status for UI rendering.
    verificationStatus: {
      type: String,
      enum: ['unverified', 'email_pending', 'email_verified', 'verified_student'],
      default: 'unverified',
    },

    // Email verification token (hash + expiry). We store the SHA-256 hash
    // of the raw token so a DB leak doesn't expose usable tokens.
    emailVerifyTokenHash: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },

    // Legacy convenience flag (kept for backwards compat). Derived in pre-save.
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
  // Keep verification fields consistent.
  if (this.emailVerified) {
    const isUCDavis = /@ucdavis\.edu$/i.test(this.email);
    this.studentVerified = this.role === 'student' && isUCDavis;
    this.verificationStatus = this.studentVerified
      ? 'verified_student'
      : 'email_verified';
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
  return bcrypt.compare(pw, this.passwordHash);
};

// Issues a fresh verification token. Returns the raw token (to log/email)
// and stores only the hash + expiry on the user. Caller must `save()`.
UserSchema.methods.issueVerificationToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.emailVerifyTokenHash = crypto
    .createHash('sha256')
    .update(raw)
    .digest('hex');
  this.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
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
    emailVerified: this.emailVerified,
    studentVerified: this.studentVerified,
    verificationStatus: this.verificationStatus,
    // Legacy alias for any older UI code; equals studentVerified.
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
