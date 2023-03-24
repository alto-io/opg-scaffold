// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { UintUtils } from '@solidstate/contracts/utils/UintUtils.sol';
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { WhitelistInternal } from "../whitelist/WhitelistInternal.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { InventoryInternal } from "../inventory/InventoryInternal.sol";

contract ArcadiansInternal is RolesInternal, WhitelistInternal, MerkleInternal, InventoryInternal {

    event MaxMintPerUserChanged(address indexed by, uint oldMaxMintPerUser, uint newMaxMintPerUser);
    event MintPriceChanged(address indexed by, uint oldMintPrice, uint newMintPrice);
    event BaseURIChanged(address indexed by, string oldBaseURI, string newBaseURI);
    event InventoryAddressChanged(address indexed by, address indexed oldInventoryAddress, address indexed newInventoryAddress);
    event ArcadianClaimedMerkle(address indexed to, uint256 indexed amount);

    using UintUtils for uint256;

    // function _getTokenURI(
    //     uint256 tokenId
    // ) internal view returns (string memory) {
    //     string memory tokenUri = ERC721MetadataInternal._tokenURI(tokenId);
    //     // IInventoryFacet inventory = IInventoryFacet(_getInventoryAddress());
    //     // IInventoryFacet.EquippedItem[] memory equippedItem = inventory.equippedAll(tokenId);
    //     // tokenUri = string.concat(tokenUri, "/?tokenIds=");
    //     // for (uint i = 0; i < equippedItem.length; i++) {
    //     //     string memory itemId = equippedItem[i].id.toString();
    //     //     if (i == 0) {
    //     //         tokenUri = string.concat(tokenUri, itemId);
    //     //     } else {
    //     //         tokenUri = string.concat(tokenUri, ",", itemId);
    //     //     }
    //     // }
    //     return tokenUri;
    // }

    function _setBaseURI(string memory newBaseURI) internal {
        ERC721MetadataStorage.Layout storage ERC721SL = ERC721MetadataStorage.layout();
        emit BaseURIChanged(msg.sender, ERC721SL.baseURI, newBaseURI);
        ERC721SL.baseURI = newBaseURI;
    }

    function _getBaseURI() internal view returns (string memory) {
        return ERC721MetadataStorage.layout().baseURI;
    }

    function _getClaimedAmountMerkle(address account) internal view returns (uint) {
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
}