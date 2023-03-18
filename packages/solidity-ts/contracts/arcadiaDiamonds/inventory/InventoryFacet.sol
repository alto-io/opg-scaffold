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
import { InventorySlotsInternal } from "./InventorySlotsInternal.sol";

contract InventoryFacet is
    ERC721Holder,
    ERC1155Holder,
    ReentrancyGuard,
    InventoryInternal,
    InventorySlotsInternal
{

    function setArcadiansAddress(address newArcadiansAddress) public onlyManager {
        _setArcadiansAddress(newArcadiansAddress);
    }

    function getArcadiansAddress() external view returns (address) {
        return _getArcadiansAddress();
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

    function equip(
        uint256 arcadianTokenId,
        uint256 slot,
        uint256 itemTokenId,
        uint256 amount
    ) external nonReentrant {
        _equip(arcadianTokenId, slot, itemTokenId, amount);
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