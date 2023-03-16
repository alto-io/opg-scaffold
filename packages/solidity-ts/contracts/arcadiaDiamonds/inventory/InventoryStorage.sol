pragma solidity ^0.8.0;

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

    uint256 constant ERC721_ITEM_TYPE = 721;
    uint256 constant ERC1155_ITEM_TYPE = 1155;

    // EquippedItem represents an item equipped in a specific inventory slot for a specific ERC721 token.
    struct EquippedItem {
        uint256 itemTokenId;
        uint256 amount;
    }

    struct Layout {
        address arcadiansAddress;
        uint256 numSlots;
        // Slot => true if items can be unequipped from that slot and false otherwise
        mapping(uint256 => bool) slotIsUnequippable;
        // arcadian token ID => slot => EquippedItem
        mapping(uint256 => mapping(uint256 => EquippedItem)) equippedItems;

        // // Slot  => allow more than one item per slot
        // mapping(uint256 => uint256) slotAllowMultiple;
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