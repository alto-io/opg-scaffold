// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { ERC721BaseInternal } from "@solidstate/contracts/token/ERC721/base/ERC721BaseInternal.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ERC721MetadataInternal } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataInternal.sol";
import { UintUtils } from '@solidstate/contracts/utils/UintUtils.sol';
import { IInventoryFacet } from "../inventory/IInventoryFacet.sol";

contract ArcadiansInternal is ERC721BaseInternal, RolesInternal, ERC721MetadataInternal {

    event MaxMintPerUserChanged(address indexed by, uint oldMaxMintPerUser, uint newMaxMintPerUser);
    event MintPriceChanged(address indexed by, uint oldMintPrice, uint newMintPrice);
    event BaseURIChanged(address indexed by, string oldBaseURI, string newBaseURI);
    event InventoryAddressChanged(address indexed by, address indexed oldInventoryAddress, address indexed newInventoryAddress);
    event ArcadianClaimed(address indexed to, uint256 indexed amount);

    using UintUtils for uint256;

    function _getTokenURI(
        uint256 tokenId
    ) internal view returns (string memory) {
        IInventoryFacet inventory = IInventoryFacet(_getInventoryAddress());
        string memory tokenUri = ERC721MetadataInternal._tokenURI(tokenId);
        IInventoryFacet.EquippedItem[] memory equippedItem = inventory.equippedAll(tokenId);
        tokenUri = string.concat(tokenUri, "/?tokenIds=");
        for (uint i = 0; i < equippedItem.length; i++) {
            string memory itemId = equippedItem[i].id.toString();
            if (i == 0) {
                tokenUri = string.concat(tokenUri, itemId);
            } else {
                tokenUri = string.concat(tokenUri, ",", itemId);
            }
        }
        return tokenUri;
    }
    
    function _setInventoryAddress(address newInventoryAddress) internal onlyManager {
        require(newInventoryAddress != address(0), "ArcadiansInternal._setInventoryAddress: Invalid address");
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        if (newInventoryAddress != arcadiansSL.inventoryAddress) {
            emit InventoryAddressChanged(msg.sender, arcadiansSL.inventoryAddress, newInventoryAddress);
            arcadiansSL.inventoryAddress = newInventoryAddress;
        }
    }

    function _getInventoryAddress() internal view returns (address) {
        return ArcadiansStorage.layout().inventoryAddress;
    }

    function _setBaseURI(string memory newBaseURI) internal {
        ERC721MetadataStorage.Layout storage ERC721SL = ERC721MetadataStorage.layout();
        emit BaseURIChanged(msg.sender, ERC721SL.baseURI, newBaseURI);
        ERC721SL.baseURI = newBaseURI;
    }

    function _getBaseURI() internal view returns (string memory) {
        return ERC721MetadataStorage.layout().baseURI;
    }

    function _getClaimedAmount(address account) internal view returns (uint) {
        return ArcadiansStorage.layout().amountClaimed[account];
    }

    function _setMaxMintPerUser(uint newMaxMintPerUser) internal {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        emit MaxMintPerUserChanged(msg.sender, arcadiansSL.maxMintPerUser, newMaxMintPerUser);
        arcadiansSL.maxMintPerUser = newMaxMintPerUser;
    }

    function _getMintPrice() internal view returns (uint) {
        return ArcadiansStorage.layout().mintPrice;
    }

    function _setMintPrice(uint newMintPrice) internal {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        emit MintPriceChanged(msg.sender, arcadiansSL.mintPrice, newMintPrice);
        arcadiansSL.mintPrice = newMintPrice;
    }

    function _getMaxMintPerUser() internal view returns (uint) {
        return ArcadiansStorage.layout().maxMintPerUser;
    }

    function _mint(address to) internal
    {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        require(msg.value == arcadiansSL.mintPrice, "ArcadiansInternal._mint: Invalid pay amount");
        uint mintedTokens = _balanceOf(to) - arcadiansSL.amountClaimed[to];
        require(mintedTokens < arcadiansSL.maxMintPerUser, "ArcadiansInternal._mint: User maximum minted tokens reached");
        _mint(to, arcadiansSL.counterId);
        arcadiansSL.counterId++;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override (ERC721BaseInternal, ERC721MetadataInternal) {
        IInventoryFacet inventory = IInventoryFacet(_getInventoryAddress());
        try inventory.unequipAllItems(tokenId) {} catch {}

        super._beforeTokenTransfer(from, to, tokenId);
    }
}