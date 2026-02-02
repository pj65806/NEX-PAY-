# Blockchain Integration Guide - N3X PAY

## Overview

N3X PAY uses Solidity smart contracts deployed on Ethereum Sepolia testnet to enable immutable transaction recording and settlement verification.

## Network Details

### Sepolia Testnet
- **Chain ID**: 11155111
- **RPC Endpoint**: https://sepolia.infura.io/v3/{INFURA_KEY}
- **Block Explorer**: https://sepolia.etherscan.io/
- **Faucet**: https://www.sepoliafaucet.io/

## Smart Contract Architecture

### NexPaySettlement Contract

Deployed to Sepolia for:
- Recording transactions immutably
- Tracking settlement status
- Verifying transaction proofs
- Managing transaction history

## Contract Functions

### 1. recordTransaction()
```solidity
function recordTransaction(
    bytes32 _transactionId,
    address _sender,
    address _recipient,
    uint256 _amount,
    string memory _assetType
) external onlyController returns (bool)
```

**Purpose**: Record a payment transaction on-chain

**Parameters**:
- `_transactionId`: UUID of the transaction
- `_sender`: Ethereum address of sender
- `_recipient`: Ethereum address of recipient
- `_amount`: Transaction amount (in wei for ETH)
- `_assetType`: Asset type (ETH, USDC, etc.)

**Example**:
```javascript
const txHash = await contract.recordTransaction(
  ethers.id('tx-uuid-123'),
  senderAddress,
  recipientAddress,
  ethers.parseUnits('100', 6), // For USDC (6 decimals)
  'USDC'
);
```

### 2. settleTransaction()
```solidity
function settleTransaction(
    bytes32 _transactionId,
    uint256 _settledAmount
) external onlyController returns (bool)
```

**Purpose**: Mark a transaction as settled

**Parameters**:
- `_transactionId`: Transaction to settle
- `_settledAmount`: Amount settled

**Example**:
```javascript
await contract.settleTransaction(
  transactionId,
  ethers.parseUnits('100', 6)
);
```

### 3. failTransaction()
```solidity
function failTransaction(bytes32 _transactionId) external onlyController returns (bool)
```

**Purpose**: Mark a transaction as failed

### 4. verifySettlement()
```solidity
function verifySettlement(bytes32 _transactionId) 
    external view returns (bool isSettled, uint256 settledAmount)
```

**Purpose**: Verify if a transaction is settled

**Returns**:
- `isSettled`: Boolean indicating settlement status
- `settledAmount`: Amount that was settled

## Deployment Steps

### 1. Setup Environment

```bash
cd nex_pay_backend_nodejs

# Install dependencies
npm install

# Create .env with Sepolia configuration
cp .env.example .env

# Edit .env:
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# PRIVATE_KEY=0x... (private key without 0x prefix)
```

### 2. Get Testnet ETH

1. Go to https://www.sepoliafaucet.io/
2. Enter your wallet address
3. Receive 0.5 ETH testnet tokens

### 3. Compile Smart Contract

```bash
npm run compile-contracts
```

Expected output:
```
Compiling 1 file with 0.8.20
Compilation successful
```

### 4. Deploy to Sepolia

```bash
npm run deploy-contracts
```

Expected output:
```
Deploying NexPaySettlement contract to Sepolia...
NexPaySettlement deployed to: 0x742d35Cc6634C0532925a3b844Bc9e7595f42470

Add this to your .env file:
CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42470
```

### 5. Update .env

```env
CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f42470
```

### 6. Verify on Etherscan (Optional)

```bash
npx hardhat verify --network sepolia 0x742d35Cc6634C0532925a3b844Bc9e7595f42470
```

## Integration with Backend

### Recording a Transaction

```javascript
import BlockchainService from './src/blockchain/BlockchainService.js';

// Record transaction on-chain
const settlementProof = await BlockchainService.settlementTransaction({
  transactionId: 'uuid-123',
  senderAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f42470',
  recipientAddress: '0x123456789abcdef0123456789abcdef0123456789',
  amount: '100',
  assetType: 'USDC',
});

console.log('Blockchain TX Hash:', settlementProof.blockchainTxHash);
```

### Verifying Settlement

```javascript
import BlockchainService from './src/blockchain/BlockchainService.js';

// Verify transaction is settled
const verification = await BlockchainService.verifyTransaction(txHash);

if (verification.success) {
  console.log('Transaction confirmed on block:', verification.blockNumber);
}
```

## Oracle Integration

### Getting Exchange Rates

```javascript
import OracleService from './src/blockchain/OracleService.js';

// Get ETH/USD rate
const rate = await OracleService.getExchangeRate('ethereum', 'usd');
console.log('ETH/USD:', rate);

// Get USDC/EUR rate
const euRate = await OracleService.getExchangeRate('usd-coin', 'eur');
console.log('USDC/EUR:', euRate);
```

### Fallback Rates

If oracle fails, fallback rates are used:
- ETH:USD = 2000
- USD:ETH = 0.0005
- USDC:USD = 1.0
- USD:USDC = 1.0
- EUR:USD = 1.09
- USD:EUR = 0.92

## Transaction Flow

### 1. User Initiates Payment
```
User → Backend → Payment Service
```

### 2. Backend Records on Blockchain
```
Backend → Smart Contract → recordTransaction()
```

### 3. Backend Settles Transaction
```
Backend → Smart Contract → settleTransaction()
```

### 4. Verification
```
User → Backend → blockchainTxHash
Backend → verifyTransaction(txHash)
```

## Testing Transactions

### Test Scenario 1: Successful Domestic Transaction

```bash
curl -X POST http://localhost:3000/api/v1/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "senderId": "uuid-1",
    "recipientId": "uuid-2",
    "amount": 100,
    "currencyFrom": "USD",
    "currencyTo": "EUR",
    "transactionType": "domestic"
  }'
```

Expected response:
```json
{
  "success": true,
  "transaction": {
    "transactionId": "uuid-123",
    "status": "pending",
    "blockchainTxHash": "0x123abc..."
  },
  "timeout": 3000
}
```

### Test Scenario 2: Cross-Border Transaction

```bash
curl -X POST http://localhost:3000/api/v1/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "senderId": "uuid-1",
    "recipientId": "uuid-2",
    "amount": 5000,
    "currencyFrom": "USD",
    "currencyTo": "EUR",
    "transactionType": "cross_border"
  }'
```

## Monitoring Transactions

### View Recent Transactions on Etherscan

```
https://sepolia.etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc9e7595f42470
```

### Get Transaction Details

```bash
# Replace TX_HASH with actual transaction hash
curl https://sepolia.infura.io/v3/YOUR_INFURA_KEY \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getTransactionReceipt",
    "params": ["0xTX_HASH"],
    "id": 1
  }'
```

## Gas Management

### Gas Limits

- `recordTransaction()`: ~150,000 gas
- `settleTransaction()`: ~120,000 gas
- `failTransaction()`: ~100,000 gas

### Gas Price Adjustment

Update in `.env`:
```env
GAS_PRICE=20  # in gwei
GAS_LIMIT=200000
```

Current Sepolia gas prices: https://sepolia.etherscan.io/gastracker

## Production Deployment (Mainnet)

### Prerequisites

1. Deploy to Ethereum mainnet (not recommended for MVP)
2. Use mainnet RPC provider (Infura, Alchemy, etc.)
3. Use production private key (secure vault required)
4. Configure mainnet network in `hardhat.config.js`

### Migration to Mainnet

```javascript
// Update hardhat.config.js
module.exports = {
  networks: {
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      accounts: [process.env.MAINNET_PRIVATE_KEY],
      chainId: 1,
    },
  },
};
```

Deploy:
```bash
npx hardhat run contracts/deploy.js --network mainnet
```

## Troubleshooting

### Issue: "Contract address is required"
**Solution**: Make sure `CONTRACT_ADDRESS` is set in `.env`

### Issue: "Transaction reverted"
**Solution**: Check:
- Gas limit is sufficient
- Account has enough ETH for gas
- Contract state hasn't changed

### Issue: "Invalid RPC provider"
**Solution**: Verify Infura key is valid at https://infura.io/

### Issue: "Private key error"
**Solution**: Ensure private key format is correct (without 0x prefix)

## Security Notes

- Never commit `.env` with private keys
- Use hardware wallet for production keys
- Test on Sepolia before mainnet deployment
- Monitor contract for unusual activity
- Keep contract ABI updated

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/)
- [Sepolia Testnet Info](https://ethereum.org/en/developers/docs/networks/#sepolia)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)

---

**Version**: 1.0.0  
**Last Updated**: February 1, 2026  
**Status**: Production Ready for Sepolia Testnet
