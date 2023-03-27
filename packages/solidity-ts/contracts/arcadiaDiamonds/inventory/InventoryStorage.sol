// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ReentrancyGuard} from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { EnumerableSet } from "@solidstate/contracts/data/EnumerableSet.sol";

/**
LibInventory defines the storage structure used by the Inventory contract as a facet for an EIP-2535 Diamond
proxy.
 */
library InventoryStorage {
    bytes32 constant INVENTORY_STORAGE_POSITION =
        keccak256("inventory.storage.position");

    uint constant ERC721_ITEM_TYPE = 721;
    uint constant ERC1155_ITEM_TYPE = 1155;

    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    enum SlotCategory { Base, Equippment, Cosmetic }

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
        SlotCategory category;
    }

    struct Layout {
        uint numSlots;

        // Slot id => Slot
        mapping(uint => Slot) slots;

        mapping(SlotCategory => EnumerableSet.UintSet) categorySlots;

        // arcadian id => slot id => EquippedItem
        mapping(uint => mapping(uint => EquippedItem)) equippedItems;

        // Slot id => item address => items allowed
        mapping(uint => mapping(address => EnumerableSet.UintSet)) allowedItems;
        // item address => item id => slots allowed
        mapping(address => mapping(uint => EnumerableSet.UintSet)) allowedSlots;

        // base items hash => arcadian id
        EnumerableSet.Bytes32Set baseItemsHashes;
        mapping(uint => bytes32) arcadiansBaseItemsHashes;
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