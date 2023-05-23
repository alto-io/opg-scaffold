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

    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // Holds the information needed to identify an ERC1155 item
    struct Item {
        address erc1155Contract;
        uint id;
    }

    // Holds the general information about a slot
    struct Slot {
        uint8 id;
        bool permanent;
        bool isBase;
    }

    struct Layout {
        uint8 numSlots;

        // Slot id => Slot
        mapping(uint8 => Slot) slots;

        // arcadian id => slot id => Items equipped
        mapping(uint => mapping(uint8 => Item)) equippedItems;

        // item address => item id => allowed slot id
        mapping(address => mapping(uint => uint8)) itemSlot;
        
        // item address => item id => equip items requires transfer
        mapping(address => mapping(uint => bool)) requiresTransfer;

        // List of all the existent hashes
        EnumerableSet.Bytes32Set baseItemsHashes;
        // arcadian id => base items hash
        mapping(uint => bytes32) arcadianToBaseItemHash;

        // account => slotId => number of coupons to modify the base traits
        mapping(address => mapping(uint => uint)) baseModifierCoupon;
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