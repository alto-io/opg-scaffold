
pragma solidity ^0.8.19;

import { RolesInternal } from "../roles/RolesInternal.sol";
import {ReentrancyGuard} from "@solidstate/contracts/utils/ReentrancyGuard.sol";

import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/**
LibInventory defines the storage structure used by the Inventory contract as a facet for an EIP-2535 Diamond
proxy.
 */
library InventoryStorage {
    bytes32 constant INVENTORY_STORAGE_POSITION =
        keccak256("inventory.storage.position");

    uint constant ERC721_ITEM_TYPE = 721;
    uint constant ERC1155_ITEM_TYPE = 1155;

    // EquippedItem represents an item equipped in a specific inventory slot for a specific ERC721 token.
    struct EquippedItem {
        uint id;
        uint amount;
    }

    struct Slot {
        uint capacity;
        bool isUnequippable;
        uint[] allowedItems;
    }

    struct Layout {
        address arcadiansAddress;
        uint numSlots;
        // Slot id => Slot
        mapping(uint => Slot) slots;
        // arcadian token ID => slot id => EquippedItem
        mapping(uint => mapping(uint => EquippedItem)) equippedItems;
        // item id => allowed slots list
        mapping(uint => uint[]) itemAllowedSlots;
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