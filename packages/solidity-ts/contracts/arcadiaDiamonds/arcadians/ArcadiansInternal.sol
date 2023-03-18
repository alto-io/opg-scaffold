// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ERC721BaseInternal } from "@solidstate/contracts/token/ERC721/base/ERC721BaseInternal.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
// import { MerkleInternal } from "../../merkle/MerkleInternal.sol";
import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ERC721BaseInternal } from "@solidstate/contracts/token/ERC721/base/ERC721BaseInternal.sol";
import { ERC721EnumerableInternal } from "@solidstate/contracts/token/ERC721/enumerable/ERC721EnumerableInternal.sol";
import { ERC721EnumerableInternal } from "@solidstate/contracts/token/ERC721/enumerable/ERC721EnumerableInternal.sol";
import { ERC721MetadataInternal } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataInternal.sol";
import { ISolidStateERC721 } from '@solidstate/contracts/token/ERC721/ISolidStateERC721.sol';
import { UintUtils } from '@solidstate/contracts/utils/UintUtils.sol';
import { IInventoryFacet } from "../inventory/IInventoryFacet.sol";

// import "hardhat/console.sol";

contract ArcadiansInternal is ERC721BaseInternal, RolesInternal, ERC721MetadataInternal {

    event MaxMintPerUserChanged(uint oldMaxMintPerUser, uint newMaxMintPerUser);
    event MintPriceChanged(uint oldMintPrice, uint newMintPrice);
    event BaseURIChanged(string oldBaseURI, string newBaseURI);
    event ItemsAddressChanged(address indexed oldItemsAddress, address indexed newItemsAddress);

    using UintUtils for uint256;

    function _getTokenURI(
        uint256 tokenId
    ) internal view returns (string memory) {
        IInventoryFacet inventory = IInventoryFacet(_getItemsAddress());
        string memory tokenUri = ERC721MetadataInternal._tokenURI(tokenId);
        IInventoryFacet.EquippedItem memory equippedItem = inventory.equipped(tokenId, 0);
        // TODO: get equippedAll and put them in URI
        string memory itemId = equippedItem.itemTokenId.toString();
        return string.concat(tokenUri, itemId);
    }
    
    function _setItemsAddress(address newItemsAddress) internal onlyManager {
        ArcadiansStorage.Layout storage asl = ArcadiansStorage.layout();
        if (newItemsAddress != asl.itemsAddress) {
            emit ItemsAddressChanged(asl.itemsAddress, newItemsAddress);
            asl.itemsAddress = newItemsAddress;
        }
    }

    function _getItemsAddress() internal view returns (address) {
        return ArcadiansStorage.layout().itemsAddress;
    }

    function _setBaseURI(string memory newBaseURI) internal {
        emit BaseURIChanged(ERC721MetadataStorage.layout().baseURI, newBaseURI);
        ERC721MetadataStorage.layout().baseURI = newBaseURI;
    }

    function _getBaseURI() internal view returns (string memory) {
        return ERC721MetadataStorage.layout().baseURI;
    }

    function _getClaimedAmount(address account) internal view returns (uint) {
        return ArcadiansStorage.layout().amountClaimed[account];
    }

    function _setMaxMintPerUser(uint newMaxMintPerUser) internal {
        ArcadiansStorage.Layout storage asl = ArcadiansStorage.layout();
        emit MaxMintPerUserChanged(asl.maxMintPerUser, newMaxMintPerUser);
        asl.maxMintPerUser = newMaxMintPerUser;
    }

    function _getMintPrice() internal view returns (uint) {
        return ArcadiansStorage.layout().mintPrice;
    }

    function _setMintPrice(uint newMintPrice) internal {
        ArcadiansStorage.Layout storage asl = ArcadiansStorage.layout();
        emit MintPriceChanged(asl.mintPrice, newMintPrice);
        asl.mintPrice = newMintPrice;
    }

    function _getMaxMintPerUser() internal view returns (uint) {
        return ArcadiansStorage.layout().maxMintPerUser;
    }

    function _mint(address to) internal
    {
        ArcadiansStorage.Layout storage asl = ArcadiansStorage.layout();
        require(msg.value == asl.mintPrice, "Invalid pay amount");
        uint mintedTokens = _balanceOf(to) - asl.amountClaimed[to];
        require(mintedTokens < asl.maxMintPerUser, "Max mint reached");
        _mint(to, asl.counterId);
        asl.counterId++;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override (ERC721BaseInternal, ERC721MetadataInternal) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}