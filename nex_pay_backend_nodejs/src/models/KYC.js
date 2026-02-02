import mongoose from 'mongoose';

const kycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    kycLevel: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    submissionDate: Date,
    reviewDate: Date,
    approvalDate: Date,
    expiryDate: Date,
    rejectionReason: String,
    reviewNotes: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Level 1 - Basic Information
    level1: {
      firstName: String,
      lastName: String,
      dateOfBirth: Date,
      nationality: String,
      governmentIdType: {
        type: String,
        enum: ['passport', 'national_id', 'drivers_license', 'other'],
      },
      governmentIdNumber: String,
      governmentIdExpiry: Date,
      governmentIdDocument: {
        url: String,
        uploadedAt: Date,
        verified: Boolean,
      },
      facialRecognition: {
        status: String,
        livenessCheck: Boolean,
        selfieUrl: String,
        uploadedAt: Date,
      },
      completed: Boolean,
      completedAt: Date,
    },
    // Level 2 - Address Verification
    level2: {
      address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
      },
      addressProof: {
        type: String,
        enum: ['utility_bill', 'bank_statement', 'rental_agreement', 'government_document'],
      },
      addressProofDocument: {
        url: String,
        uploadedAt: Date,
        verified: Boolean,
      },
      proofDate: Date,
      completed: Boolean,
      completedAt: Date,
    },
    // Level 3 - Enhanced Verification (Business/High-Risk)
    level3: {
      businessName: String,
      businessRegistration: String,
      businessType: String,
      businessDocuments: [
        {
          type: String,
          url: String,
          uploadedAt: Date,
          verified: Boolean,
        },
      ],
      businessOwners: [
        {
          name: String,
          ownership: Number,
          idType: String,
          idNumber: String,
        },
      ],
      sourceOfFunds: {
        description: String,
        documentUrl: String,
      },
      politicallyExposedPerson: Boolean,
      pepDetails: String,
      sanctions: {
        checked: Boolean,
        result: String,
        checkDate: Date,
      },
      completed: Boolean,
      completedAt: Date,
    },
    // Risk Assessment
    riskAssessment: {
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      riskCategory: {
        type: String,
        enum: ['low', 'medium', 'high', 'very_high'],
      },
      riskFactors: [String],
      amlCheck: {
        status: String,
        result: String,
        checkDate: Date,
      },
      fraudeCheck: {
        status: String,
        result: String,
        checkDate: Date,
      },
      monitoringRequired: Boolean,
      notes: String,
    },
    // Compliance Data
    complianceData: {
      pep: {
        isPep: Boolean,
        pepType: String,
        pepCountry: String,
      },
      sanctions: {
        onSanctionsList: Boolean,
        sanctionListType: String,
      },
      aml: {
        amlStatus: String,
        amlMatch: Boolean,
      },
      lastReviewDate: Date,
      nextReviewDate: Date,
    },
    // Approval Limits
    approvalLimits: {
      dailyLimit: Number,
      monthlyLimit: Number,
      yearlyLimit: Number,
      transactionLimit: Number,
    },
    documents: [
      {
        documentType: String,
        url: String,
        uploadedAt: Date,
        verified: Boolean,
        description: String,
      },
    ],
    verificationHistory: [
      {
        action: String,
        status: String,
        timestamp: Date,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    flags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
kycSchema.index({ userId: 1 });
kycSchema.index({ status: 1 });
kycSchema.index({ kycLevel: 1 });
kycSchema.index({ createdAt: -1 });
kycSchema.index({ 'riskAssessment.overallScore': 1 });

export default mongoose.model('KYC', kycSchema);
