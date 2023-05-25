// SPDX-License-Identifier: GPL-2.0
pragma solidity ^0.8.19;

interface IERC721A {
    struct TokenOwnership {
        address addr;
        uint64 startTimestamp;
        bool burned;
        uint24 extraData;
    }

    struct MintStageInfo {
        uint80 price;
        uint32 walletLimit;
        bytes32 merkleRoot;
        uint24 maxStageSupply;
        uint64 startTimeUnixSeconds;
        uint64 endTimeUnixSeconds;
    }

    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event ConsecutiveTransfer(uint256 fromTokenId, uint256 toTokenId, address indexed from, address indexed to);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PermanentBaseURI(string baseURI);
    event SetActiveStage(uint256 activeStage);
    event SetBaseURI(string baseURI);
    event SetCosigner(address cosigner);
    event SetCrossmintAddress(address crossmintAddress);
    event SetGlobalWalletLimit(uint256 globalWalletLimit);
    event SetMaxMintableSupply(uint256 maxMintableSupply);
    event SetMintable(bool mintable);
    event SetTimestampExpirySeconds(uint64 expiry);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event UpdateStage(
        uint256 stage,
        uint80 price,
        uint32 walletLimit,
        bytes32 merkleRoot,
        uint24 maxStageSupply,
        uint64 startTimeUnixSeconds,
        uint64 endTimeUnixSeconds
    );
    event Withdraw(uint256 value);

    function approve(address to, uint256 tokenId) external payable;
    function assertValidCosign(address minter, uint32 qty, uint64 timestamp, bytes calldata signature) external view;
    function balanceOf(address owner) external view returns (uint256);
    function crossmint(uint32 qty, address to, bytes32[] calldata proof, uint64 timestamp, bytes calldata signature) external payable;
    function explicitOwnershipOf(uint256 tokenId) external view returns (TokenOwnership memory);
    function explicitOwnershipsOf(uint256[] calldata tokenIds) external view returns (TokenOwnership[] memory);
    function getActiveStageFromTimestamp(uint64 timestamp) external view returns (uint256);
    function getApproved(uint256 tokenId) external view returns (address);
    function getCosignDigest(address minter, uint32 qty, uint64 timestamp) external view returns (bytes32);
    function getCosignNonce(address minter) external view returns (uint256);
    function getCosigner() external view returns (address);
    function getCrossmintAddress() external view returns (address);
    function getGlobalWalletLimit() external view returns (uint256);
    function getMaxMintableSupply() external view returns (uint256);
    function getMintable() external view returns (bool);
    function getNumberStages() external view returns (uint256);
    function getStageInfo(uint256 index)
        external
        view
        returns (
            MintStageInfo memory,
            uint32,
            uint256
        );
    function getTimestampExpirySeconds() external view returns (uint64);
    function getTokenURISuffix() external view returns (string memory);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function mint(address minter, uint32 qty, uint64 timestamp) external payable;
    function name() external view returns (string memory);
    function owner() external view returns (address);
    function ownerMint(uint32 qty, address to) external;
        function ownerOf(uint256 tokenId) external view returns (address);
    function permanentBaseURI() external view returns (string memory);
    function safeTransferFrom(address from, address to, uint256 tokenId) external payable;
    function setApprovalForAll(address operator, bool approved) external;
    function setActiveStage(uint256 stage) external;
    function setBaseURI(string calldata baseURI) external;
    function setCosigner(address cosigner) external;
    function setCrossmintAddress(address crossmintAddress) external;
    function setGlobalWalletLimit(uint256 globalWalletLimit) external;
    function setMaxMintableSupply(uint256 maxMintableSupply) external;
    function setMintable(bool mintable) external;
    function setTimestampExpirySeconds(uint64 expiry) external;
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
    function symbol() external view returns (string memory);
    function tokenByIndex(uint256 index) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function totalSupply() external view returns (uint256);
    function transferFrom(address from, address to, uint256 tokenId) external payable;
    function updateStage(
        uint256 stage,
        uint80 price,
        uint32 walletLimit,
        bytes32 merkleRoot,
        uint24 maxStageSupply,
        uint64 startTimeUnixSeconds,
        uint64 endTimeUnixSeconds
    ) external;
    function withdraw(uint256 value) external;
}
