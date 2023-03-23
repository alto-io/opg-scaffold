// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ReentrancyGuard} from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";

/**
LibInventory defines the storage structure used by the Inventory contract as a facet for an EIP-2535 Diamond
proxy.
 */
library InventoryStorage {
    bytes32 constant INVENTORY_STORAGE_POSITION =
        keccak256("inventory.storage.position");

    uint constant ERC721_ITEM_TYPE = 721;
    uint constant ERC1155_ITEM_TYPE = 1155;

    // EquippedItem: holds the information of the currently equipped item for a specific slot in an arcadian
    struct EquippedItem {
        address itemAddress;
        uint id;
        uint amount;
    }
    // Slot: Holds the general information for a slot
    struct Slot {
        uint capacity;
        bool isUnequippable;
        uint[] allowedItemsIds;
    }

    struct Layout {
        address arcadiansAddress;
        uint numSlots;
        // Slot id => Slot
        mapping(uint => Slot) slots;

        // arcadian token ID => slot id => EquippedItem
        mapping(uint => mapping(uint => EquippedItem)) equippedItems;

        // Slot id => item id => is allowed to be equipped
        mapping(uint => mapping(address => mapping(uint => bool))) isItemAllowed;

        // item address => item id => allowed slots list
        mapping(address => mapping(uint => uint[])) itemAllowedSlots;
    }

    function layout()
        internal
        pure
        returns (Layout storage istore)
    {
        bytes32 position = INVENTORY_STORAGE_POSITION;
        assembly {
            istore.slot := position
        }
    }
}