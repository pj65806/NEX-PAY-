// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NexPaySettlement
 * @dev N3X PAY Payment Settlement Contract for Sepolia Testnet
 * Handles immutable transaction recording and settlement verification
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract NexPaySettlement {
    // Structs
    struct Transaction {
        bytes32 transactionId;
        address sender;
        address recipient;
        uint256 amount;
        string assetType; // "ETH", "USDC", etc.
        uint256 timestamp;
        string status; // "pending", "settled", "failed"
        string blockchainTxHash;
    }

    struct Settlement {
        bytes32 transactionId;
        uint256 settledAmount;
        address settledBy;
        uint256 timestamp;
        bool isSuccessful;
    }

    // State variables
    mapping(bytes32 => Transaction) public transactions;
    mapping(bytes32 => Settlement) public settlements;
    mapping(address => bytes32[]) public userTransactions;
    
    address public owner;
    address public nexPayController;
    uint256 public transactionCount;
    uint256 public totalSettledAmount;

    // Events
    event TransactionRecorded(
        bytes32 indexed transactionId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string assetType,
        uint256 timestamp
    );

    event TransactionSettled(
        bytes32 indexed transactionId,
        uint256 settledAmount,
        address settledBy,
        uint256 timestamp,
        bool isSuccessful
    );

    event SettlementVerified(
        bytes32 indexed transactionId,
        string status,
        uint256 blockNumber
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyController() {
        require(
            msg.sender == nexPayController || msg.sender == owner,
            "Only controller can call this function"
        );
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
        nexPayController = msg.sender;
        transactionCount = 0;
        totalSettledAmount = 0;
    }

    // Set controller address
    function setController(address _controller) external onlyOwner {
        require(_controller != address(0), "Invalid controller address");
        nexPayController = _controller;
    }

    /**
     * @dev Record a transaction on-chain
     * @param _transactionId Unique transaction identifier
     * @param _sender Sender address
     * @param _recipient Recipient address
     * @param _amount Transaction amount
     * @param _assetType Asset type (ETH, USDC, etc.)
     */
    function recordTransaction(
        bytes32 _transactionId,
        address _sender,
        address _recipient,
        uint256 _amount,
        string memory _assetType
    ) external onlyController returns (bool) {
        require(_transactionId != bytes32(0), "Invalid transaction ID");
        require(_sender != address(0), "Invalid sender address");
        require(_recipient != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than 0");
        require(
            transactions[_transactionId].timestamp == 0,
            "Transaction already recorded"
        );

        transactions[_transactionId] = Transaction({
            transactionId: _transactionId,
            sender: _sender,
            recipient: _recipient,
            amount: _amount,
            assetType: _assetType,
            timestamp: block.timestamp,
            status: "pending",
            blockchainTxHash: ""
        });

        userTransactions[_sender].push(_transactionId);
        userTransactions[_recipient].push(_transactionId);
        transactionCount++;

        emit TransactionRecorded(
            _transactionId,
            _sender,
            _recipient,
            _amount,
            _assetType,
            block.timestamp
        );

        return true;
    }

    /**
     * @dev Settle a recorded transaction
     * @param _transactionId Transaction to settle
     * @param _settledAmount Amount settled
     */
    function settleTransaction(
        bytes32 _transactionId,
        uint256 _settledAmount
    ) external onlyController returns (bool) {
        require(_transactionId != bytes32(0), "Invalid transaction ID");
        require(
            transactions[_transactionId].timestamp != 0,
            "Transaction not found"
        );
        require(
            keccak256(abi.encodePacked(transactions[_transactionId].status)) ==
                keccak256(abi.encodePacked("pending")),
            "Transaction not pending"
        );

        transactions[_transactionId].status = "settled";

        settlements[_transactionId] = Settlement({
            transactionId: _transactionId,
            settledAmount: _settledAmount,
            settledBy: msg.sender,
            timestamp: block.timestamp,
            isSuccessful: true
        });

        totalSettledAmount += _settledAmount;

        emit TransactionSettled(
            _transactionId,
            _settledAmount,
            msg.sender,
            block.timestamp,
            true
        );

        return true;
    }

    /**
     * @dev Mark transaction as failed
     * @param _transactionId Transaction to mark as failed
     */
    function failTransaction(bytes32 _transactionId) external onlyController returns (bool) {
        require(_transactionId != bytes32(0), "Invalid transaction ID");
        require(
            transactions[_transactionId].timestamp != 0,
            "Transaction not found"
        );

        transactions[_transactionId].status = "failed";

        settlements[_transactionId] = Settlement({
            transactionId: _transactionId,
            settledAmount: 0,
            settledBy: msg.sender,
            timestamp: block.timestamp,
            isSuccessful: false
        });

        emit TransactionSettled(
            _transactionId,
            0,
            msg.sender,
            block.timestamp,
            false
        );

        return true;
    }

    /**
     * @dev Verify transaction settlement
     * @param _transactionId Transaction ID to verify
     */
    function verifySettlement(bytes32 _transactionId)
        external
        view
        returns (bool isSettled, uint256 settledAmount)
    {
        require(_transactionId != bytes32(0), "Invalid transaction ID");
        require(
            transactions[_transactionId].timestamp != 0,
            "Transaction not found"
        );

        if (
            keccak256(abi.encodePacked(transactions[_transactionId].status)) ==
            keccak256(abi.encodePacked("settled"))
        ) {
            return (true, settlements[_transactionId].settledAmount);
        }
        return (false, 0);
    }

    /**
     * @dev Get transaction details
     */
    function getTransaction(bytes32 _transactionId)
        external
        view
        returns (Transaction memory)
    {
        require(_transactionId != bytes32(0), "Invalid transaction ID");
        return transactions[_transactionId];
    }

    /**
     * @dev Get user transaction history
     */
    function getUserTransactions(address _user)
        external
        view
        returns (bytes32[] memory)
    {
        return userTransactions[_user];
    }

    /**
     * @dev Get contract statistics
     */
    function getStatistics()
        external
        view
        returns (
            uint256 totalTransactions,
            uint256 totalSettled,
            uint256 balance
        )
    {
        return (transactionCount, totalSettledAmount, address(this).balance);
    }

    // Receive ETH
    receive() external payable {}
}
