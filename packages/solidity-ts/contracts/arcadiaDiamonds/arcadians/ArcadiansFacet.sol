// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { SolidStateERC721 } from "@solidstate/contracts/token/ERC721/SolidStateERC721.sol";
import { ERC721BaseInternal } from "@solidstate/contracts/token/ERC721/base/ERC721BaseInternal.sol";
import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";
import { IArcadiansFacet } from "./IArcadiansFacet.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";

contract ArcadiansFacet is SolidStateERC721, ArcadiansInternal, MerkleInternal, IArcadiansFacet, ReentrancyGuard {

    function setItemsAddress(address newItemsAddress) external onlyManager {
        _setItemsAddress(newItemsAddress);
    }

    function itemsAddress() external view returns (address) {
        return _itemsAddress();
    }

    function claim(uint totalAmount, bytes32[] memory proof)
        public nonReentrant
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
            uint tokenId = es.counterId;
            _mint(msg.sender, tokenId);
            es.counterId++;
        }
        es.amountClaimed[msg.sender] += amountLeftToClaim;
        emit Claimed(msg.sender, amountLeftToClaim);
    }

    function getClaimedAmount(address account) external view returns (uint) {
        return _getClaimedAmount(account);
    }

    function mint()
        public payable nonReentrant
    {
        _mint(msg.sender);
    }

    function setMintPrice(uint newMintPrice) external onlyManager {
        _setMintPrice(newMintPrice);
    }
    function getMintPrice() external view returns (uint) {
        return _getMintPrice();
    }

    function setMaxMintPerUser(uint newMaxMintPerUser) external onlyManager {
        _setMaxMintPerUser(newMaxMintPerUser);
    }
    function getMaxMintPerUser() external view returns (uint) {
        return _getMaxMintPerUser();
    }

    function setBaseURI(string memory baseURI) external onlyManager {
        _setBaseURI(baseURI);
    }
    function getBaseURI() external view returns (string memory) {
        return _getBaseURI();
    }

    // required overrides
    function _handleApproveMessageValue(
        address operator,
        uint256 tokenId,
        uint256 value
    ) internal virtual override (ERC721BaseInternal, SolidStateERC721) {
        if (value > 0) revert SolidStateERC721__PayableApproveNotSupported();
        SolidStateERC721._handleApproveMessageValue(operator, tokenId, value);
    }


    function _handleTransferMessageValue(
        address from,
        address to,
        uint256 tokenId,
        uint256 value
    ) internal virtual override (ERC721BaseInternal, SolidStateERC721) {
        if (value > 0) revert SolidStateERC721__PayableTransferNotSupported();
        SolidStateERC721._handleTransferMessageValue(from, to, tokenId, value);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(SolidStateERC721, ERC721BaseInternal) {
        SolidStateERC721._beforeTokenTransfer(from, to, tokenId);
    }
}