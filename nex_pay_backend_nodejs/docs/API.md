# N3X PAY REST API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
Use JWT Bearer token in Authorization header:
```
Authorization: Bearer {jwt_token}
```

## Response Format
All responses follow this format:
```json
{
  "success": boolean,
  "data": {...},
  "error": {...}
}
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### 2. Login
**POST** `/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

### 3. Refresh Token
**POST** `/auth/refresh-token`

Request:
```json
{
  "refreshToken": "refresh_token_value"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token"
  }
}
```

---

## KYC Endpoints

### 4. Initiate KYC
**POST** `/kyc/initiate`

Headers: `Authorization: Bearer {token}`

Request:
```json
{
  "identityType": "passport",
  "identityNumber": "AB123456",
  "documentBase64": "base64_encoded_document"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "kycId": "uuid",
    "status": "pending",
    "expiresAt": "2026-03-03T12:00:00Z"
  }
}
```

### 5. Get KYC Status
**GET** `/kyc/status/{kycId}`

Headers: `Authorization: Bearer {token}`

Response (200):
```json
{
  "success": true,
  "data": {
    "kycId": "uuid",
    "status": "verified",
    "verifiedAt": "2026-02-01T12:00:00Z",
    "expiresAt": "2027-02-01T12:00:00Z"
  }
}
```

---

## Wallet Endpoints

### 6. Create Dual Wallet
**POST** `/wallets/create`

Headers: `Authorization: Bearer {token}`

Response (201):
```json
{
  "success": true,
  "data": {
    "wallets": {
      "fiat": {
        "walletId": "uuid",
        "walletAddress": "FIAT_ABC123",
        "type": "fiat",
        "currency": "USD",
        "balance": 0
      },
      "crypto": {
        "walletId": "uuid",
        "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42470",
        "type": "crypto",
        "currency": "ETH",
        "balance": 0
      }
    }
  }
}
```

### 7. Get User Wallets
**GET** `/wallets/{userId}`

Headers: `Authorization: Bearer {token}`

Response (200):
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "walletId": "uuid",
        "type": "fiat",
        "currency": "USD",
        "balance": 5000,
        "status": "active"
      },
      {
        "walletId": "uuid",
        "type": "crypto",
        "currency": "ETH",
        "balance": 2.5,
        "status": "active"
      }
    ]
  }
}
```

### 8. Get Wallet Balance
**GET** `/wallets/{walletId}/balance`

Headers: `Authorization: Bearer {token}`

Response (200):
```json
{
  "success": true,
  "data": {
    "walletId": "uuid",
    "balance": 5000,
    "currency": "USD",
    "lastUpdated": "2026-02-01T12:00:00Z"
  }
}
```

---

## Payment Endpoints

### 9. Get Payment Quote
**GET** `/payments/quote`

Query Parameters:
```
amount=100
currencyFrom=USD
currencyTo=EUR
```

Response (200):
```json
{
  "success": true,
  "data": {
    "quote": {
      "amount": 100,
      "currencyFrom": "USD",
      "currencyTo": "EUR",
      "exchangeRate": 0.92,
      "receivedAmount": 92,
      "platformFee": 1.5,
      "totalCost": 101.5,
      "validUntil": "2026-02-01T12:05:00Z"
    }
  }
}
```

### 10. Initiate Payment
**POST** `/payments/initiate`

Headers: `Authorization: Bearer {token}`

Request:
```json
{
  "senderId": "uuid",
  "recipientId": "uuid",
  "amount": 100,
  "currencyFrom": "USD",
  "currencyTo": "EUR",
  "transactionType": "domestic"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "transaction": {
      "transactionId": "uuid",
      "status": "pending",
      "amount": 100,
      "currencyFrom": "USD",
      "currencyTo": "EUR",
      "receivedAmount": 92,
      "exchangeRate": 0.92,
      "createdAt": "2026-02-01T12:00:00Z"
    },
    "timeout": 3000
  }
}
```

---

## Transaction Endpoints

### 11. Get Transaction Details
**GET** `/transactions/{transactionId}`

Headers: `Authorization: Bearer {token}`

Response (200):
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "status": "settled",
    "senderId": "uuid",
    "recipientId": "uuid",
    "amount": 100,
    "currencyFrom": "USD",
    "currencyTo": "EUR",
    "receivedAmount": 92,
    "exchangeRate": 0.92,
    "blockchainTxHash": "0x123abc...",
    "riskScore": 15,
    "processingTime": 2500,
    "createdAt": "2026-02-01T12:00:00Z",
    "settledAt": "2026-02-01T12:00:02.500Z"
  }
}
```

### 12. List Transactions
**GET** `/transactions`

Query Parameters:
```
userId=uuid&limit=20&offset=0&status=settled
```

Headers: `Authorization: Bearer {token}`

Response (200):
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Analytics Endpoints

### 13. Get Metrics
**GET** `/analytics/metrics`

Query Parameters:
```
dateFrom=2026-01-01&dateTo=2026-02-01
```

Headers: `Authorization: Bearer {token}`

Response (200):
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalTransactions": 5000,
      "totalVolume": 500000,
      "successfulTransactions": 4950,
      "failedTransactions": 50,
      "averageProcessingTime": 2500,
      "averageRiskScore": 25
    },
    "dateRange": {
      "from": "2026-01-01",
      "to": "2026-02-01"
    }
  }
}
```

### 14. Get Risk Scores
**GET** `/analytics/risk-scores`

Query Parameters:
```
userId=uuid&limit=10
```

Headers: `Authorization: Bearer {token}`

Response (200):
```json
{
  "success": true,
  "data": {
    "riskScores": [
      {
        "transactionId": "uuid",
        "riskScore": 35,
        "riskLevel": "medium",
        "factors": ["high_amount", "cross_border"],
        "timestamp": "2026-02-01T12:00:00Z"
      }
    ]
  }
}
```

---

## Merchant Endpoints

### 15. Register Merchant
**POST** `/merchants/register`

Headers: `Authorization: Bearer {token}`

Request:
```json
{
  "businessName": "Acme Corp",
  "businessType": "retail",
  "taxId": "12-3456789",
  "settlementWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f42470",
  "webhook": "https://merchant.example.com/webhook"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "merchantId": "uuid",
    "apiKey": "nxp_test_abc123...",
    "status": "active"
  }
}
```

### 16. Get Merchant Details
**GET** `/merchants/{merchantId}`

Headers: 
```
Authorization: Bearer {token}
X-API-Key: {apiKey}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "merchantId": "uuid",
    "businessName": "Acme Corp",
    "status": "active",
    "totalTransactions": 1250,
    "totalVolume": 125000,
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

---

## Admin Endpoints

### 17. Get System Status
**GET** `/admin/system-status`

Headers:
```
Authorization: Bearer {token}
X-API-Key: {apiKey}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "database": "connected",
    "redis": "connected",
    "blockchain": "connected",
    "uptime": 86400,
    "memoryUsage": "256MB",
    "cpuUsage": "15%"
  }
}
```

### 18. Get User Statistics
**GET** `/admin/users-stats`

Headers:
```
Authorization: Bearer {token}
X-API-Key: {apiKey}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "totalUsers": 10000,
    "kycPending": 500,
    "kycVerified": 9000,
    "kycRejected": 500,
    "activeTransactions": 250,
    "totalVolume": 5000000,
    "lastUpdated": "2026-02-01T12:00:00Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": ["email is required", "password must be at least 8 characters"]
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers Returned**:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: 1675161600

---

## Webhooks

### Transaction Settlement Webhook

N3X PAY sends POST requests to merchant webhook URLs:

```json
{
  "event": "transaction.settled",
  "timestamp": "2026-02-01T12:00:00Z",
  "data": {
    "transactionId": "uuid",
    "merchantId": "uuid",
    "amount": 100,
    "currency": "USD",
    "status": "settled",
    "blockchainTxHash": "0x123abc..."
  },
  "signature": "sha256_hmac_signature"
}
```

Verify webhook signature:
```javascript
const signature = req.headers['x-nexpay-signature'];
const body = JSON.stringify(req.body);
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(body)
  .digest('hex');

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

---

## Testing with cURL

### Register User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Get Payment Quote
```bash
curl http://localhost:3000/api/v1/payments/quote \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -G \
  --data-urlencode "amount=100" \
  --data-urlencode "currencyFrom=USD" \
  --data-urlencode "currencyTo=EUR"
```

---

**Version**: 1.0.0  
**Last Updated**: February 1, 2026  
**API Stability**: Production
