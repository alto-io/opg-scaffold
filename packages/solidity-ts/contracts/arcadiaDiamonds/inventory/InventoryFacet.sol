// SPDX-License-Identifier: UNLICENSED

/**
 * Crated based in the following work:
 * Authors: Moonstream DAO (engineering@moonstream.to)
 * GitHub: https://github.com/G7DAO/contracts
 */

pragma solidity 0.8.19;

import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { ERC1155Holder } from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { InventoryStorage } from "./InventoryStorage.sol";
import { InventoryInternal } from "./InventoryInternal.sol";

contract InventoryFacet is
    ERC721Holder,
    ERC1155Holder,
    ReentrancyGuard,
    InventoryInternal
{

    function numSlots() external view returns (uint) {
        return _numSlots();
    }

    function getSlot(uint slot) external view returns (InventoryStorage.Slot memory) {
        return _getSlot(slot);
    }

    function createSlot(
        uint capacity,
        bool unequippable,
        InventoryStorage.SlotCategory category,
        address itemAddress,
        uint[] calldata allowedItemIds
    ) external onlyManager {
        _createSlot(capacity, unequippable, category, itemAddress, allowedItemIds);
    }

    function allowItemsInSlot(
        uint slot,
        address itemAddress,
        uint[] calldata itemIds
    ) external {
        _allowItemsInSlot(slot, itemAddress, itemIds);
    }

    function disallowItemsInSlot(
        uint slot,
        address itemAddress,
        uint[] calldata itemIds
    ) external {
        _disallowItemsInSlot(slot, itemAddress, itemIds);
    }

    function getAllowedSlots(address itemAddress, uint itemId) external view returns (uint[] memory) {
        return _getAllowedSlots(itemAddress, itemId);
    }

    function getAllowedItems(uint slot, address itemAddress) external view returns (uint[] memory) {
        return _getAllowedItems(slot, itemAddress);
    }

    function equip(
        uint arcadianId,
        uint slot,
        InventoryStorage.EquippedItem calldata itemsToEquip
    ) external nonReentrant {
        _equip(arcadianId, slot, itemsToEquip);
    }

    function equipBatch(
        uint arcadianId,
        uint[] calldata slots,
        InventoryStorage.EquippedItem[] calldata itemsToEquip
    ) external nonReentrant {
        _equipBatch(arcadianId, slots, itemsToEquip);
    }

    function unequip(
        uint arcadianId,
        uint slot
    ) external nonReentrant {
        _unequip(arcadianId, slot);
    }

    function unequipBatch(
        uint arcadianId,
        uint[] calldata slots
    ) external nonReentrant {
        _unequipBatch(arcadianId, slots);
    }

    function unequipAll(
        uint arcadianId
    ) external nonReentrant {
        _unequipAll(arcadianId);
    }

    function equipped(
        uint arcadianId,
        uint slot
    ) external view returns (InventoryStorage.EquippedItem memory item) {
        return _equipped(arcadianId, slot);
    }

    function equippedAll(
        uint arcadianId
    ) external view returns (InventoryStorage.EquippedItem[] memory item) {
        return _equippedAll(arcadianId);
    }

    function baseSlotsUnique(
        uint[] calldata slots,
        address[] calldata itemsAddress,
        uint[] calldata itemsIds
    ) external view returns (bool) {
        return _baseSlotsUnique(slots, itemsAddress, itemsIds);
    }

    function sortSlots(
        uint[] memory slots,
        address[] memory itemsAddresses,
        uint[] memory itemsIds
    ) external pure returns (uint[] memory, address[] memory, uint[] memory) {
        return _sortSlots(slots, itemsAddresses, itemsIds);
    }
}