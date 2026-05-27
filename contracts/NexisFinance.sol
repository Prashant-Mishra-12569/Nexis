// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title NexisFinance
 * @dev Handles all fee payments for the Nexis platform on Mantle Testnet
 * - Builder onboarding fee (1 MNT)
 * - Extra idea listing fee (0.5 MNT)
 * - Boost tiers (3, 5, 10 MNT)
 */
contract NexisFinance {
    address public owner;
    
    // Fee amounts in wei (MNT has 18 decimals like ETH)
    uint256 public constant ONBOARDING_FEE = 1 ether;      // 1 MNT
    uint256 public constant EXTRA_IDEA_FEE = 0.5 ether;    // 0.5 MNT
    uint256 public constant BASIC_BOOST_FEE = 3 ether;     // 3 MNT
    uint256 public constant PRO_BOOST_FEE = 5 ether;       // 5 MNT
    uint256 public constant ELITE_BOOST_FEE = 10 ether;    // 10 MNT
    
    // Boost tiers enum
    enum BoostTier { Basic, Pro, Elite }
    
    // Mappings
    mapping(address => bool) public verifiedBuilders;
    mapping(address => uint256) public builderIdeaCount;
    mapping(bytes32 => bool) public boostedIdeas;
    mapping(bytes32 => BoostTier) public ideaBoostTier;
    mapping(bytes32 => uint256) public ideaBoostExpiry;
    
    // Events
    event BuilderOnboarded(address indexed builder, uint256 timestamp);
    event IdeaListed(address indexed builder, bytes32 indexed ideaId, uint256 timestamp);
    event IdeaBoosted(address indexed builder, bytes32 indexed ideaId, BoostTier tier, uint256 expiry);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Pay onboarding fee to become a verified builder
     * @notice Requires exactly 1 MNT
     */
    function payOnboarding() external payable {
        require(msg.value == ONBOARDING_FEE, "Onboarding fee is 1 MNT");
        require(!verifiedBuilders[msg.sender], "Already a verified builder");
        
        verifiedBuilders[msg.sender] = true;
        builderIdeaCount[msg.sender] = 1; // First idea is free
        
        emit BuilderOnboarded(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Pay to list an extra idea (after first free one)
     * @param ideaId Unique identifier for the idea
     * @notice Requires exactly 0.5 MNT
     */
    function payExtraIdea(bytes32 ideaId) external payable {
        require(verifiedBuilders[msg.sender], "Must be a verified builder");
        require(msg.value == EXTRA_IDEA_FEE, "Extra idea fee is 0.5 MNT");
        
        builderIdeaCount[msg.sender]++;
        
        emit IdeaListed(msg.sender, ideaId, block.timestamp);
    }
    
    /**
     * @dev List first free idea (no payment required)
     * @param ideaId Unique identifier for the idea
     */
    function listFreeIdea(bytes32 ideaId) external {
        require(verifiedBuilders[msg.sender], "Must be a verified builder");
        require(builderIdeaCount[msg.sender] == 1, "Free idea already used");
        
        builderIdeaCount[msg.sender] = 0; // Mark free idea as used
        
        emit IdeaListed(msg.sender, ideaId, block.timestamp);
    }
    
    /**
     * @dev Buy a boost for an idea
     * @param tier The boost tier (0=Basic, 1=Pro, 2=Elite)
     * @param ideaId Unique identifier for the idea
     */
    function buyBoost(uint8 tier, bytes32 ideaId) external payable {
        require(verifiedBuilders[msg.sender], "Must be a verified builder");
        require(tier <= 2, "Invalid boost tier");
        
        uint256 requiredFee;
        uint256 boostDuration;
        BoostTier boostTier;
        
        if (tier == 0) {
            requiredFee = BASIC_BOOST_FEE;
            boostDuration = 2 days;
            boostTier = BoostTier.Basic;
        } else if (tier == 1) {
            requiredFee = PRO_BOOST_FEE;
            boostDuration = 5 days;
            boostTier = BoostTier.Pro;
        } else {
            requiredFee = ELITE_BOOST_FEE;
            boostDuration = 7 days;
            boostTier = BoostTier.Elite;
        }
        
        require(msg.value == requiredFee, "Incorrect boost fee");
        
        boostedIdeas[ideaId] = true;
        ideaBoostTier[ideaId] = boostTier;
        ideaBoostExpiry[ideaId] = block.timestamp + boostDuration;
        
        emit IdeaBoosted(msg.sender, ideaId, boostTier, ideaBoostExpiry[ideaId]);
    }
    
    /**
     * @dev Check if a builder is verified
     * @param builder Address to check
     */
    function isVerifiedBuilder(address builder) external view returns (bool) {
        return verifiedBuilders[builder];
    }
    
    /**
     * @dev Check if an idea is currently boosted
     * @param ideaId Idea to check
     */
    function isIdeaBoosted(bytes32 ideaId) external view returns (bool) {
        return boostedIdeas[ideaId] && ideaBoostExpiry[ideaId] > block.timestamp;
    }
    
    /**
     * @dev Get boost details for an idea
     * @param ideaId Idea to check
     */
    function getBoostDetails(bytes32 ideaId) external view returns (bool active, BoostTier tier, uint256 expiry) {
        active = boostedIdeas[ideaId] && ideaBoostExpiry[ideaId] > block.timestamp;
        tier = ideaBoostTier[ideaId];
        expiry = ideaBoostExpiry[ideaId];
    }
    
    /**
     * @dev Withdraw collected fees (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner, balance);
    }
    
    /**
     * @dev Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
