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

contract ArcadiansFacet is SolidStateERC721, ArcadiansInternal, Multicall {
    using EnumerableMap for EnumerableMap.UintToAddressMap;

    function tokenURI(
        uint256 tokenId
    ) external view override (ERC721Metadata, IERC721Metadata) returns (string memory) {
        return _tokenURI(tokenId);
    }

    function claimMerkle(uint totalAmount, bytes32[] memory proof)
        external nonReentrant
    {
        ArcadiansStorage.Layout storage es = ArcadiansStorage.layout();

        // Revert if the token was already claimed before
        require(es.amountClaimed[msg.sender] < totalAmount, "All tokens claimed");

        // Verify if is elegible
        bytes memory leaf = abi.encode(msg.sender, totalAmount);
        _validateLeaf(proof, leaf);

        // Mint token to address
        uint amountLeftToClaim = totalAmount - es.amountClaimed[msg.sender];
        for (uint256 i = 0; i < amountLeftToClaim; i++) {
            _safeMint(msg.sender, _totalSupply());
        }
        es.amountClaimed[msg.sender] += amountLeftToClaim;
        emit ArcadianClaimedMerkle(msg.sender, amountLeftToClaim);
    }

    function claimedAmountMerkle(address account) external view returns (uint) {
        return _claimedAmountMerkle(account);
    }

    function claimWhitelist(uint amount) external nonReentrant {
        _consumeWhitelist(msg.sender, amount);
        for (uint i = 0; i < amount; i++) {
            _safeMint(msg.sender, _totalSupply());
        }
    }

    function mint()
        external payable nonReentrant
    {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        require(msg.value == arcadiansSL.mintPrice, "ArcadiansInternal._mint: Invalid pay amount");
        uint mintedTokens = _balanceOf(msg.sender) - arcadiansSL.amountClaimed[msg.sender];
        require(mintedTokens < arcadiansSL.maxMintPerUser, "ArcadiansInternal._mint: User maximum minted tokens reached");
        _safeMint(msg.sender, _totalSupply());
    }

    function mintAndEquipp(
        uint[] calldata slotIds,
        InventoryStorage.Item[] calldata itemsToEquip
    )
        external payable nonReentrant
    {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        require(msg.value == arcadiansSL.mintPrice, "ArcadiansInternal._mint: Invalid pay amount");
        uint mintedTokens = _balanceOf(msg.sender) - arcadiansSL.amountClaimed[msg.sender];
        require(mintedTokens < arcadiansSL.maxMintPerUser, "ArcadiansInternal._mint: User maximum minted tokens reached");
        uint tokenId = _totalSupply();
        _safeMint(msg.sender, tokenId);
        _equipBatch(tokenId, slotIds, itemsToEquip);
    }

    function setMintPrice(uint newMintPrice) external onlyManager {
        _setMintPrice(newMintPrice);
    }
    function mintPrice() external view returns (uint) {
        return _mintPrice();
    }

    function setMaxMintPerUser(uint newMaxMintPerUser) external onlyManager {
        _setMaxMintPerUser(newMaxMintPerUser);
    }
    function maxMintPerUser() external view returns (uint) {
        return _maxMintPerUser();
    }

    function setBaseURI(string memory newBaseURI) external onlyManager {
        _setBaseURI(newBaseURI);
    }
    function baseURI() external view returns (string memory) {
        return _baseURI();
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
        _unequipAll(tokenId);
        super._beforeTokenTransfer(from, to, tokenId);
    }
}