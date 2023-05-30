// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

import { ERC721BaseInternal } from "@solidstate/contracts/token/ERC721/base/ERC721BaseInternal.sol";
import { ERC721Metadata } from "@solidstate/contracts/token/ERC721/metadata/ERC721Metadata.sol";
import { ISolidStateERC721 } from "@solidstate/contracts/token/ERC721/ISolidStateERC721.sol";
import { SolidStateERC721 } from "@solidstate/contracts/token/ERC721/SolidStateERC721.sol";
import { ERC721Base } from "@solidstate/contracts/token/ERC721/base/ERC721Base.sol";
import { IERC721 } from '@solidstate/contracts/interfaces/IERC721.sol';
import { IERC721Metadata } from "@solidstate/contracts/token/ERC721/metadata/IERC721Metadata.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { EnumerableMap } from '@solidstate/contracts/data/EnumerableMap.sol';
import { Multicall } from "@solidstate/contracts/utils/Multicall.sol";
import { InventoryStorage } from "../inventory/InventoryStorage.sol";
import { WhitelistStorage } from "../whitelist/WhitelistStorage.sol";

/**
 * @title ArcadiansFacet
 * @notice This contract is an ERC721 responsible for minting and claiming Arcadian tokens.
 * @dev ReentrancyGuard and Multicall contracts are used for security and gas efficiency.
 */
contract ArcadiansFacet is SolidStateERC721, ArcadiansInternal, Multicall {
    using EnumerableMap for EnumerableMap.UintToAddressMap;
    WhitelistStorage.PoolId constant GuaranteedPool = WhitelistStorage.PoolId.Guaranteed;
    WhitelistStorage.PoolId constant RestrictedPool = WhitelistStorage.PoolId.Restricted;

    /**
     * @notice Returns the URI for a given arcadian
     * @param tokenId ID of the token to query
     * @return The URI for the given token ID
     */
    function tokenURI(
        uint tokenId
    ) external view override (ERC721Metadata, IERC721Metadata) returns (string memory) {
        return _tokenURI(tokenId);
    }

    function _mint() internal returns (uint tokenId) {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();

        tokenId = nextArcadianId();

        if (tokenId > arcadiansSL.arcadiansMaxSupply)
            revert Arcadians_MaximumArcadiansSupplyReached();

        uint nonGuaranteedMintedAmount = _claimedWhitelist(RestrictedPool, msg.sender) + _claimedMintPass(msg.sender) + arcadiansSL.userPublicMints[msg.sender];

        if (_isWhitelistClaimActive(GuaranteedPool) && _elegibleWhitelist(GuaranteedPool, msg.sender) > 0) {
            // OG mint flow
            _consumeWhitelist(GuaranteedPool, msg.sender, 1);
        } else if (nonGuaranteedMintedAmount < arcadiansSL.maxMintPerUser) {

            if (_isMintPassClaimActive() && _elegibleMintPass(msg.sender) > 0) {
                // Magic Eden mint flow
                _consumeMintPass(msg.sender);
            } else if (_isWhitelistClaimActive(RestrictedPool) && _elegibleWhitelist(RestrictedPool, msg.sender) > 0) { 
                // Whitelist mint flow
                _consumeWhitelist(RestrictedPool, msg.sender, 1);

            } else if (arcadiansSL.isPublicMintOpen) {
                if (msg.value != arcadiansSL.mintPrice)
                    revert Arcadians_InvalidPayAmount();
                arcadiansSL.userPublicMints[msg.sender]++;
            } else {
                revert Arcadians_NotElegibleToMint();
            }
        } else {
            revert Arcadians_NotElegibleToMint();
        }

        _safeMint(msg.sender, tokenId);
    }

    /**
     * @notice Returns the amount of arcadians that can be minted by an account
     * @param account account to query
     * @return balance amount of arcadians that can be minted
     */
    function availableMints(address account) external view returns (uint balance) {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        
        uint mintPerUserMax = arcadiansSL.maxMintPerUser;
        uint nonGuaranteedAvailableMints;
        if (_isWhitelistClaimActive(RestrictedPool)) {
            nonGuaranteedAvailableMints += _elegibleWhitelist(RestrictedPool, account);
        } 
        if (_isMintPassClaimActive()) {
            nonGuaranteedAvailableMints += _elegibleMintPass(account);
        }
        if (arcadiansSL.isPublicMintOpen) {
            nonGuaranteedAvailableMints += mintPerUserMax - arcadiansSL.userPublicMints[account];
        }
        uint nonGuaranteedMintedAmount = _claimedWhitelist(RestrictedPool, account) + _claimedMintPass(account) + arcadiansSL.userPublicMints[account];

        if (nonGuaranteedMintedAmount >= mintPerUserMax) {
            nonGuaranteedAvailableMints = 0;
        } else  {
            uint ceil = mintPerUserMax - nonGuaranteedMintedAmount;
            nonGuaranteedAvailableMints = nonGuaranteedAvailableMints > ceil ? ceil : nonGuaranteedAvailableMints;
        }

        uint guaranteedAvailableMints;
        if (_isWhitelistClaimActive(GuaranteedPool)) {
            guaranteedAvailableMints += _elegibleWhitelist(GuaranteedPool, account);
        }
        return guaranteedAvailableMints + nonGuaranteedAvailableMints;
    }

    /**
     * @notice Returns the total amount of arcadians minted
     * @return uint total amount of arcadians minted
     */
    function totalMinted() external view returns (uint) {
        return _totalSupply();
    }

   /**
     * @notice Mint a token and equip it with the given items
     * @param itemsToEquip array of items to equip in the correspondent slot
     */
    function mintAndEquip(
        InventoryStorage.Item[] calldata itemsToEquip
    )
        external payable nonReentrant
    {
        uint tokenId = _mint();
        _equip(tokenId, itemsToEquip, true);
    }

    /**
     * @notice This function sets the public mint as open/closed
     */
    function setPublicMintOpen(bool isOpen) external onlyManager {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        arcadiansSL.isPublicMintOpen = isOpen;
    }
    /**
     * @notice Returns true if the public mint is open, false otherwise
     */
    function publicMintOpen() external view returns (bool) {
        return ArcadiansStorage.layout().isPublicMintOpen;
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
    function maxSupply() external view returns (uint) {
        return ArcadiansStorage.layout().arcadiansMaxSupply;
    }

    /**
     * @notice Sets the max arcadians supply
     * @param maxArcadiansSupply The max supply of arcadians that can be minted
     */
    function setMaxSupply(uint maxArcadiansSupply) external onlyManager {
        _setMaxSupply(maxArcadiansSupply);
    }

    /**
     * @notice Set the base URI for all Arcadians metadata
     * @notice Only the manager role can call this function
     * @param newBaseURI The new base URI for all token metadata
     */
    function setBaseURI(string memory newBaseURI) external onlyManager {
        _setBaseURI(newBaseURI);
    }

    /**
     * @dev This function returns the base URI
     * @return The base URI
     */
    function baseURI() external view returns (string memory) {
        return _baseURI();
    }

    function nextArcadianId() internal view returns (uint arcadianId) {
        arcadianId = _totalSupply() + 1;
    }
}