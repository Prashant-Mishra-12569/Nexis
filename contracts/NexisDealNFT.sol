// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NexisDealNFT
 * @dev Soulbound NFT for "Proof of Funding" on Nexis platform
 * - Minted when a deal is confirmed between builder and investor
 * - Non-transferable (soulbound)
 * - Stores deal metadata on IPFS via Pinata
 */
contract NexisDealNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    // Deal confirmation tracking
    mapping(bytes32 => bool) public dealConfirmed;
    mapping(bytes32 => address) public dealBuilder;
    mapping(bytes32 => address) public dealInvestor;
    mapping(bytes32 => uint256) public dealTokenId;
    
    // Pending confirmations (builder requests, investor must confirm)
    mapping(bytes32 => bool) public pendingConfirmation;
    mapping(bytes32 => address) public pendingBuilder;
    mapping(bytes32 => address) public pendingInvestor;
    mapping(bytes32 => string) public pendingTokenURI;
    
    // Events
    event DealRequested(bytes32 indexed dealId, address indexed builder, address indexed investor, string startupName);
    event DealConfirmed(bytes32 indexed dealId, address indexed builder, address indexed investor, uint256 tokenId);
    event DealRejected(bytes32 indexed dealId, address indexed investor);
    
    constructor() ERC721("Nexis Funded Badge", "NEXIS") Ownable(msg.sender) {}
    
    /**
     * @dev Builder requests deal confirmation
     * @param investor Address of the investor
     * @param startupName Name of the startup
     * @param tokenURI IPFS URI for NFT metadata
     */
    function requestDealConfirmation(
        address investor,
        string memory startupName,
        string memory tokenURI
    ) external returns (bytes32) {
        require(investor != address(0), "Invalid investor address");
        require(investor != msg.sender, "Cannot confirm deal with yourself");
        
        bytes32 dealId = keccak256(abi.encodePacked(msg.sender, investor, startupName, block.timestamp));
        
        require(!dealConfirmed[dealId], "Deal already confirmed");
        require(!pendingConfirmation[dealId], "Deal already pending");
        
        pendingConfirmation[dealId] = true;
        pendingBuilder[dealId] = msg.sender;
        pendingInvestor[dealId] = investor;
        pendingTokenURI[dealId] = tokenURI;
        
        emit DealRequested(dealId, msg.sender, investor, startupName);
        
        return dealId;
    }
    
    /**
     * @dev Investor confirms the deal, minting NFT to builder
     * @param dealId The deal ID to confirm
     */
    function confirmDeal(bytes32 dealId) external {
        require(pendingConfirmation[dealId], "No pending deal");
        require(pendingInvestor[dealId] == msg.sender, "Only the investor can confirm");
        
        address builder = pendingBuilder[dealId];
        string memory tokenURI = pendingTokenURI[dealId];
        
        // Mint NFT to builder
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(builder, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Record deal
        dealConfirmed[dealId] = true;
        dealBuilder[dealId] = builder;
        dealInvestor[dealId] = msg.sender;
        dealTokenId[dealId] = tokenId;
        
        // Clear pending
        delete pendingConfirmation[dealId];
        delete pendingBuilder[dealId];
        delete pendingInvestor[dealId];
        delete pendingTokenURI[dealId];
        
        emit DealConfirmed(dealId, builder, msg.sender, tokenId);
    }
    
    /**
     * @dev Investor rejects the deal request
     * @param dealId The deal ID to reject
     */
    function rejectDeal(bytes32 dealId) external {
        require(pendingConfirmation[dealId], "No pending deal");
        require(pendingInvestor[dealId] == msg.sender, "Only the investor can reject");
        
        // Clear pending
        delete pendingConfirmation[dealId];
        delete pendingBuilder[dealId];
        delete pendingInvestor[dealId];
        delete pendingTokenURI[dealId];
        
        emit DealRejected(dealId, msg.sender);
    }
    
    /**
     * @dev Override transfer functions to make NFT soulbound (non-transferable)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but block all transfers
        if (from != address(0) && to != address(0)) {
            revert("Nexis Funded Badge is soulbound and cannot be transferred");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Check if a deal is pending confirmation
     * @param dealId Deal to check
     */
    function isDealPending(bytes32 dealId) external view returns (bool) {
        return pendingConfirmation[dealId];
    }
    
    /**
     * @dev Get pending deal details
     * @param dealId Deal to check
     */
    function getPendingDeal(bytes32 dealId) external view returns (
        address builder,
        address investor,
        string memory tokenURI
    ) {
        require(pendingConfirmation[dealId], "No pending deal");
        return (pendingBuilder[dealId], pendingInvestor[dealId], pendingTokenURI[dealId]);
    }
    
    /**
     * @dev Get confirmed deal details
     * @param dealId Deal to check
     */
    function getConfirmedDeal(bytes32 dealId) external view returns (
        address builder,
        address investor,
        uint256 tokenId
    ) {
        require(dealConfirmed[dealId], "Deal not confirmed");
        return (dealBuilder[dealId], dealInvestor[dealId], dealTokenId[dealId]);
    }
    
    /**
     * @dev Get total deals completed
     */
    function totalDeals() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
