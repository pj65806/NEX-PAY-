import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
    },
    privateKeyEncrypted: {
      type: String,
      required: true,
      select: false,
    },
    balances: {
      fiat: {
        amount: {
          type: Number,
          default: 0,
        },
        currency: {
          type: String,
          default: 'USD',
          enum: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR'],
        },
      },
      crypto: [
        {
          symbol: {
            type: String,
            enum: ['BTC', 'ETH', 'USDC', 'USDT', 'DAI'],
          },
          amount: {
            type: Number,
            default: 0,
          },
          usdValue: Number,
        },
      ],
    },
    totalBalance: {
      type: Number,
      default: 0,
      index: true,
    },
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
    ],
    pendingTransactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
    ],
    holdAmount: {
      type: Number,
      default: 0,
    },
    availableBalance: {
      type: Number,
      default: 0,
    },
    dailyLimit: {
      amount: {
        type: Number,
        default: 10000,
      },
      used: {
        type: Number,
        default: 0,
      },
      resetDate: Date,
    },
    monthlyLimit: {
      amount: {
        type: Number,
        default: 100000,
      },
      used: {
        type: Number,
        default: 0,
      },
      resetDate: Date,
    },
    yearlyLimit: {
      amount: {
        type: Number,
        default: 1000000,
      },
      used: {
        type: Number,
        default: 0,
      },
      resetDate: Date,
    },
    freezeStatus: {
      type: String,
      enum: ['active', 'frozen', 'suspended'],
      default: 'active',
    },
    freezeReason: String,
    freezeUntil: Date,
    linkedBankAccounts: [
      {
        accountId: String,
        accountNumber: String,
        bankCode: String,
        accountName: String,
        isVerified: Boolean,
        isPrimary: Boolean,
      },
    ],
    linkedCryptoAddresses: [
      {
        address: String,
        blockchain: String,
        isVerified: Boolean,
        isPrimary: Boolean,
      },
    ],
    recurringTransfers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecurringTransfer',
      },
    ],
    blacklistedAddresses: [String],
    transactionHistory: {
      totalCount: {
        type: Number,
        default: 0,
      },
      successCount: {
        type: Number,
        default: 0,
      },
      failedCount: {
        type: Number,
        default: 0,
      },
      totalVolume: {
        type: Number,
        default: 0,
      },
    },
    lastActivityDate: Date,
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
walletSchema.index({ userId: 1 });
walletSchema.index({ walletAddress: 1 });
walletSchema.index({ totalBalance: -1 });
walletSchema.index({ createdAt: -1 });
walletSchema.index({ freezeStatus: 1 });

export default mongoose.model('Wallet', walletSchema);
