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
        bool unequippable,
        InventoryStorage.SlotCategory category
    );

    modifier onlyValidSlot(uint slotId) {
        require(slotId != 0, "InventoryFacet: Slot id can't be zero");
        require(slotId <= InventoryStorage.layout().numSlots, "InventoryFacet: Invalid slot");
        _;
    }

    modifier onlyArcadianOwner(uint arcadianId) {
        IERC721 arcadiansContract = IERC721(address(this));
        require(
            msg.sender == arcadiansContract.ownerOf(arcadianId),
            "InventoryFacet: Message sender is not owner of the arcadian"
        );
        _;
    }

    function _numSlots() internal view returns (uint) {
        return InventoryStorage.layout().numSlots;
    }

    // Helper struct only used in view functions
    struct ItemInSlot {
        uint slotId;
        address contractAddress;
        uint itemId;
    }

    function _equip(
        uint arcadianId,
        uint slotId,
        InventoryStorage.Item calldata item
    ) internal onlyArcadianOwner(arcadianId) onlyValidSlot(slotId) {

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        require(
            inventorySL.itemSlot[item.contractAddress][item.id] == slotId, 
            "InventoryFacet.equip: Item not elegible for slot"
        );
        require(
            !inventorySL.slots[slotId].unequippable || inventorySL.equippedItems[arcadianId][slotId].contractAddress == address(0), 
            "InventoryFacet.equip: Unequippable slots already has an item"
        );

        _unequipUnchecked(arcadianId, slotId);

        IERC1155 erc1155Contract = IERC1155(item.contractAddress);
        require(
            erc1155Contract.balanceOf(msg.sender, item.id) > 0,
            "InventoryFacet.equip: Message sender does not own enough of that item to equip"
        );

        erc1155Contract.safeTransferFrom(
            msg.sender,
            address(this),
            item.id,
            1,
            ''
        );

        inventorySL.equippedItems[arcadianId][slotId] = item;

        require(
            _hashBaseItemsUnchecked(arcadianId), 
            "InventoryFacet._equip: Base items are not unique"
        );

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
    ) internal {

        require(
            slotIds.length > 0, 
            "InventoryFacet._equipBatch: Should specify at least one slot"
        );
        require(
            slotIds.length == items.length, 
            "InventoryFacet._equipBatch: Input data length mismatch"
        );

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint numSlots = inventorySL.numSlots;
        for (uint i = 0; i < slotIds.length; i++) {
            uint slotId = slotIds[i];
            require(
                slotId > 0 && slotId <= numSlots, 
                "InventoryFacet._equipBatch: Invalid slot"
            );
            require(
                inventorySL.itemSlot[items[i].contractAddress][items[i].id] == slotId, 
                "InventoryFacet._equipBatch: Item not elegible for slot"
            );

            IERC1155 erc1155Contract = IERC1155(items[i].contractAddress);
            require(
                erc1155Contract.balanceOf(msg.sender, items[i].id) > 0,
                "InventoryFacet._equipBatch: Sender has insufficient item balance"
            );

            InventoryStorage.Item storage existingItem = inventorySL.equippedItems[arcadianId][slotId];
            require(
                !inventorySL.slots[slotId].unequippable || existingItem.contractAddress == address(0), 
                "InventoryFacet._equipBatch: Unequippable slots already has an item"
            );

            if (existingItem.contractAddress == items[i].contractAddress && existingItem.id == items[i].id) {
                continue;
            }

            _unequipUnchecked(arcadianId, slotId);

            inventorySL.equippedItems[arcadianId][slotId] = items[i];

            erc1155Contract.safeTransferFrom(
                msg.sender,
                address(this),
                items[i].id,
                1,
                ''
            );
        }

        require(_hashBaseItemsUnchecked(arcadianId), "InventoryFacet._equipBatch: Base items are not unique");

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
        IERC1155 erc1155Contract = IERC1155(existingItem.contractAddress);
        if (existingItem.contractAddress != address(0)) {
            erc1155Contract.safeTransferFrom(
                address(this),
                msg.sender,
                existingItem.id,
                1,
                ''
            );
            delete inventorySL.equippedItems[arcadianId][slotId];
        }
    }

    function _unequip(
        uint arcadianId,
        uint slotId
    ) internal onlyArcadianOwner(arcadianId) onlyValidSlot(slotId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        require(!inventorySL.slots[slotId].unequippable, "InventoryFacet._unequip: Slot is unequippable");
        require(inventorySL.equippedItems[arcadianId][slotId].contractAddress != address(0), "InventoryFacet._unequip: Slot not equipped");
        
        _unequipUnchecked(arcadianId, slotId);

        uint[] memory slots = new uint[](1);
        slots[0] = slotId;

        _hashBaseItemsUnchecked(arcadianId);

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
        require(slotIds.length > 0, "InventoryFacet._unequipBatch: Should specify at least one slot");

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        for (uint i = 0; i < slotIds.length; i++) {
            uint slotId = slotIds[i];
            require(slotId > 0 && slotId <= inventorySL.numSlots, "InventoryFacet._unequipBatch: Invalid slot");
            require(!inventorySL.slots[slotId].unequippable, "InventoryFacet._unequipBatch: Slot is unequippable");
            require(inventorySL.equippedItems[arcadianId][slotId].contractAddress != address(0), "InventoryFacet._unequipBatch: Slot not equipped");
            
            _unequipUnchecked(arcadianId, slotId);
        }

        _hashBaseItemsUnchecked(arcadianId);

        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            slotIds
        );
    }

    // Function only to be called by the arcadians contract when these are tansfered, in order to unequip the equipped items
    function _unequipAllUnchecked(
        uint arcadianId
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        uint numSlots = inventorySL.numSlots;
        uint numUnequippableSlots;
        for (uint slotId = 1; slotId <= numSlots; slotId++) {
            if (!inventorySL.slots[slotId].unequippable && inventorySL.equippedItems[arcadianId][slotId].contractAddress != address(0)) {
                numUnequippableSlots++;
            }
        }

        uint[] memory unequippedSlots = new uint[](numUnequippableSlots);
        uint counter;
        for (uint slotId = 1; slotId <= numSlots; slotId++) {
            if (!inventorySL.slots[slotId].unequippable && inventorySL.equippedItems[arcadianId][slotId].contractAddress != address(0)) {
                _unequipUnchecked(arcadianId, slotId);
                unequippedSlots[counter] = slotId;
                counter++;
            }
        }

        if (unequippedSlots.length > 0) {
            _hashBaseItemsUnchecked(arcadianId);

            emit ItemsUnequipped(
                msg.sender,
                arcadianId,
                unequippedSlots
            );
        }
    }

    function _equipped(
        uint arcadianId,
        uint slotId
    ) internal view returns (ItemInSlot memory) {
        InventoryStorage.Item storage item = InventoryStorage.layout().equippedItems[arcadianId][slotId];
        return ItemInSlot(slotId, item.contractAddress, item.id);
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
            equippedSlots[i] = ItemInSlot(slot, equippedItem.contractAddress, equippedItem.id);
        }
    }

    function _isArcadianUnique(
        uint arcadianId,
        uint[] calldata slotsIds,
        InventoryStorage.Item[] calldata items
    ) internal view returns (bool) {
        require(
            slotsIds.length == items.length, 
            "InventoryFacet._isArcadianUnique: Input data length mismatch"
        );
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
            require(
                slotId > 0 && slotId <= numSlots, 
                "InventoryFacet._isArcadianUnique: Invalid slot"
            );
            if (!baseSlots.contains(slotId)) continue;
            baseSlotsIds[i] = slotId;
            baseItems[i] = items[i];
        }

        bytes memory encodedItems;
        for (uint i = 0; i < baseSlotsIds.length; i++) {
            encodedItems = abi.encodePacked(encodedItems, baseSlotsIds[i], baseItems[i].contractAddress, baseItems[i].id);
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
            encodedItems = abi.encodePacked(encodedItems, slotId, equippedItem.contractAddress, equippedItem.id);
        }

        bytes32 baseItemsHash = keccak256(encodedItems);
        isUnique = !inventorySL.baseItemsHashes.contains(baseItemsHash);
        inventorySL.baseItemsHashes.remove(inventorySL.arcadianToBaseItemHash[arcadianId]);
        inventorySL.baseItemsHashes.add(baseItemsHash);
        inventorySL.arcadianToBaseItemHash[arcadianId] = baseItemsHash;
    }

    function _createSlot(
        bool unequippable,
        InventoryStorage.SlotCategory category,
        InventoryStorage.Item[] calldata allowedItems
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        // slots are 1-index
        inventorySL.numSlots += 1;
        uint newSlot = inventorySL.numSlots;
        inventorySL.slots[newSlot].unequippable = unequippable;
        inventorySL.slots[newSlot].category = category;
        inventorySL.slots[newSlot].id = newSlot;

        if (allowedItems.length > 0) {
            _allowItemsInSlot(newSlot, allowedItems);
        }

        emit SlotCreated(msg.sender, newSlot, unequippable, category);
    }

    function _allowItemsInSlot(
        uint slotId,
        InventoryStorage.Item[] calldata items
    ) internal virtual onlyValidSlot(slotId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        for (uint i = 0; i < items.length; i++) {
            require(
                items[i].contractAddress.isContract(), 
                "InventoryFacet._allowItemsInSlot: Invalid items contract address"
            );
            require(
                inventorySL.itemSlot[items[i].contractAddress][items[i].id] != slotId, 
                "InventoryFacet._allowItemsInSlot: Item already allowed in the slot"
            );

            if (inventorySL.itemSlot[items[i].contractAddress][items[i].id] > 0) {
                _disallowItemInSlotUnchecked(slotId, items[i]);
            }
            inventorySL.slots[slotId].allowedItems.push(items[i]);
            inventorySL.itemSlot[items[i].contractAddress][items[i].id] = slotId;
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
            require(
                inventorySL.itemSlot[items[i].contractAddress][items[i].id] == slotId, 
                "InventoryFacet._disallowItemsInSlot: Item already not allowed in the slot"
            );
            _disallowItemInSlotUnchecked(slotId, items[i]);
        }

        emit ItemsAllowedInSlotUpdated(msg.sender, slotId);
    }

    function _disallowItemInSlotUnchecked(
        uint slotId,
        InventoryStorage.Item calldata item
    ) internal virtual {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        
        for (uint i = 0; i < inventorySL.slots[slotId].allowedItems.length; i++) {
            if (inventorySL.slots[slotId].allowedItems[i].id == item.id) {
                inventorySL.slots[slotId].allowedItems[i] = inventorySL.slots[slotId].allowedItems[inventorySL.slots[slotId].allowedItems.length-1];
                inventorySL.slots[slotId].allowedItems.pop();
                break;
            }
        }
        
        delete inventorySL.itemSlot[item.contractAddress][item.id];
    }

    function _allowedSlot(InventoryStorage.Item calldata item) internal view returns (uint) {
        return InventoryStorage.layout().itemSlot[item.contractAddress][item.id];
    }

    function _allowedItems(uint slotId) internal view onlyValidSlot(slotId) returns (InventoryStorage.Item[] memory) {
        return InventoryStorage.layout().slots[slotId].allowedItems;
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