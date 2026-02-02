# N3X PAY Backend - Complete Implementation Guide

## Project Overview

N3X PAY is a production-grade, hybrid digital payment platform backend supporting fiat-to-crypto and crypto-to-fiat transactions with blockchain settlement on Sepolia testnet.

### Key Features
- ✅ Multi-layer architecture with Express.js + Node.js
- ✅ MongoDB for persistent data storage with Redis caching
- ✅ JWT-based authentication with AES-256 encryption
- ✅ E-KYC workflow with identity verification
- ✅ Dual wallet engine (fiat + crypto wallets per user)
- ✅ Payment core with real-time conversion and oracle integration
- ✅ Solidity 0.8.x smart contracts on Sepolia
- ✅ Analytics and risk engine with velocity tracking
- ✅ Merchant and admin APIs with webhooks
- ✅ Rate limiting, OWASP security controls
- ✅ Transaction latency < 3s (domestic) / < 15s (cross-border)

## Prerequisites

### System Requirements
- Node.js 18.x or higher
- npm 9.x or higher
- MongoDB 5.x or higher (local or Atlas)
- Redis 6.x or higher
- Git

### Installation Steps

#### 1. Install Node.js and npm
**Windows:**
```bash
# Download from https://nodejs.org/
# Or use winget:
winget install OpenJS.NodeJS
```

**macOS:**
```bash
brew install node
```

**Linux:**
```bash
sudo apt-get install nodejs npm
```

Verify installation:
```bash
node --version
npm --version
```

#### 2. Install MongoDB Locally (Optional)

**Windows:**
```bash
# Download from https://www.mongodb.com/try/download/community
# Or use Chocolatey:
choco install mongodb-community
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

**Linux:**
```bash
sudo apt-get install -y mongodb
```

Or use MongoDB Atlas (cloud):
- Create account at https://www.mongodb.com/cloud/atlas
- Create a cluster and get connection string
- Update `MONGODB_URI` in `.env`

#### 3. Install Redis Locally (Optional)

**Windows:**
```bash
# Use WSL2 or Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

**macOS:**
```bash
brew install redis
```

**Linux:**
```bash
sudo apt-get install redis-server
```

Or use Redis Cloud:
- Create account at https://redis.com/cloud/
- Update `REDIS_HOST` and `REDIS_PORT` in `.env`

## Setup Instructions

### 1. Clone and Setup Project

```bash
cd d:\projects\12\nex_pay_backend_nodejs
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
# Development
NODE_ENV=development
PORT=3000

# Database (if using local MongoDB)
MONGODB_URI=mongodb://localhost:27017/nex_pay

# Redis (if using local Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT & Security (generate new keys for production)
JWT_SECRET=$(openssl rand -base64 32)
AES_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Blockchain - For Sepolia testnet
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here

# Optional - Cloud services
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nex_pay
```

### 3. Start Services

**MongoDB:**
```bash
# If installed locally
mongod
```

**Redis:**
```bash
# If installed locally
redis-server
```

### 4. Run Development Server

```bash
npm run dev
```

Expected output:
```
N3X PAY Backend Server running on port 3000
Environment: development
Blockchain Network: sepolia
Connected to MongoDB
Connected to Redis
```

### 5. Verify Installation

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T12:00:00.000Z",
  "environment": "development"
}
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh-token` - Refresh JWT token

### KYC & Users
- `POST /api/v1/kyc/initiate` - Start KYC process
- `GET /api/v1/kyc/status/:kycId` - Check KYC status
- `GET /api/v1/users/:userId` - Get user details

### Wallets & Payments
- `GET /api/v1/wallets/:userId` - Get user wallets
- `POST /api/v1/wallets/create` - Create dual wallet
- `POST /api/v1/payments/initiate` - Initiate payment
- `GET /api/v1/payments/quote` - Get conversion quote

### Transactions & Analytics
- `GET /api/v1/transactions/:transactionId` - Get transaction details
- `GET /api/v1/transactions` - List transactions
- `GET /api/v1/analytics/metrics` - Get performance metrics
- `GET /api/v1/analytics/risk-scores` - Get risk scores

### Merchant APIs
- `POST /api/v1/merchants/register` - Register merchant
- `GET /api/v1/merchants/:merchantId` - Get merchant details

### Admin APIs (requires API key)
- `GET /api/v1/admin/system-status` - System status
- `GET /api/v1/admin/users-stats` - User statistics

## Project Structure

```
nex_pay_backend_nodejs/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # MongoDB connection
│   │   ├── redis.js         # Redis cache setup
│   │   ├── logger.js        # Winston logging
│   │   └── encryption.js    # AES & crypto utilities
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── authentication.js
│   │   └── apiKeyValidator.js
│   ├── routes/              # API route definitions
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── kycRoutes.js
│   │   ├── walletRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── merchantRoutes.js
│   │   └── adminRoutes.js
│   ├── controllers/         # Route handlers (to be implemented)
│   ├── services/            # Business logic
│   ├── models/              # MongoDB schemas
│   ├── utils/               # Utility functions
│   ├── blockchain/          # Web3 & contract interaction
│   └── index.js             # Main server file
├── contracts/               # Solidity smart contracts
├── migrations/              # Database migrations
├── tests/                   # Test files
├── docs/                    # API documentation
├── package.json
├── .env                     # Environment variables (not in git)
├── .env.example             # Example environment file
└── README.md
```

## Database Schemas

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  phone: String,
  passwordHash: String,
  firstName: String,
  lastName: String,
  role: String (enum: 'user', 'merchant', 'admin'),
  kycStatus: String (enum: 'pending', 'approved', 'rejected'),
  wallets: [ObjectId], // References to Wallet collection
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  isActive: Boolean
}
```

### KYC Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  identityType: String (enum: 'passport', 'national_id', 'license'),
  identityNumber: String,
  documentHash: String,
  status: String (enum: 'pending', 'verified', 'rejected'),
  verificationProof: String,
  createdAt: Date,
  verifiedAt: Date,
  expiresAt: Date
}
```

### Wallets Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  walletType: String (enum: 'fiat', 'crypto'),
  walletAddress: String (unique),
  balance: Decimal,
  currency: String (USD, EUR, ETH, USDC),
  blockchain: String (null for fiat, 'ethereum' for crypto),
  publicKey: String,
  encryptedPrivateKey: String, // AES-256 encrypted
  createdAt: Date,
  status: String (enum: 'active', 'frozen', 'closed')
}
```

### Transactions Collection
```javascript
{
  _id: ObjectId,
  transactionId: String (unique),
  senderId: ObjectId,
  recipientId: ObjectId,
  senderWalletId: ObjectId,
  recipientWalletId: ObjectId,
  amountSent: Decimal,
  amountReceived: Decimal,
  currencyFrom: String,
  currencyTo: String,
  exchangeRate: Decimal,
  status: String (enum: 'pending', 'processing', 'settled', 'failed'),
  transactionType: String (enum: 'fiat_to_crypto', 'crypto_to_fiat', 'domestic', 'cross_border'),
  blockchainTxHash: String, // On-chain transaction hash
  riskScore: Number (0-100),
  processingTime: Number, // milliseconds
  createdAt: Date,
  settledAt: Date,
  failureReason: String
}
```

## Smart Contract Deployment

### 1. Compile Contracts
```bash
npm run compile-contracts
```

### 2. Deploy to Sepolia
```bash
npm run deploy-contracts
```

### 3. Update Contract Address
After deployment, update `.env`:
```env
CONTRACT_ADDRESS=0x<your_deployed_contract_address>
```

## Security Checklist

- [x] JWT tokens with expiration
- [x] AES-256 encryption for sensitive data
- [x] Rate limiting (100 requests/15 min)
- [x] CORS configuration
- [x] Helmet for HTTP headers
- [x] Input validation with Joi
- [x] API key authentication for admin endpoints
- [x] Password hashing with bcryptjs
- [x] Secure MongoDB connection
- [x] Redis connection with optional password
- [ ] Enable HTTPS/TLS in production
- [ ] Implement DDoS protection
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable database backups
- [ ] Implement comprehensive audit logging

## Performance Targets

- Domestic transactions: < 3 seconds
- Cross-border transactions: < 15 seconds
- API response time: < 500ms
- Database query time: < 100ms
- Cache hit ratio: > 80%

## Monitoring & Logging

### Log Files
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs
- Max file size: 10MB, max 5-10 files

### View Logs
```bash
# Real-time error logs
tail -f logs/error.log

# Recent transactions
tail -100 logs/combined.log | grep "transaction"
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test -- --coverage
```

## Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Use strong JWT secrets (32+ characters)
3. Configure production database (MongoDB Atlas)
4. Set up production Redis (Redis Cloud)
5. Use real Infura key or private RPC endpoint
6. Enable HTTPS/TLS
7. Configure proper CORS origins
8. Set up monitoring and alerts
9. Enable database backups
10. Use PM2 for process management

### Using PM2
```bash
npm install -g pm2

pm2 start src/index.js --name "nex-pay-api"
pm2 logs
pm2 save
pm2 startup
```

### Docker Deployment
See `Dockerfile` for containerization

## Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongod --version
mongod

# Test connection
mongo mongodb://localhost:27017/nex_pay
```

### Redis Connection Error
```bash
# Check if Redis is running
redis-cli ping
# Expected: PONG
```

### Port Already in Use
```bash
# Change PORT in .env to 3001 or 3002
# Or kill process on port 3000:
lsof -i :3000
kill -9 <PID>
```

### JWT Secret Not Set
```bash
# Generate a new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_SECRET=<generated_secret>
```

## API Documentation

Full OpenAPI/Swagger documentation available at: `/api-docs`

Example requests in `docs/api-examples.md`

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Create Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Documentation: `docs/`
- API Issues: `docs/api-examples.md`
- Blockchain Issues: `docs/blockchain-setup.md`
- Contact: dev-team@nexpay.com

---

**Version:** 1.0.0  
**Last Updated:** February 1, 2026  
**Maintainer:** N3X PAY Development Team
#   N E X - P A Y -  
 