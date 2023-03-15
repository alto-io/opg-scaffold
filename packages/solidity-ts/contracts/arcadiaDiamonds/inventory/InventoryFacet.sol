// SPDX-License-Identifier: UNLICENSED

/**
 * Authors: Moonstream DAO (engineering@moonstream.to)
 * GitHub: https://github.com/G7DAO/contracts
 */

pragma solidity ^0.8.0;

import { RolesInternal } from "../roles/RolesInternal.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { ERC1155Holder } from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { InventoryStorage } from "./InventoryStorage.sol";
import { InventoryFacetInternal } from "./InventoryFacetInternal.sol";

/**
InventoryFacet is a smart contract that can either be used standalone or as part of an EIP-2535 Diamond
proxy contract.

It implements an inventory system which can be layered onto any ERC721 contract.

For more details, please refer to the design document:
https://docs.google.com/document/d/1Oa9I9b7t46_ngYp-Pady5XKEDW8M2NE9rI0GBRACZBI/edit?usp=sharing

Admin flow:
- [x] Create inventory slots
- [x] Specify whether inventory slots are equippable or not on slot creation
- [x] Define tokens as equippable in inventory slots

Player flow:
- [ ] Equip ERC721 tokens in eligible inventory slots
- [ ] Equip ERC1155 tokens in eligible inventory slots
- [ ] Unequip items from unequippable slots

Batch endpoints:
- [ ] Marking items as equippable
- [ ] Equipping items
- [ ] Unequipping items
 */
contract InventoryFacet is
    ERC721Holder,
    ERC1155Holder,
    ReentrancyGuard,
    InventoryFacetInternal
{

    function setArcadiansAddress(address newArcadiansAddress) public onlyManager {
        _setArcadiansAddress(newArcadiansAddress);
    }

    function arcadiansAddress() external view returns (address) {
        return _arcadiansAddress();
    }

    function createSlot(
        bool unequippable
    ) external onlyManager returns (uint256) {
        return _createSlot(unequippable);
    }

    function numSlots() external view returns (uint256) {
        return _numSlots();
    }

    function slotIsUnequippable(uint256 slot) external view returns (bool) {
        return _slotIsUnequippable(slot);
    }

    function markItemAsEquippableInSlot(
        uint256 slot,
        uint256 itemType,
        address itemAddress,
        uint256 itemPoolId,
        uint256 maxAmount
    ) external onlyManager requireValidItemType(itemType) {
        _markItemAsEquippableInSlot(slot, itemType, itemAddress, itemPoolId, maxAmount);
    }

    function maxAmountOfItemInSlot(
        uint256 slot,
        uint256 itemType,
        address itemAddress,
        uint256 itemPoolId
    ) external view returns (uint256) {
        return
            _maxAmountOfItemInSlot(slot, itemType, itemAddress, itemPoolId);
    }

    function equip(
        uint256 arcadianTokenId,
        uint256 slot,
        uint256 itemType,
        address itemAddress,
        uint256 itemTokenId,
        uint256 amount
    ) external requireValidItemType(itemType) nonReentrant {
        _equip(arcadianTokenId, slot, itemType, itemAddress, itemTokenId, amount);
    }

    function unequip(
        uint256 arcadianTokenId,
        uint256 slot,
        bool unequipAll,
        uint256 amount
    ) external nonReentrant {
        _unequip(arcadianTokenId, slot, unequipAll, amount);
    }

    function equipped(
        uint256 arcadianTokenId,
        uint256 slot
    ) external view returns (InventoryStorage.EquippedItem memory item) {
        return _equipped(arcadianTokenId, slot);
    }
}