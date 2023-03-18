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

    function createSlot(bool unequippable) external;

    function numSlots() external view returns (uint256);

    function slotIsUnequippable(uint256 slot) external view returns (bool);

    function equip(
        uint256 arcadianTokenId,
        uint256 slot,
        uint256 itemTokenId,
        uint256 amount
    ) external;

    function unequip(
        uint256 arcadianTokenId,
        uint256 slot,
        bool unequipAll,
        uint256 amount
    ) external;

    function equipped(
        uint256 arcadianTokenId,
        uint256 slot
    ) external view returns (EquippedItem memory item);
}