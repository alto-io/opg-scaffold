// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { AddressUtils } from "@solidstate/contracts/utils/AddressUtils.sol";
import { ArrayUtils } from "@solidstate/contracts/utils/ArrayUtils.sol";
import { EnumerableSet } from "@solidstate/contracts/data/EnumerableSet.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { InventoryStorage } from "./InventoryStorage.sol";
import { IERC1155 } from "@solidstate/contracts/interfaces/IERC1155.sol";

contract InventoryInternal is
    ReentrancyGuard,
    RolesInternal
{
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using AddressUtils for address;

    error Inventory_InvalidERC1155Contract();
    error Inventory_UnequippingPermanentSlot();
    error Inventory_InvalidSlotId();
    error Inventory_ItemDoesNotHaveSlotAssigned();
    error Inventory_InsufficientItemBalance();
    error Inventory_UnequippingEmptySlot();
    error Inventory_UnequippingBaseSlot();
    error Inventory_SlotNotSpecified();
    error Inventory_ItemNotSpecified();
    error Inventory_NotArcadianOwner();
    error Inventory_ArcadianNotUnique();
    error Inventory_NotAllBaseSlotsEquipped();
    error Inventory_InputDataMismatch();
    error Inventory_ItemAlreadyEquippedInSlot();
    error Inventory_CouponNeededToModifyBaseSlots();
    error Inventory_NonBaseSlot();

    event ItemsAllowedInSlotUpdated(
        address indexed by,
        InventoryStorage.Item[] items
    );

    event ItemsEquipped(
        address indexed by,
        uint indexed arcadianId,
        uint8[] slots
    );

    event ItemsUnequipped(
        address indexed by,
        uint indexed arcadianId,
        uint8[] slotsIds
    );

    event SlotCreated(
        address indexed by,
        uint8 indexed slotId,
        bool permanent,
        bool isBase
    );

    event BaseModifierCouponAdded(
        address indexed by,
        address indexed to,
        uint8[] slotsIds,
        uint[] amounts
    );

    event BaseModifierCouponConsumed(
        address indexed account,
        uint indexed arcadianId,
        uint8[] slotsIds
    );

    // Helper structs only used in view functions to ease data reading from web3
    struct ItemInSlot {
        uint8 slotId;
        address erc1155Contract;
        uint itemId;
    }
    struct BaseModifierCoupon {
        uint8 slotId;
        uint amount;
    }

    modifier onlyValidSlot(uint8 slotId) {
        if (slotId == 0 || slotId > InventoryStorage.layout().numSlots) revert Inventory_InvalidSlotId();
        _;
    }

    modifier onlyArcadianOwner(uint arcadianId) {
        IERC721 arcadiansContract = IERC721(address(this));
        if (msg.sender != arcadiansContract.ownerOf(arcadianId)) revert Inventory_NotArcadianOwner();
        _;
    }

    function _numSlots() internal view returns (uint) {
        return InventoryStorage.layout().numSlots;
    }

    function _equip(
        uint arcadianId,
        InventoryStorage.Item[] calldata items,
        bool freeBaseModifier
    ) internal onlyArcadianOwner(arcadianId) {

        if (items.length == 0) 
            revert Inventory_ItemNotSpecified();

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint8 numBaseSlotsModified;
        uint8[] memory slotsIds = new uint8[](items.length);
        for (uint i = 0; i < items.length; i++) {
            uint8 slotId = _equipSingleSlot(arcadianId, items[i], freeBaseModifier);
            if (inventorySL.slots[slotId].isBase) {
                numBaseSlotsModified++;
            }
            slotsIds[i] = slotId;
        }

        if (!_baseAndPermanentSlotsEquipped(arcadianId)) 
            revert Inventory_NotAllBaseSlotsEquipped();

        if (numBaseSlotsModified > 0) {
            if (!_hashBaseItemsUnchecked(arcadianId))
                revert Inventory_ArcadianNotUnique();
            
            if (!freeBaseModifier) {
                uint8[] memory baseSlotsModified = new uint8[](numBaseSlotsModified);
                uint counter;
                for (uint i = 0; i < items.length; i++) {
                    uint8 slotId = inventorySL.itemSlot[items[i].erc1155Contract][items[i].id];
                    if (inventorySL.slots[slotId].isBase) {
                        baseSlotsModified[counter] = slotId;
                        counter++;
                    }
                }
                emit BaseModifierCouponConsumed(msg.sender, arcadianId, baseSlotsModified);
            }
        }

        emit ItemsEquipped(msg.sender, arcadianId, slotsIds);
    }

    function _equipSingleSlot(
        uint arcadianId,
        InventoryStorage.Item calldata item,
        bool freeBaseModifier
    ) internal returns (uint8 slotId) {

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        slotId = inventorySL.itemSlot[item.erc1155Contract][item.id];
        
        if (slotId == 0 || slotId > InventoryStorage.layout().numSlots) 
            revert Inventory_ItemDoesNotHaveSlotAssigned();
        
        if (!freeBaseModifier && inventorySL.slots[slotId].isBase) {
            if (inventorySL.baseModifierCoupon[msg.sender][slotId] == 0)
                revert Inventory_CouponNeededToModifyBaseSlots();

            inventorySL.baseModifierCoupon[msg.sender][slotId]--;
        }

        InventoryStorage.Item storage existingItem = inventorySL.equippedItems[arcadianId][slotId];
        if (inventorySL.slots[slotId].permanent && existingItem.erc1155Contract != address(0)) 
            revert Inventory_UnequippingPermanentSlot();
        if (existingItem.erc1155Contract == item.erc1155Contract && existingItem.id == item.id)
            revert Inventory_ItemAlreadyEquippedInSlot();

        if (inventorySL.equippedItems[arcadianId][slotId].erc1155Contract != address(0))
            _unequipUnchecked(arcadianId, slotId);

        bool requiresTransfer = inventorySL.requiresTransfer[item.erc1155Contract][item.id];
        if (requiresTransfer) {
            IERC1155 erc1155Contract = IERC1155(item.erc1155Contract);
            if (erc1155Contract.balanceOf(msg.sender, item.id) < 1)
                revert Inventory_InsufficientItemBalance();

            erc1155Contract.safeTransferFrom(
                msg.sender,
                address(this),
                item.id,
                1,
                ''
            );
        }

        inventorySL.equippedItems[arcadianId][slotId] = item;
    }

    function _baseAndPermanentSlotsEquipped(uint arcadianId) internal view returns (bool) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint8 numSlots = inventorySL.numSlots;
        for (uint8 i = 0; i < numSlots; i++) {
            uint8 slotId = i + 1;
            InventoryStorage.Slot storage slot = inventorySL.slots[slotId];
            if (!slot.isBase && !slot.permanent)
                continue;
            if (inventorySL.equippedItems[arcadianId][slotId].erc1155Contract == address(0)) {
                return false;
            }
        }
        return true;
    }

    function _unequipUnchecked(
        uint arcadianId,
        uint8 slotId
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        InventoryStorage.Item storage existingItem = inventorySL.equippedItems[arcadianId][slotId];

        bool requiresTransfer = inventorySL.requiresTransfer[existingItem.erc1155Contract][existingItem.id];
        if (requiresTransfer) {
            IERC1155 erc1155Contract = IERC1155(existingItem.erc1155Contract);
            erc1155Contract.safeTransferFrom(
                address(this),
                msg.sender,
                existingItem.id,
                1,
                ''
            );
        }
        delete inventorySL.equippedItems[arcadianId][slotId];
    }

    function _unequip(
        uint arcadianId,
        uint8[] calldata slotsIds
    ) internal onlyArcadianOwner(arcadianId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        if (slotsIds.length == 0) 
            revert Inventory_SlotNotSpecified();

        for (uint i = 0; i < slotsIds.length; i++) {
            if (inventorySL.slots[slotsIds[i]].permanent) 
                revert Inventory_UnequippingPermanentSlot();

            if (inventorySL.equippedItems[arcadianId][slotsIds[i]].erc1155Contract == address(0)) 
                revert Inventory_UnequippingEmptySlot();
            
            if (inventorySL.slots[slotsIds[i]].isBase)
                revert Inventory_UnequippingBaseSlot();

            _unequipUnchecked(arcadianId, slotsIds[i]);
        }

        _hashBaseItemsUnchecked(arcadianId);

        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            slotsIds
        );
    }

    function _equipped(
        uint arcadianId,
        uint8 slotId
    ) internal view returns (ItemInSlot memory) {
        InventoryStorage.Item storage item = InventoryStorage.layout().equippedItems[arcadianId][slotId];
        return ItemInSlot(slotId, item.erc1155Contract, item.id);
    }

    function _equippedBatch(
        uint arcadianId,
        uint8[] calldata slotsIds
    ) internal view returns (ItemInSlot[] memory equippedSlots) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        equippedSlots = new ItemInSlot[](slotsIds.length);
        for (uint i = 0; i < slotsIds.length; i++) {
            InventoryStorage.Item storage equippedItem = inventorySL.equippedItems[arcadianId][slotsIds[i]];
            equippedSlots[i] = ItemInSlot(slotsIds[i], equippedItem.erc1155Contract, equippedItem.id);
        }
    }

    function _equippedAll(
        uint arcadianId
    ) internal view returns (ItemInSlot[] memory equippedSlots) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint8 numSlots = inventorySL.numSlots;
        equippedSlots = new ItemInSlot[](numSlots);
        for (uint8 i = 0; i < numSlots; i++) {
            uint8 slotId = i + 1;
            InventoryStorage.Item storage equippedItem = inventorySL.equippedItems[arcadianId][slotId];
            equippedSlots[i] = ItemInSlot(slotId, equippedItem.erc1155Contract, equippedItem.id);
        }
    }

    function _isArcadianUnique(
        uint arcadianId,
        InventoryStorage.Item[] calldata items
    ) internal view returns (bool) {

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        bytes memory encodedItems;
        uint numBaseSlots = inventorySL.baseSlotsIds.length;

        for (uint8 i = 0; i < numBaseSlots; i++) {
            uint8 slotId = inventorySL.baseSlotsIds[i];

            InventoryStorage.Item memory item;
            for (uint j = 0; j < items.length; j++) {
                if (_allowedSlot(items[j]) == slotId) {
                    item = items[j];
                    break;
                }
            }
            if (item.erc1155Contract == address(0)) {
                if (inventorySL.equippedItems[arcadianId][slotId].erc1155Contract != address(0)) {
                    item = inventorySL.equippedItems[arcadianId][slotId];
                } else {
                    revert Inventory_NotAllBaseSlotsEquipped();
                }
            }
            
            encodedItems = abi.encodePacked(encodedItems, slotId, item.erc1155Contract, item.id);
        }

        return !inventorySL.baseItemsHashes.contains(keccak256(encodedItems));
    }

    function _hashBaseItemsUnchecked(
        uint arcadianId
    ) internal returns (bool isUnique) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        bytes memory encodedItems;
        uint numBaseSlots = inventorySL.baseSlotsIds.length;

        for (uint8 i = 0; i < numBaseSlots; i++) {
            uint8 slotId = inventorySL.baseSlotsIds[i];
            
            InventoryStorage.Item storage equippedItem = inventorySL.equippedItems[arcadianId][slotId];
            encodedItems = abi.encodePacked(encodedItems, slotId, equippedItem.erc1155Contract, equippedItem.id);
        }

        bytes32 baseItemsHash = keccak256(encodedItems);
        isUnique = !inventorySL.baseItemsHashes.contains(baseItemsHash);
        inventorySL.baseItemsHashes.remove(inventorySL.arcadianToBaseItemHash[arcadianId]);
        inventorySL.baseItemsHashes.add(baseItemsHash);
        inventorySL.arcadianToBaseItemHash[arcadianId] = baseItemsHash;
    }

    function _createSlot(
        bool permanent,
        bool isBase,
        InventoryStorage.Item[] calldata allowedItems
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        // slots are 1-index
        inventorySL.numSlots += 1;
        uint8 newSlotId = inventorySL.numSlots;
        inventorySL.slots[newSlotId].permanent = permanent;
        inventorySL.slots[newSlotId].isBase = isBase;
        inventorySL.slots[newSlotId].id = newSlotId;

        _setSlotBase(newSlotId, isBase);

        if (allowedItems.length > 0) {
            _allowItemsInSlot(newSlotId, allowedItems);
        }

        emit SlotCreated(msg.sender, newSlotId, permanent, isBase);
    }

    function _setSlotBase(
        uint8 slotId,
        bool isBase
    ) internal onlyValidSlot(slotId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        uint8[] storage baseSlotsIds = inventorySL.baseSlotsIds;
        uint numBaseSlots = baseSlotsIds.length;

        if (isBase) {
            bool alreadyInBaseList;
            for (uint i = 0; i < numBaseSlots; i++) {
                if (baseSlotsIds[i] == slotId) {
                    alreadyInBaseList = true;
                    break;
                }
            }
            if (!alreadyInBaseList) {
                baseSlotsIds.push(slotId);
            }
        } else {
            for (uint i = 0; i < numBaseSlots; i++) {
                if (baseSlotsIds[i] == slotId) {
                    baseSlotsIds[i] = baseSlotsIds[numBaseSlots - 1];
                    baseSlotsIds.pop();
                    break;
                }
            }
        }

        inventorySL.slots[slotId].isBase = isBase;
    }

    function _setSlotPermanent(
        uint8 slotId,
        bool permanent
    ) internal onlyValidSlot(slotId) {
        InventoryStorage.layout().slots[slotId].permanent = permanent;
    }

    function _addBaseModifierCoupons(
        address account,
        uint8[] calldata slotsIds,
        uint[] calldata amounts
    ) internal {
        if (slotsIds.length != amounts.length)
            revert Inventory_InputDataMismatch();

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint8 numSlots = inventorySL.numSlots;

        for (uint i = 0; i < slotsIds.length; i++) {
            if (slotsIds[i] == 0 && slotsIds[i] > numSlots) 
                revert Inventory_InvalidSlotId();
            if (!inventorySL.slots[slotsIds[i]].isBase) {
                revert Inventory_NonBaseSlot();
            }
            InventoryStorage.layout().baseModifierCoupon[account][slotsIds[i]] += amounts[i];
        }

        emit BaseModifierCouponAdded(msg.sender, account, slotsIds, amounts);
    }

    function _getbaseModifierCoupon(address account, uint8 slotId) internal view onlyValidSlot(slotId) returns (uint) {
        if (!InventoryStorage.layout().slots[slotId].isBase) {
            revert Inventory_NonBaseSlot();
        }
        return InventoryStorage.layout().baseModifierCoupon[account][slotId];
    }

    function _getBaseModifierCouponAll(address account) internal view returns (BaseModifierCoupon[] memory) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        uint numBaseSlots = inventorySL.baseSlotsIds.length;

        BaseModifierCoupon[] memory coupons = new BaseModifierCoupon[](numBaseSlots);
        uint counter;
        for (uint8 i = 0; i < numBaseSlots; i++) {
            uint8 slotId = uint8(inventorySL.baseSlotsIds[i]);

            coupons[counter].slotId = slotId;
            coupons[counter].amount = inventorySL.baseModifierCoupon[account][slotId];
            counter++;
        }
        return coupons;
    }

    function _getBaseSlotsIds() internal view returns (uint8[] memory) {
        return InventoryStorage.layout().baseSlotsIds;
    }

    function _setItemsTransferRequired(
        InventoryStorage.Item[] calldata items,
        bool[] calldata requiresTransfer
    ) internal {
        if (items.length != requiresTransfer.length)
            revert Inventory_InputDataMismatch();
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        for (uint i = 0; i < items.length; i++) {
            inventorySL.requiresTransfer[items[i].erc1155Contract][items[i].id] = requiresTransfer[i];
        }
    }
    
    function _allowItemsInSlot(
        uint8 slotId,
        InventoryStorage.Item[] calldata items
    ) internal virtual onlyValidSlot(slotId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        for (uint i = 0; i < items.length; i++) {
            if (!items[i].erc1155Contract.isContract()) 
                revert Inventory_InvalidERC1155Contract();

            inventorySL.itemSlot[items[i].erc1155Contract][items[i].id] = slotId;
        }

        emit ItemsAllowedInSlotUpdated(msg.sender, items);
    }

    function _disallowItems(
        InventoryStorage.Item[] calldata items
    ) internal virtual {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        for (uint i = 0; i < items.length; i++) {
            delete inventorySL.itemSlot[items[i].erc1155Contract][items[i].id];
        }

        emit ItemsAllowedInSlotUpdated(msg.sender, items);
    }

    function _allowedSlot(InventoryStorage.Item calldata item) internal view returns (uint) {
        return InventoryStorage.layout().itemSlot[item.erc1155Contract][item.id];
    }

    function _slot(uint8 slotId) internal view returns (InventoryStorage.Slot storage slot) {
        return InventoryStorage.layout().slots[slotId];
    }

    function _slotsAll() internal view returns (InventoryStorage.Slot[] memory slotsAll) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        
        uint8 numSlots = inventorySL.numSlots;
        slotsAll = new InventoryStorage.Slot[](numSlots);

        for (uint8 i = 0; i < numSlots; i++) {
            uint8 slotId = i + 1;
            slotsAll[i] = inventorySL.slots[slotId];
        }
    }
}