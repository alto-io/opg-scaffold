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
        uint256 itemTokenId;
        uint256 amount;
    }

    function setArcadiansAddress(address newArcadiansAddress) external;

    function getArcadiansAddress() external view returns (address);

    function numSlots() external view returns (uint256);

    function getSlot(uint256 slot) external view returns (InventoryStorage.Slot memory);

    function createSlot(
        string calldata name,
        bool unequippable
    ) external;

    function equip(
        uint256 arcadianTokenId,
        uint256 slot,
        uint256 itemTokenId,
        uint256 amount
    ) external;

    function equipBatch(
        uint256 arcadianTokenId,
        uint256[] calldata slots,
        uint256[] calldata itemTokenIds,
        uint256[] calldata amounts
    ) external;

    function unequip(
        uint256 arcadianTokenId,
        uint256 slot,
        bool unequipAll,
        uint256 amount
    ) external;

    function unequipBatch(
        uint256 arcadianTokenId
    ) external;

    function equipped(
        uint256 arcadianTokenId,
        uint256 slot
    ) external view;

    function equippedBatch(
        uint256 arcadianTokenId
    ) external view returns (EquippedItem[] memory item);
}