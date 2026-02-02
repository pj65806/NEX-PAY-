# Developer Quick Reference Guide

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Compile smart contracts
npm run compile-contracts

# Deploy smart contracts
npm run deploy-contracts
```

## Project Structure at a Glance

```
src/
├── config/        → Database, Redis, Logger, Encryption configs
├── models/        → MongoDB schemas (User, Wallet, Transaction, KYC)
├── controllers/   → Business logic (Auth, User, Wallet, Payment, KYC)
├── routes/        → API endpoints
├── middleware/    → Authentication, validation, error handling
├── services/      → Service layer (Payment, Wallet, KYC, Analytics)
├── utils/         → Helpers (validators, encryption, error handling)
└── index.js       → Entry point
```

## Environment Variables

### Critical Settings
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
MONGODB_URI=mongodb://localhost:27017/nex_pay
REDIS_HOST=localhost
```

## Database Models Overview

### User
- Email, password, personal info
- KYC status, account type
- 2FA settings
- Login tracking

### Wallet
- User balance (fiat + crypto)
- Transaction history
- Linked accounts
- Transaction limits
- Freeze status

### Transaction
- Payment details
- Exchange rates & fees
- Status tracking
- Blockchain data
- Risk assessment

### KYC
- Multi-level verification
- Document uploads
- Risk scoring
- Compliance checks

## API Endpoint Quick Reference

### Authentication (`/api/v1/auth`)
- `POST /register` - New user registration
- `POST /login` - User login
- `POST /refresh-token` - Get new access token
- `POST /verify-email` - Verify email
- `POST /request-password-reset` - Request password reset
- `POST /reset-password` - Reset password
- `POST /logout` - Logout (auth required)

### Users (`/api/v1/users`) - Auth Required
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `POST /change-password` - Change password
- `GET /wallet` - Get wallet info
- `GET /kyc-status` - Check KYC status
- `GET /transactions` - Transaction history
- `POST /2fa/enable` - Enable 2FA
- `POST /2fa/disable` - Disable 2FA
- `DELETE /account` - Delete account

### Wallets (`/api/v1/wallets`) - Auth + Email Verified Required
- `GET /balance` - Get balance
- `GET /details` - Get wallet details
- `POST /bank-accounts` - Link bank account
- `DELETE /bank-accounts/:id` - Remove bank account
- `POST /bank-accounts/primary` - Set primary bank
- `POST /crypto-addresses` - Link crypto address
- `GET /transactions` - Transaction history
- `POST /freeze` - Freeze wallet

### Payments (`/api/v1/payments`) - Auth + Email Verified Required
- `POST /initiate` - Start payment
- `POST /confirm` - Confirm payment
- `POST /cancel` - Cancel payment
- `GET /:transactionId` - Get transaction details
- `GET /` - Get payment history

### Transactions (`/api/v1/transactions`) - Auth Required
- `GET /:transactionId` - Get details
- `GET /` - List transactions

### KYC (`/api/v1/kyc`) - Auth + Email Verified Required
- `GET /status` - Get KYC status
- `POST /level1` - Submit Level 1
- `POST /level2` - Submit Level 2
- `POST /level3` - Submit Level 3
- `POST /documents` - Upload document
- `GET /limits` - Get approval limits

### Admin (`/api/v1/admin`) - Admin Auth Required
- `GET /system-status` - System health
- `GET /users-stats` - User statistics
- `GET /users` - List all users
- `PUT /users/:id/kyc-status` - Update KYC
- `POST /users/:id/suspend` - Suspend user
- `GET /transactions` - List all transactions
- `POST /transactions/:id/flag` - Flag transaction
- `GET /compliance` - Compliance reports

## Common Code Patterns

### Middleware Stack (from index.js)
```javascript
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON
app.use(rateLimiter); // Rate limiting
app.use('/api/v1/admin', apiKeyValidator); // API key check
```

### Authentication Pattern
```javascript
// Routes requiring auth
router.post('/endpoint', authenticate, controller.method);

// Routes requiring specific role
router.get('/admin', authenticate, requireAdmin, controller.method);

// Routes requiring KYC
router.post('/payment', authenticate, requireKYC(2), controller.method);
```

### Error Response Pattern
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Success Response Pattern
```json
{
  "success": true,
  "message": "Operation successful",
  "code": "SUCCESS_CODE",
  "data": { /* response data */ }
}
```

## Security Checklist

- ✅ JWT tokens for authentication
- ✅ Password hashing with bcryptjs
- ✅ Data encryption (AES)
- ✅ Rate limiting
- ✅ CORS configured
- ✅ Helmet security headers
- ✅ Input validation with Joi
- ✅ Account lockout after failed attempts
- ✅ Session management with Redis
- ✅ Error message sanitization

## Performance Optimization

### Caching Strategy
- User data: 1 hour
- Exchange rates: 15 minutes
- Transaction details: 1 hour
- Wallet data: 1 hour

### Database Indexing
- User: email, phoneNumber, walletAddress, createdAt
- Wallet: userId, walletAddress, totalBalance, createdAt
- Transaction: transactionId, senderId, recipientId, status, createdAt
- KYC: userId, status, kycLevel, createdAt

### Rate Limiting
- Global: 100 req/min
- Per user: 1000 req/hour
- Payments: 10 req/min

## Testing Examples

```bash
# Test registration
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","firstName":"Test","lastName":"User","phoneNumber":"+1234567890","dateOfBirth":"1990-01-01","nationality":"US"}'

# Test login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer <token>"
```

## Debugging Tips

1. **Check logs**: `tail -f logs/app.log`
2. **MongoDB**: Use MongoDB Compass for inspection
3. **Redis**: Use `redis-cli` to check cache
4. **Network**: Use Postman or Insomnia for API testing
5. **Environment**: Verify all `.env` variables are set

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| MongoDB connection error | Ensure MongoDB is running on localhost:27017 |
| Redis connection error | Ensure Redis is running on localhost:6379 |
| CORS errors | Check CORS_ORIGIN in .env |
| JWT validation error | Verify JWT_SECRET is set and matches |
| Rate limit exceeded | Wait for reset window (default: 1 minute) |
| Invalid email format | Use valid email (foo@bar.com) |
| Password too short | Minimum 8 characters required |

## Next Steps for Enhancement

1. **Blockchain Integration** - Complete Ethereum settlement
2. **Real-time Notifications** - WebSocket or push notifications
3. **Advanced Analytics** - Dashboard with charts and insights
4. **Mobile App Backend** - Optimize for mobile clients
5. **Microservices** - Break into smaller services
6. **Message Queue** - Async processing with RabbitMQ/Kafka
7. **GraphQL API** - Alternative to REST
8. **AI/ML** - Fraud detection and risk assessment

## Resources

- API Documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Implementation Details: [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)
- Main README: [README.md](./README.md)
- Express.js: https://expressjs.com/
- MongoDB: https://docs.mongodb.com/
- JWT: https://jwt.io/
