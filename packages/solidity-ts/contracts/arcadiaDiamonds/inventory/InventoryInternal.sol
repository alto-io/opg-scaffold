// SPDX-License-Identifier: UNLICENSED
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
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using AddressUtils for address;

    error Inventory_InvalidERC1155Contract();
    error Inventory_UnequippingPermanentSlot();
    error Inventory_InvalidSlotId();
    error Inventory_ItemNotElegibleForSlot();
    error Inventory_InsufficientItemBalance();
    error Inventory_SlotAlreadyEquipped();
    error Inventory_UnequippingEmptySlot();
    error Inventory_SlotNotSpecified();
    error Inventory_NotArcadianOwner();
    error Inventory_ArcadianNotUnique();
    error Inventory_InputDataMismatch();
    error Inventory_ItemAlreadyEquippedInSlot();
    error Inventory_ItemAlreadyAllowedInSlot();
    error Inventory_ItemAlreadyDisallowedInSlot();

    event ArcadiansAddressChanged(address indexed oldArcadiansAddress, address indexed newArcadiansAddress);

    event ItemsAllowedInSlotUpdated(
        address indexed by,
        uint slotId
    );

    event ItemsEquipped(
        address indexed by,
        uint indexed arcadianId,
        uint[] slots
    );

    event ItemsUnequipped(
        address indexed by,
        uint indexed arcadianId,
        uint[] slots
    );

    event SlotCreated(
        address indexed by,
        uint slotId,
        bool permanent,
        InventoryStorage.SlotCategory category
    );

    // Helper struct only used in view functions
    struct ItemInSlot {
        uint slotId;
        address erc721Contract;
        uint itemId;
    }

    modifier onlyValidSlot(uint slotId) {
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
        uint slotId,
        InventoryStorage.Item calldata item
    ) internal onlyArcadianOwner(arcadianId) onlyValidSlot(slotId) {

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        
        if (inventorySL.itemSlot[item.erc721Contract][item.id] != slotId) 
            revert Inventory_ItemNotElegibleForSlot();

        InventoryStorage.Item storage existingItem = inventorySL.equippedItems[arcadianId][slotId];
        if (inventorySL.slots[slotId].permanent && existingItem.erc721Contract != address(0)) 
            revert Inventory_UnequippingPermanentSlot();

        _unequipUnchecked(arcadianId, slotId);

        IERC1155 erc1155Contract = IERC1155(item.erc721Contract);
        if (erc1155Contract.balanceOf(msg.sender, item.id) < 1)
            revert Inventory_InsufficientItemBalance();

        if (existingItem.erc721Contract == item.erc721Contract && existingItem.id == item.id)
            revert Inventory_ItemAlreadyEquippedInSlot();

        erc1155Contract.safeTransferFrom(
            msg.sender,
            address(this),
            item.id,
            1,
            ''
        );

        inventorySL.equippedItems[arcadianId][slotId] = item;

        if (!_hashBaseItemsUnchecked(arcadianId)) 
            revert Inventory_ArcadianNotUnique();

        uint[] memory slotsIds = new uint[](1);
        slotsIds[0] = slotId;
        emit ItemsEquipped(
            msg.sender,
            arcadianId,
            slotsIds
        );
    }

    function _equipBatch(
        uint arcadianId,
        uint[] calldata slotIds,
        InventoryStorage.Item[] calldata items
    ) internal onlyArcadianOwner(arcadianId) {

        if (slotIds.length == 0) revert Inventory_SlotNotSpecified();

        if (slotIds.length != items.length) revert Inventory_InputDataMismatch();

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint numSlots = inventorySL.numSlots;
        for (uint i = 0; i < slotIds.length; i++) {
            uint slotId = slotIds[i];

            if (slotId == 0 && slotId > numSlots) 
                revert Inventory_InvalidSlotId();
            
            if (inventorySL.itemSlot[items[i].erc721Contract][items[i].id] != slotId) 
                revert Inventory_ItemNotElegibleForSlot();

            InventoryStorage.Item storage existingItem = inventorySL.equippedItems[arcadianId][slotId];

            if (existingItem.erc721Contract == items[i].erc721Contract && existingItem.id == items[i].id)
                revert Inventory_ItemAlreadyEquippedInSlot();

            if (inventorySL.slots[slotId].permanent && existingItem.erc721Contract != address(0)) 
                revert Inventory_UnequippingPermanentSlot();

            _unequipUnchecked(arcadianId, slotId);

            inventorySL.equippedItems[arcadianId][slotId] = items[i];

            IERC1155 erc1155Contract = IERC1155(items[i].erc721Contract);
            if (erc1155Contract.balanceOf(msg.sender, items[i].id) < 1) 
                revert Inventory_InsufficientItemBalance();

            erc1155Contract.safeTransferFrom(
                msg.sender,
                address(this),
                items[i].id,
                1,
                ''
            );
        }

        if (!_hashBaseItemsUnchecked(arcadianId)) 
            revert Inventory_ArcadianNotUnique();

        emit ItemsEquipped(
            msg.sender,
            arcadianId,
            slotIds
        );
    }

    function _unequipUnchecked(
        uint arcadianId,
        uint slotId
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        InventoryStorage.Item storage existingItem = inventorySL.equippedItems[arcadianId][slotId];
        IERC1155 erc1155Contract = IERC1155(existingItem.erc721Contract);

        if (existingItem.erc721Contract == address(0)) 
            return;

        erc1155Contract.safeTransferFrom(
            address(this),
            msg.sender,
            existingItem.id,
            1,
            ''
        );
        delete inventorySL.equippedItems[arcadianId][slotId];
    }

    function _unequip(
        uint arcadianId,
        uint slotId
    ) internal onlyArcadianOwner(arcadianId) onlyValidSlot(slotId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        if (inventorySL.slots[slotId].permanent) 
            revert Inventory_UnequippingPermanentSlot();

        if (inventorySL.equippedItems[arcadianId][slotId].erc721Contract == address(0)) 
            revert Inventory_UnequippingEmptySlot();
        
        _unequipUnchecked(arcadianId, slotId);

        _hashBaseItemsUnchecked(arcadianId);

        uint[] memory slots = new uint[](1);
        slots[0] = slotId;
        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            slots
        );
    }

    function _unequipBatch(
        uint arcadianId,
        uint[] calldata slotIds
    ) internal onlyArcadianOwner(arcadianId) {

        if (slotIds.length == 0) revert Inventory_SlotNotSpecified();

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint numSlots = inventorySL.numSlots;

        for (uint i = 0; i < slotIds.length; i++) {
            uint slotId = slotIds[i];

            if (slotId == 0 || slotId > numSlots) 
                revert Inventory_InvalidSlotId();

            if (inventorySL.slots[slotId].permanent) 
                revert Inventory_UnequippingPermanentSlot();

            if (inventorySL.equippedItems[arcadianId][slotId].erc721Contract == address(0)) 
                revert Inventory_UnequippingEmptySlot();
            
            _unequipUnchecked(arcadianId, slotId);
        }

        _hashBaseItemsUnchecked(arcadianId);

        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            slotIds
        );
    }

    function _equipped(
        uint arcadianId,
        uint slotId
    ) internal view returns (ItemInSlot memory) {
        InventoryStorage.Item storage item = InventoryStorage.layout().equippedItems[arcadianId][slotId];
        return ItemInSlot(slotId, item.erc721Contract, item.id);
    }

    function _equippedAll(
        uint arcadianId
    ) internal view returns (ItemInSlot[] memory equippedSlots) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint numSlots = inventorySL.numSlots;
        equippedSlots = new ItemInSlot[](numSlots);
        for (uint i = 0; i < numSlots; i++) {
            uint slot = i + 1;
            InventoryStorage.Item storage equippedItem = inventorySL.equippedItems[arcadianId][slot];
            equippedSlots[i] = ItemInSlot(slot, equippedItem.erc721Contract, equippedItem.id);
        }
    }

    function _isArcadianUnique(
        uint arcadianId,
        uint[] calldata slotsIds,
        InventoryStorage.Item[] calldata items
    ) internal view returns (bool) {
        if (slotsIds.length != items.length) 
            revert Inventory_InputDataMismatch();

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        EnumerableSet.UintSet storage baseSlots = inventorySL.categoryToSlots[InventoryStorage.SlotCategory.Base];

        uint baseSlotsLength = baseSlots.length();
        uint[] memory baseSlotsIds = new uint[](baseSlotsLength);
        InventoryStorage.Item[] memory baseItems = new InventoryStorage.Item[](baseSlotsLength);
        uint numSlots = inventorySL.numSlots;

        for (uint i = 0; i < baseSlotsLength; i++) {
            uint slotId = baseSlots.at(i);
            baseSlotsIds[i] = slotId;
            baseItems[i] = inventorySL.equippedItems[arcadianId][slotId];
        }

        for (uint i = 0; i < slotsIds.length; i++) {
            uint slotId = slotsIds[i];
            
            if (slotId == 0 && slotId > numSlots) 
                revert Inventory_InvalidSlotId();

            if (!baseSlots.contains(slotId)) continue;

            baseSlotsIds[i] = slotId;
            baseItems[i] = items[i];
        }

        bytes memory encodedItems;
        for (uint i = 0; i < baseSlotsIds.length; i++) {
            encodedItems = abi.encodePacked(encodedItems, baseSlotsIds[i], baseItems[i].erc721Contract, baseItems[i].id);
        }

        return !inventorySL.baseItemsHashes.contains(keccak256(encodedItems));
    }

    function _hashBaseItemsUnchecked(
        uint arcadianId
    ) internal returns (bool isUnique) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        EnumerableSet.UintSet storage baseSlots = inventorySL.categoryToSlots[InventoryStorage.SlotCategory.Base];
        bytes memory encodedItems;
        uint baseSlotsLength = baseSlots.length();

        for (uint i = 0; i < baseSlotsLength; i++) {
            uint slotId = baseSlots.at(i);
            InventoryStorage.Item storage equippedItem = inventorySL.equippedItems[arcadianId][slotId];
            encodedItems = abi.encodePacked(encodedItems, slotId, equippedItem.erc721Contract, equippedItem.id);
        }

        bytes32 baseItemsHash = keccak256(encodedItems);
        isUnique = !inventorySL.baseItemsHashes.contains(baseItemsHash);
        inventorySL.baseItemsHashes.remove(inventorySL.arcadianToBaseItemHash[arcadianId]);
        inventorySL.baseItemsHashes.add(baseItemsHash);
        inventorySL.arcadianToBaseItemHash[arcadianId] = baseItemsHash;
    }

    function _createSlot(
        bool permanent,
        InventoryStorage.SlotCategory category,
        InventoryStorage.Item[] calldata allowedItems
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        // slots are 1-index
        inventorySL.numSlots += 1;
        uint newSlot = inventorySL.numSlots;
        inventorySL.slots[newSlot].permanent = permanent;
        inventorySL.slots[newSlot].category = category;
        inventorySL.slots[newSlot].id = newSlot;

        if (allowedItems.length > 0) {
            _allowItemsInSlot(newSlot, allowedItems);
        }

        emit SlotCreated(msg.sender, newSlot, permanent, category);
    }

    function _allowItemsInSlot(
        uint slotId,
        InventoryStorage.Item[] calldata items
    ) internal virtual onlyValidSlot(slotId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        for (uint i = 0; i < items.length; i++) {
            if (!items[i].erc721Contract.isContract()) 
                revert Inventory_InvalidERC1155Contract();

            if (inventorySL.itemSlot[items[i].erc721Contract][items[i].id] > 0) {

                if (inventorySL.itemSlot[items[i].erc721Contract][items[i].id] == slotId) 
                    revert Inventory_ItemAlreadyAllowedInSlot();

                _disallowItemInSlotUnchecked(slotId, items[i]);
            }
            inventorySL.allowedItems[slotId].push(items[i]);
            inventorySL.itemSlot[items[i].erc721Contract][items[i].id] = slotId;
        }

        inventorySL.categoryToSlots[inventorySL.slots[slotId].category].add(slotId);

        emit ItemsAllowedInSlotUpdated(msg.sender, slotId);
    }

    function _disallowItemsInSlot(
        uint slotId,
        InventoryStorage.Item[] calldata items
    ) internal virtual onlyValidSlot(slotId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        for (uint i = 0; i < items.length; i++) {
            
            if (inventorySL.itemSlot[items[i].erc721Contract][items[i].id] != slotId) 
                revert Inventory_ItemAlreadyDisallowedInSlot();
                
            _disallowItemInSlotUnchecked(slotId, items[i]);
        }

        emit ItemsAllowedInSlotUpdated(msg.sender, slotId);
    }

    function _disallowItemInSlotUnchecked(
        uint slotId,
        InventoryStorage.Item calldata item
    ) internal virtual {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        
        uint numAllowedSlots = inventorySL.allowedItems[slotId].length;
        for (uint i = 0; i < numAllowedSlots; i++) {
            if (inventorySL.allowedItems[slotId][i].id == item.id) {
                inventorySL.allowedItems[slotId][i] = inventorySL.allowedItems[slotId][numAllowedSlots-1];
                inventorySL.allowedItems[slotId].pop();
                break;
            }
        }
        
        delete inventorySL.itemSlot[item.erc721Contract][item.id];
    }

    function _allowedSlot(InventoryStorage.Item calldata item) internal view returns (uint) {
        return InventoryStorage.layout().itemSlot[item.erc721Contract][item.id];
    }

    function _allowedItem(uint slotId, uint index) internal view onlyValidSlot(slotId) returns (InventoryStorage.Item memory) {
        return InventoryStorage.layout().allowedItems[slotId][index];
    }

    function _numAllowedItems(uint slotId) internal view onlyValidSlot(slotId) returns (uint) {
        return InventoryStorage.layout().allowedItems[slotId].length;
    }

    function _slot(uint slotId) internal view returns (InventoryStorage.Slot storage slot) {
        return InventoryStorage.layout().slots[slotId];
    }

    function _slotsAll() internal view returns (InventoryStorage.Slot[] memory slotsAll) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        
        uint numSlots = inventorySL.numSlots;
        slotsAll = new InventoryStorage.Slot[](numSlots);

        for (uint i = 0; i < numSlots; i++) {
            uint slotId = i + 1;
            slotsAll[i] = inventorySL.slots[slotId];
        }
    }
}