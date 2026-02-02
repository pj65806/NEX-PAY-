import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    nationality: {
      type: String,
      required: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    accountType: {
      type: String,
      enum: ['personal', 'merchant', 'business'],
      default: 'personal',
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    kycLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    apiKey: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
    },
    preferredCurrency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'BTC', 'ETH'],
    },
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
      transactionAlerts: {
        type: Boolean,
        default: true,
      },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tags: [String],
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  // If locked, don't increment
  if (this.isLocked()) {
    return;
  }

  // If first failed attempt, set timeout
  if (this.loginAttempts === 0) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }

  // Increment login attempts
  this.loginAttempts += 1;

  // Lock account after 5 attempts
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  }

  await this.save();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ kycStatus: 1 });

export default mongoose.model('User', userSchema);
