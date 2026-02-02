# NexPay Backend API Documentation

## Overview
NexPay is a hybrid digital payment platform that supports both fiat and cryptocurrency transactions with blockchain integration.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints (`/auth`)

### Register User
**POST** `/auth/register`
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-01-15",
  "nationality": "US"
}
```
**Response:** 201 Created

### Login
**POST** `/auth/login`
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response:** 200 OK with `accessToken` and `refreshToken`

### Refresh Token
**POST** `/auth/refresh-token`
```json
{
  "refreshToken": "<refresh_token>"
}
```
**Response:** 200 OK with new `accessToken`

### Verify Email
**POST** `/auth/verify-email`
```json
{
  "token": "<verification_token>"
}
```
**Response:** 200 OK

### Request Password Reset
**POST** `/auth/request-password-reset`
```json
{
  "email": "user@example.com"
}
```
**Response:** 200 OK

### Reset Password
**POST** `/auth/reset-password`
```json
{
  "token": "<reset_token>",
  "newPassword": "NewSecurePass123!"
}
```
**Response:** 200 OK

### Logout
**POST** `/auth/logout` (Requires Authentication)
**Response:** 200 OK

---

## User Endpoints (`/users`)

All user endpoints require authentication.

### Get Profile
**GET** `/users/profile`
**Response:** 200 OK with user data

### Update Profile
**PUT** `/users/profile`
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  }
}
```
**Response:** 200 OK

### Change Password
**POST** `/users/change-password`
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```
**Response:** 200 OK

### Get Wallet Info
**GET** `/users/wallet`
**Response:** 200 OK with wallet data

### Get KYC Status
**GET** `/users/kyc-status`
**Response:** 200 OK with KYC information

### Get Transactions
**GET** `/users/transactions?skip=0&limit=10&status=completed`
**Response:** 200 OK with transaction list

### Enable 2FA
**POST** `/users/2fa/enable`
**Response:** 201 Created with secret

### Disable 2FA
**POST** `/users/2fa/disable`
```json
{
  "password": "UserPassword123!"
}
```
**Response:** 200 OK

### Delete Account
**DELETE** `/users/account`
```json
{
  "password": "UserPassword123!"
}
```
**Response:** 200 OK

---

## Wallet Endpoints (`/wallets`)

All wallet endpoints require authentication and email verification.

### Get Balance
**GET** `/wallets/balance`
**Response:** 200 OK with balance information

### Get Wallet Details
**GET** `/wallets/details`
**Response:** 200 OK with full wallet details

### Link Bank Account
**POST** `/wallets/bank-accounts`
```json
{
  "accountNumber": "1234567890",
  "bankCode": "001",
  "accountName": "John Doe"
}
```
**Response:** 201 Created

### Remove Bank Account
**DELETE** `/wallets/bank-accounts/{accountId}`
**Response:** 200 OK

### Set Primary Bank Account
**POST** `/wallets/bank-accounts/primary`
```json
{
  "accountId": "001-1234567890"
}
```
**Response:** 200 OK

### Link Crypto Address
**POST** `/wallets/crypto-addresses`
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f123456",
  "blockchain": "ethereum"
}
```
**Response:** 201 Created

### Get Transaction History
**GET** `/wallets/transactions?skip=0&limit=20`
**Response:** 200 OK with transactions

### Freeze Wallet
**POST** `/wallets/freeze`
```json
{
  "reason": "Suspicious activity detected"
}
```
**Response:** 200 OK

---

## Payment Endpoints (`/payments`)

All payment endpoints require authentication and email verification.

### Initiate Payment
**POST** `/payments/initiate`
```json
{
  "recipientId": "user-id",
  "amount": 100,
  "currencyFrom": "USD",
  "currencyTo": "NGN",
  "description": "Payment for services"
}
```
**Response:** 201 Created with `transactionId`

### Confirm Payment
**POST** `/payments/confirm`
```json
{
  "transactionId": "txn-id",
  "otp": "123456"
}
```
**Response:** 200 OK

### Cancel Payment
**POST** `/payments/cancel`
```json
{
  "transactionId": "txn-id"
}
```
**Response:** 200 OK

### Get Transaction Details
**GET** `/payments/{transactionId}`
**Response:** 200 OK with transaction data

### Get Payment History
**GET** `/payments?skip=0&limit=20&status=completed`
**Response:** 200 OK with history

---

## Transaction Endpoints (`/transactions`)

### Get Transaction Details
**GET** `/transactions/{transactionId}`
**Response:** 200 OK

### Get Transaction History
**GET** `/transactions?skip=0&limit=20`
**Response:** 200 OK with pagination

---

## KYC Endpoints (`/kyc`)

All KYC endpoints require authentication and email verification.

### Get KYC Status
**GET** `/kyc/status`
**Response:** 200 OK

### Submit KYC Level 1
**POST** `/kyc/level1`
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "nationality": "US",
  "governmentIdType": "passport",
  "governmentIdNumber": "ABC123456",
  "governmentIdExpiry": "2030-01-15",
  "governmentIdDocument": "https://...",
  "selfieUrl": "https://..."
}
```
**Response:** 200 OK

### Submit KYC Level 2
**POST** `/kyc/level2`
```json
{
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "country": "US"
  },
  "addressProof": "utility_bill",
  "addressProofDocument": "https://...",
  "proofDate": "2024-01-15"
}
```
**Response:** 200 OK

### Submit KYC Level 3
**POST** `/kyc/level3`
```json
{
  "businessName": "John's LLC",
  "businessRegistration": "REG123",
  "businessType": "LLC",
  "sourceOfFunds": "Business income"
}
```
**Response:** 200 OK

### Upload Document
**POST** `/kyc/documents`
```json
{
  "documentType": "bank_statement",
  "documentUrl": "https://...",
  "description": "3-month bank statement"
}
```
**Response:** 201 Created

### Get Approval Limits
**GET** `/kyc/limits`
**Response:** 200 OK with transaction limits

---

## Analytics Endpoints (`/analytics`)

All analytics endpoints require authentication.

### Get Metrics
**GET** `/analytics/metrics`
**Response:** 200 OK with user metrics

### Get Risk Scores
**GET** `/analytics/risk-scores`
**Response:** 200 OK with risk information

### Get Dashboard
**GET** `/analytics/dashboard`
**Response:** 200 OK with dashboard statistics

---

## Admin Endpoints (`/admin`)

All admin endpoints require authentication and admin privileges.

### System Status
**GET** `/admin/system-status`
**Response:** 200 OK

### Users Statistics
**GET** `/admin/users-stats`
**Response:** 200 OK

### Get All Users
**GET** `/admin/users?skip=0&limit=20`
**Response:** 200 OK

### Update User KYC Status
**PUT** `/admin/users/{userId}/kyc-status`
```json
{
  "kycLevel": 2,
  "status": "approved",
  "notes": "Verified"
}
```
**Response:** 200 OK

### Suspend User
**POST** `/admin/users/{userId}/suspend`
**Response:** 200 OK

### Get Transactions
**GET** `/admin/transactions`
**Response:** 200 OK

### Flag Transaction
**POST** `/admin/transactions/{transactionId}/flag`
**Response:** 200 OK

### Get Compliance Reports
**GET** `/admin/compliance`
**Response:** 200 OK

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400)
- `INVALID_CREDENTIALS` (401)
- `INVALID_TOKEN` (401)
- `TOKEN_EXPIRED` (401)
- `INSUFFICIENT_PERMISSIONS` (403)
- `ACCOUNT_INACTIVE` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_ERROR` (500)

---

## Rate Limiting
- Global: 100 requests per minute per IP
- User-based: 1000 requests per hour per user
- Payment operations: 10 per minute per user

---

## Status Codes
- `200` OK
- `201` Created
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict
- `429` Too Many Requests
- `500` Internal Server Error

---

## Webhook Events (Future)
- `transaction.initiated`
- `transaction.completed`
- `transaction.failed`
- `user.kyc.submitted`
- `user.kyc.approved`
- `user.kyc.rejected`
- `user.account.suspended`
