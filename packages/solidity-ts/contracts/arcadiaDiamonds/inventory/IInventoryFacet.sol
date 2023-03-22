// SPDX-License-Identifier: UNLICENSED

/**
 * Crated based in the following work:
 * Authors: Moonstream DAO (engineering@moonstream.to)
 * GitHub: https://github.com/G7DAO/contracts
 */

pragma solidity ^0.8.19;

import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import { InventoryStorage } from "./InventoryStorage.sol";

interface IInventoryFacet is
    IERC721Receiver,
    IERC1155Receiver
{
    struct EquippedItem {
        address itemAddress;
        uint256 id;
        uint256 amount;
    }

    function setArcadiansAddress(address newArcadiansAddress) external;

    function getArcadiansAddress() external view returns (address);

    function numSlots() external view returns (uint);

    function getSlot(uint slot) external view returns (InventoryStorage.Slot memory);

    function createSlot(
        address itemAddress,
        uint[] calldata allowedItemIds,
        uint capacity,
        bool unequippable
    ) external;

    function allowItemInSlot(
        address itemAddress,
        uint itemId,
        uint slot
    ) external;

    function allowSlotToUnequip(
        uint slot
    ) external;

    function equip(
        uint arcadianId,
        address itemAddress,
        uint itemId,
        uint amount,
        uint slot
    ) external;

    function equipBatch(
        uint arcadianId,
        address itemAddress,
        uint[] calldata itemIds,
        uint[] calldata amounts,
        uint[] calldata slots
    ) external;

    function unequip(
        uint arcadianId,
        uint slot,
        bool unequipAll,
        uint amount
    ) external;

    function unequipBatch(
        uint arcadianId
    ) external;

    function equipped(
        uint arcadianId,
        uint slot
    ) external view returns (EquippedItem memory item);

    function equippedBatch(
        uint arcadianId
    ) external view returns (EquippedItem[] memory item);
}