import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    senderWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    recipientWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currencyFrom: {
      type: String,
      required: true,
      enum: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'BTC', 'ETH', 'USDC', 'USDT', 'DAI'],
    },
    currencyTo: {
      type: String,
      required: true,
      enum: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'BTC', 'ETH', 'USDC', 'USDT', 'DAI'],
    },
    exchangeRate: {
      type: Number,
      required: true,
    },
    receivedAmount: {
      type: Number,
      required: true,
    },
    fees: {
      platformFee: {
        type: Number,
        default: 0,
      },
      networkFee: {
        type: Number,
        default: 0,
      },
      conversionFee: {
        type: Number,
        default: 0,
      },
      totalFee: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['domestic', 'international', 'cross-border', 'deposit', 'withdrawal', 'conversion', 'peer-to-peer'],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'card', 'bank-transfer', 'mobile-money'],
      default: 'wallet',
    },
    blockchainData: {
      hash: String,
      confirmations: {
        type: Number,
        default: 0,
      },
      gasUsed: String,
      gasPrice: String,
      blockNumber: String,
      timestamp: Date,
      network: String,
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    riskFlags: [String],
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvalNotes: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    description: String,
    reference: String,
    recipientDetails: {
      name: String,
      accountNumber: String,
      bankCode: String,
      country: String,
      walletAddress: String,
    },
    metadata: mongoose.Schema.Types.Mixed,
    errorMessage: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    nextRetryDate: Date,
    completedAt: Date,
    failedAt: Date,
    reversedAt: Date,
    reversalReason: String,
    notificationSent: {
      sender: {
        type: Boolean,
        default: false,
      },
      recipient: {
        type: Boolean,
        default: false,
      },
    },
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ senderId: 1 });
transactionSchema.index({ recipientId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ 'blockchainData.hash': 1 });
transactionSchema.index({ transactionType: 1 });
transactionSchema.index({ senderId: 1, createdAt: -1 });
transactionSchema.index({ recipientId: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
