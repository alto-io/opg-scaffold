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

    function slot(uint slotId) external view returns (InventoryStorage.Slot memory) {
        return _slot(slotId);
    }

    function createSlot(
        bool unequippable,
        InventoryStorage.SlotCategory category,
        InventoryStorage.Item[] calldata items
    ) external onlyManager {
        _createSlot(unequippable, category, items);
    }

    function allowItemsInSlot(
        uint slotId,
        InventoryStorage.Item[] calldata items
    ) external {
        _allowItemsInSlot(slotId, items);
    }

    function disallowItemsInSlot(
        uint slotId,
        InventoryStorage.Item[] calldata items
    ) external {
        _disallowItemsInSlot(slotId, items);
    }

    function allowedSlot(InventoryStorage.Item calldata item) external view returns (uint) {
        return _allowedSlot(item);
    }

    function allowedItems(uint slotId) external view returns (InventoryStorage.Item[] memory) {
        return _allowedItems(slotId);
    }

    function equip(
        uint arcadianId,
        uint slotId,
        InventoryStorage.Item calldata itemsToEquip
    ) external nonReentrant {
        _equip(arcadianId, slotId, itemsToEquip);
    }

    function equipBatch(
        uint arcadianId,
        uint[] calldata slots,
        InventoryStorage.Item[] calldata itemsToEquip
    ) external nonReentrant {
        _equipBatch(arcadianId, slots, itemsToEquip);
    }

    function unequip(
        uint arcadianId,
        uint slotId
    ) external nonReentrant {
        _unequip(arcadianId, slotId);
    }

    function unequipBatch(
        uint arcadianId,
        uint[] calldata slots
    ) external nonReentrant {
        _unequipBatch(arcadianId, slots);
    }

    function equipped(
        uint arcadianId,
        uint slotId
    ) external view returns (InventoryStorage.Item memory item) {
        return _equipped(arcadianId, slotId);
    }

    function equippedAll(
        uint arcadianId
    ) external view returns (InventoryStorage.Item[] memory item) {
        return _equippedAll(arcadianId);
    }

    function isArcadianUnique(
        uint arcadianId,
        uint[] calldata slots,
        InventoryStorage.Item[] calldata items
    ) external view returns (bool) {
        return _isArcadianUnique(arcadianId, slots, items);
    }
}