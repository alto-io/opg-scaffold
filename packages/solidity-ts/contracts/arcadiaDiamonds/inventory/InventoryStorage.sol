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
    bytes32 constant STORAGE_POSITION =
        keccak256("inventory.storage.position");

    uint256 constant ERC721_ITEM_TYPE = 721;
    uint256 constant ERC1155_ITEM_TYPE = 1155;

    // EquippedItem represents an item equipped in a specific inventory slot for a specific ERC721 token.
    struct EquippedItem {
        uint256 ItemType;
        address ItemAddress;
        uint256 ItemTokenId;
        uint256 Amount;
    }

    struct Layout {
        address arcadiansAddress;
        uint256 numSlots;
        // Slot => true if items can be unequipped from that slot and false otherwise
        mapping(uint256 => bool) slotIsUnequippable;
        // Slot => item type => item address => item pool ID => maximum equippable
        // For ERC20 and ERC721 tokens, item pool ID is assumed to be 0. No data will be stored under positive
        // item pool IDs.
        //
        // NOTE: It is possible for the same contract to implement multiple of these ERCs (e.g. ERC20 and ERC721),
        // so this data structure actually makes sense.
        mapping(uint256 => mapping(uint256 => mapping(address => mapping(uint256 => uint256)))) slotEligibleItems;
        // Arcadians contract address => arcadian token ID => slot => EquippedItem
        // Item type and Pool ID on EquippedItem have the same constraints as they do elsewhere (e.g. in slotEligibleItems).
        //
        // NOTE: We have added the arcadians contract address as the first mapping key as a defense against
        // future modifications which may allow administrators to modify the arcadians contract address.
        // If such a modification were made, it could make it possible for a bad actor administrator
        // to change the address of the arcadian token to the address to an ERC721 contract they control
        // and drain all items from every arcadians token's inventory.
        // If this contract is deployed as a Diamond proxy, the owner of the Diamond can pretty much
        // do whatever they want in any case, but adding the  contract address as a key protects
        // users of non-Diamond deployments even under small variants of the current implementation.
        // It also offers *some* protection to users of Diamond deployments of the Inventory.
        mapping(address => mapping(uint256 => mapping(uint256 => EquippedItem))) equippedItems;
    }

    function layout()
        internal
        pure
        returns (Layout storage istore)
    {
        bytes32 position = STORAGE_POSITION;
        assembly {
            istore.slot := position
        }
    }
}