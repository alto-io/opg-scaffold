// SPDX-License-Identifier: UNLICENSED

/**
 * Crated based in the following work:
 * Authors: Moonstream DAO (engineering@moonstream.to)
 * GitHub: https://github.com/G7DAO/contracts
 */

pragma solidity ^0.8.19;

import { RolesInternal } from "../roles/RolesInternal.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { ERC1155Holder } from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { InventoryStorage } from "./InventoryStorage.sol";
import { InventoryInternal } from "./InventoryInternal.sol";

contract InventoryFacet is
    ERC721Holder,
    ERC1155Holder,
    ReentrancyGuard,
    InventoryInternal
{

    function setArcadiansAddress(address newArcadiansAddress) public onlyManager {
        _setArcadiansAddress(newArcadiansAddress);
    }

    function getArcadiansAddress() external view returns (address) {
        return _getArcadiansAddress();
    }

    function numSlots() external view returns (uint256) {
        return _numSlots();
    }

    function getSlot(uint256 slot) external view returns (InventoryStorage.Slot memory) {
        return _getSlot(slot);
    }

    function createSlot(
        string calldata name,
        uint capacity,
        bool unequippable
    ) external onlyManager {
        _createSlot(name, capacity, unequippable);
    }

    function allowSlotUnequip(
        uint slot
    ) external onlyManager {
        _allowSlotUnequip(slot);
    }

    function equip(
        uint256 arcadianId,
        uint256 slot,
        uint256 itemTokenId,
        uint256 amount
    ) external nonReentrant {
        _equip(arcadianId, slot, itemTokenId, amount);
    }

    function equipBatch(
        uint256 arcadianId,
        uint256[] calldata slots,
        uint256[] calldata itemTokenIds,
        uint256[] calldata amounts
    ) external nonReentrant {
        _equipBatch(arcadianId, slots, itemTokenIds, amounts);
    }

    function unequip(
        uint256 arcadianId,
        uint256 slot,
        bool unequipAll,
        uint256 amount
    ) external nonReentrant {
        _unequip(arcadianId, slot, unequipAll, amount);
    }

    function unequipBatch(
        uint256 arcadianId
    ) external {
        _unequipBatch(arcadianId);
    }

    function equipped(
        uint256 arcadianId,
        uint256 slot
    ) external view returns (InventoryStorage.EquippedItem memory item) {
        return _equipped(arcadianId, slot);
    }

    function equippedBatch(
        uint256 arcadianId
    ) external view returns (InventoryStorage.EquippedItem[] memory item) {
        return _equippedBatch(arcadianId);
    }
}