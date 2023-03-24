// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { SolidStateERC721 } from "@solidstate/contracts/token/ERC721/SolidStateERC721.sol";
import { ERC721BaseInternal } from "@solidstate/contracts/token/ERC721/base/ERC721BaseInternal.sol";
import { ERC721Metadata } from "@solidstate/contracts/token/ERC721/metadata/ERC721Metadata.sol";
import { IERC721Metadata } from "@solidstate/contracts/token/ERC721/metadata/IERC721Metadata.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";

contract ArcadiansFacet is SolidStateERC721, ArcadiansInternal, ReentrancyGuard {

    function tokenURI(
        uint256 tokenId
    ) external view override (ERC721Metadata, IERC721Metadata) returns (string memory) {
        return _getTokenURI(tokenId);
    }

    function setInventoryAddress(address newInventoryAddress) external onlyManager {
        _setInventoryAddress(newInventoryAddress);
    }

    function getInventoryAddress() external view returns (address) {
        return _getInventoryAddress();
    }

    function claimMerkle(uint totalAmount, bytes32[] memory proof)
        external nonReentrant
    {
        _claimMerkle(totalAmount, proof);
    }

    function getClaimedAmountMerkle(address account) external view returns (uint) {
        return _getClaimedAmountMerkle(account);
    }

    function claimWhitelist(uint amount) external {
        _claimWhitelist(amount);
    }

    function mint()
        external payable nonReentrant
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
    ) internal virtual override (ArcadiansInternal, SolidStateERC721) {
        ArcadiansInternal._beforeTokenTransfer(from, to, tokenId);
        SolidStateERC721._beforeTokenTransfer(from, to, tokenId);
    }
}