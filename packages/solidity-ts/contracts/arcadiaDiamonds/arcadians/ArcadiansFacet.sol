// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ERC721BaseInternal } from "@solidstate/contracts/token/ERC721/base/ERC721BaseInternal.sol";
import { ERC721BaseStorage } from "@solidstate/contracts/token/ERC721/base/ERC721BaseStorage.sol";
import { ERC721Metadata } from "@solidstate/contracts/token/ERC721/metadata/ERC721Metadata.sol";
import { ISolidStateERC721 } from "@solidstate/contracts/token/ERC721/ISolidStateERC721.sol";
import { SolidStateERC721 } from "@solidstate/contracts/token/ERC721/SolidStateERC721.sol";
import { ERC721Enumerable } from "@solidstate/contracts/token/ERC721/enumerable/ERC721Enumerable.sol";
import { ERC721Base } from "@solidstate/contracts/token/ERC721/base/ERC721Base.sol";
import { IERC721 } from '@solidstate/contracts/interfaces/IERC721.sol';
import { IERC721Metadata } from "@solidstate/contracts/token/ERC721/metadata/IERC721Metadata.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { EnumerableMap } from '@solidstate/contracts/data/EnumerableMap.sol';
import { Multicall } from "@solidstate/contracts/utils/Multicall.sol";
import { InventoryStorage } from "../inventory/InventoryStorage.sol";

/**
 * @title ArcadiansFacet
 * @notice This contract is an ERC721 responsible for minting and claiming Arcadian tokens.
 * @dev ReentrancyGuard and Multicall contracts are used for security and gas efficiency.
 */
contract ArcadiansFacet is SolidStateERC721, ArcadiansInternal, Multicall {
    using EnumerableMap for EnumerableMap.UintToAddressMap;

    /**
     * @notice Returns the URI for a given arcadian
     * @param tokenId ID of the token to query
     * @return The URI for the given token ID
     */
    function tokenURI(
        uint256 tokenId
    ) external view override (ERC721Metadata, IERC721Metadata) returns (string memory) {
        return _tokenURI(tokenId);
    }

    /**
     * @notice Allow the caller of the transaction to claim the amount of arcadians present in the Merkle tree
     * @param amount amount of arcadians that the caller wants to claim
     * @param proof Merkle proof to validate if the caller is eligible to claim the amount given
     */
    function claimMerkle(uint amount, bytes32[] memory proof)
        external nonReentrant
    {

        if (_totalSupply() + amount > MAX_SUPPLY)
            revert Arcadians_MaximumArcadiansSupplyReached();
            
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();

        // Revert if the arcadian was already claimed before
        if (amount == 0) 
            revert Merkle_InvalidClaimAmount();

        // Verify if is elegible
        bytes memory leaf = abi.encode(msg.sender, amount);
        _consumeLeaf(proof, leaf);

        // Mint arcadians to address
        for (uint256 i = 0; i < amount; i++) {
            _safeMint(msg.sender, nextArcadianId());
        }
        arcadiansSL.amountClaimedMerkle[msg.sender] += amount;
        arcadiansSL.totalClaimedMerkle += amount;

        emit ArcadianClaimedMerkle(msg.sender, amount);
    }

    function _restrictedMint() internal returns (uint tokenId) {
        tokenId = nextArcadianId();
        if (tokenId > MAX_SUPPLY)
            revert Arcadians_MaximumArcadiansSupplyReached();

        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        uint mintedTokens = _balanceOf(msg.sender) - arcadiansSL.amountClaimedMerkle[msg.sender];
        if (mintedTokens >= arcadiansSL.maxMintPerUser) 
            revert Arcadians_MaximumMintedArcadiansPerUserReached();

        _safeMint(msg.sender, tokenId);
    }

    /**
     * @notice Returns the total amount of arcadians minted
     * @return uint total amount of arcadians minted
     */
    function totalMinted() external view returns (uint) {
        return _totalSupply();
    }

    function nextArcadianId() internal view returns (uint arcadianId) {
        arcadianId = _totalSupply() + 1;
    }

    /**
     * @notice Returns the amount of arcadians claimed by an address through the Merkle tree
     * @param account address to check
     * @return uint amount of tokens claimed by the address
     */
    function claimedAmountMerkle(address account) external view returns (uint) {
        return _claimedAmountMerkle(account);
    }

    /**
     * @notice Allow caller to claims tokens from the whitelist
     * @param amount amount of tokens to claim
     */
    function claimWhitelist(uint amount) external nonReentrant {
        _consumeWhitelist(msg.sender, amount);
        for (uint i = 0; i < amount; i++) {
            _restrictedMint();
        }
    }

    /**
     * @notice Mint a token and transfer it to the caller.
     */
    function mint()
        external payable nonReentrant
    {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        if (!arcadiansSL.isPublicMintOpen) 
            revert Arcadian_PublicMintClosed();

        if (msg.value != arcadiansSL.mintPrice)
            revert Arcadians_InvalidPayAmount();

        _restrictedMint();
    }

   /**
     * @notice Mint a token and equip it with given items
     * @param slotIds IDs of the inventory slots to equip
     * @param itemsToEquip array of items to equip in the correspondent slot
     */
    function mintAndEquip(
        uint[] calldata slotIds,
        InventoryStorage.Item[] calldata itemsToEquip
    )
        external payable nonReentrant
    {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        if (msg.value != arcadiansSL.mintPrice) 
            revert Arcadians_InvalidPayAmount();

        uint tokenId = _restrictedMint();
        _equipBatch(tokenId, slotIds, itemsToEquip);
    }

    /**
     * @notice This function updates the price to mint an arcadian
     * @param newMintPrice The new mint price to be set
     */
    function setMintPrice(uint newMintPrice) external onlyManager {
        _setMintPrice(newMintPrice);
    }

    /**
     * @notice This function gets the current price to mint an arcadian
     * @return The current mint price
     */
    function mintPrice() external view returns (uint) {
        return _mintPrice();
    }

    /**
     * @notice This function sets the new maximum number of arcadians that a user can mint
     * @param newMaxMintPerUser The new maximum number of arcadians that a user can mint
     */
    function setMaxMintPerUser(uint newMaxMintPerUser) external onlyManager {
        _setMaxMintPerUser(newMaxMintPerUser);
    }

    /**
     * @dev This function gets the current maximum number of arcadians that a user can mint
     * @return The current maximum number of arcadians that a user can mint
     */
    function maxMintPerUser() external view returns (uint) {
        return _maxMintPerUser();
    }

    /**
     * @dev This function returns the maximum supply of arcadians
     * @return The current maximum supply of arcadians
     */
    function maxSupply() external pure returns (uint) {
        return MAX_SUPPLY;
    }

    /**
     * @notice Set the base URI for all Arcadians metadata
     * @notice Only the manager role can call this function
     * @param newBaseURI The new base URI for all token metadata
     */
    function setBaseURI(string memory newBaseURI) external onlyManager {
        _setBaseURI(newBaseURI);
    }

    function baseURI() external view returns (string memory) {
        return _baseURI();
    }

    /**
     * @notice Returns the total claimed amount from the merkle tree
     * @return The total claimed amount
     */
    function totalClaimedMerkle() external view returns (uint) {
        return _totalClaimedMerkle();
    }

    // required overrides
    function _handleApproveMessageValue(
        address operator,
        uint256 tokenId,
        uint256 value
    ) internal virtual override {
        if (value > 0) revert SolidStateERC721__PayableApproveNotSupported();
        super._handleApproveMessageValue(operator, tokenId, value);
    }

    function _handleTransferMessageValue(
        address from,
        address to,
        uint256 tokenId,
        uint256 value
    ) internal virtual override {
        if (value > 0) revert SolidStateERC721__PayableTransferNotSupported();
        super._handleTransferMessageValue(from, to, tokenId, value);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}