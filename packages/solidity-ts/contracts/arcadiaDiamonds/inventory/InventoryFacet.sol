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
        address itemAddress,
        uint[] calldata allowedItemIds,
        uint capacity,
        bool unequippable
    ) external onlyManager {
        _createSlot(itemAddress, allowedItemIds, capacity, unequippable);
    }

    function allowItemInSlot(
        address itemAddress,
        uint itemId,
        uint slot
    ) external {
        _allowItemInSlot(itemAddress, itemId, slot);
    }

    function getItemAllowedSlots(address itemAddress, uint itemId) external view returns (uint[] memory) {
        return _getItemAllowedSlots(itemAddress, itemId);
    }

    function equip(
        uint arcadianId,
        address itemAddress,
        uint itemId,
        uint amount,
        uint slot
    ) external nonReentrant {
        _equip(arcadianId, itemAddress, itemId, amount, slot);
    }

    function equipBatch(
        uint arcadianId,
        address itemAddress,
        uint[] calldata itemIds,
        uint[] calldata amounts,
        uint[] calldata slots
    ) external nonReentrant {
        _equipBatch(arcadianId, itemAddress, itemIds, amounts, slots);
    }

    function unequip(
        uint arcadianId,
        uint slot,
        bool unequipAll,
        uint amount
    ) external nonReentrant {
        _unequip(arcadianId, slot, unequipAll, amount);
    }

    function unequipBatch(
        uint arcadianId,
        uint[] calldata slots,
        bool[] calldata unequipAll,
        uint[] calldata amounts
    ) external {
        _unequipBatch(arcadianId, slots, unequipAll, amounts);
    }

    function unequipAllItems(
        uint arcadianId
    ) external {
        _unequipAllItems(arcadianId);
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
}