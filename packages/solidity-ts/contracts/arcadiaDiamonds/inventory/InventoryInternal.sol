// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { AddressUtils } from "@solidstate/contracts/utils/AddressUtils.sol";
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
    event ArcadiansAddressChanged(address indexed oldArcadiansAddress, address indexed newArcadiansAddress);

    event ItemsAllowedInSlotUpdated(
        address indexed by,
        uint slot,
        address itemAddress, 
        uint[] allowedItems
    );

    event ItemsEquipped(
        address indexed by,
        uint indexed arcadianId,
        uint[] slots,
        InventoryStorage.EquippedItem[] equippedItems
    );

    event ItemsUnequipped(
        address indexed by,
        uint indexed arcadianId,
        uint[] slots
    );

    event SlotCreated(
        address indexed by, 
        uint capacity,
        bool unequippable,
        uint slot
    );

    using AddressUtils for address;
    using EnumerableSet for EnumerableSet.UintSet;

    modifier onlyValidSlot(uint slot) {
        require(slot != 0, "InventoryFacet: Slot id can't be zero");
        require(slot <= InventoryStorage.layout().numSlots, "InventoryFacet: Invalid slot");
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

    modifier onlyValidAddress(address _address) {
        require(_address != address(0), "Invalid Address");
        _;
    }

    modifier onlyContract(address _address) {
        require(_address.isContract(), "InventoryFacet: Address given is not a contract");
        _;
    }

    function _numSlots() internal view returns (uint) {
        return InventoryStorage.layout().numSlots;
    }

    function _equip(
        uint arcadianId,
        uint slot,
        InventoryStorage.EquippedItem calldata itemToEquip
    ) internal onlyArcadianOwner(arcadianId) {

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        require(inventorySL.allowedSlots[itemToEquip.itemAddress][itemToEquip.id].contains(slot), "InventoryFacet.equip: Item not elegible for slot");
        require(inventorySL.slots[slot].capacity >= itemToEquip.amount, "InventoryFacet.equip: Item amount exceeds slot capacity");

        if (inventorySL.equippedItems[arcadianId][slot].amount != 0) {
            _unequipUnchecked(arcadianId, slot);
        }

        IERC1155 erc1155Contract = IERC1155(itemToEquip.itemAddress);
        require(
            erc1155Contract.balanceOf(msg.sender, itemToEquip.id) >= itemToEquip.amount,
            "InventoryFacet.equip: Message sender does not own enough of that item to equip"
        );

        erc1155Contract.safeTransferFrom(
            msg.sender,
            address(this),
            itemToEquip.id,
            itemToEquip.amount,
            ''
        );

        uint[] memory slots = new uint[](1);
        slots[0] = slot;
        InventoryStorage.EquippedItem[] memory itemsToEquip = new InventoryStorage.EquippedItem[](1);
        itemsToEquip[0] = itemToEquip;
        emit ItemsEquipped(
            msg.sender,
            arcadianId,
            slots,
            itemsToEquip
        );

        inventorySL.equippedItems[arcadianId][slot] = itemToEquip;
        require(_hashBaseItemsUnchecked(arcadianId), "InventoryFacet._equip: Base items are not unique");
    }

    function _equipBatch(
        uint arcadianId,
        uint[] calldata slots,
        InventoryStorage.EquippedItem[] calldata itemsToEquip
    ) internal onlyArcadianOwner(arcadianId) {
        require(slots.length == itemsToEquip.length, "InventoryFacet._equipBatch: Input data length mismatch");

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        for (uint i = 0; i < slots.length; i++) {
            InventoryStorage.EquippedItem calldata itemToEquip = itemsToEquip[i];
            IERC1155 erc1155Contract = IERC1155(itemToEquip.itemAddress);

            require(inventorySL.allowedSlots[itemToEquip.itemAddress][itemToEquip.id].contains(slots[i]), "InventoryFacet._equipBatch: Item not elegible for slot");
            require(inventorySL.slots[slots[i]].capacity >= itemToEquip.amount, "InventoryFacet._equipBatch: Item amount exceeds slot capacity");

            require(
                erc1155Contract.balanceOf(msg.sender, itemToEquip.id) >= itemToEquip.amount,
                "InventoryFacet.equip: Sender has insufficient item balance"
            );

            if (inventorySL.equippedItems[arcadianId][slots[i]].amount > 0) {
                _unequipUnchecked(arcadianId, slots[i]);
            }

            inventorySL.equippedItems[arcadianId][slots[i]] = InventoryStorage.EquippedItem({
                itemAddress: itemToEquip.itemAddress,
                id: itemToEquip.id,
                amount: itemToEquip.amount
            });

            erc1155Contract.safeTransferFrom(
                msg.sender,
                address(this),
                itemToEquip.id,
                itemToEquip.amount,
                ''
            );
        }

        emit ItemsEquipped(
            msg.sender,
            arcadianId,
            slots,
            itemsToEquip
        );

        bool isUnique = _hashBaseItemsUnchecked(arcadianId);
        require(isUnique, "InventoryFacet._equipBatch: Base items are not unique");
    }

    function _unequipUnchecked(
        uint arcadianId,
        uint slot
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        InventoryStorage.EquippedItem storage existingItem = inventorySL.equippedItems[arcadianId][slot];
        IERC1155 erc1155Contract = IERC1155(existingItem.itemAddress);
        erc1155Contract.safeTransferFrom(
            address(this),
            msg.sender,
            existingItem.id,
            existingItem.amount,
            ''
        );

        delete inventorySL.equippedItems[arcadianId][slot];
    }

    function _unequip(
        uint arcadianId,
        uint slot
    ) internal onlyArcadianOwner(arcadianId) onlyValidSlot(slot) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        require(!inventorySL.slots[slot].isUnequippable, "InventoryFacet._unequip: Slot is unequippable");
        require(inventorySL.equippedItems[arcadianId][slot].amount > 0, "InventoryFacet._unequip: Slot not equipped");
        
        _unequipUnchecked(arcadianId, slot);

        uint[] memory slots = new uint[](1);
        slots[0] = slot;

        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            slots
        );

        _hashBaseItemsUnchecked(arcadianId);
    }

    function _unequipBatch(
        uint arcadianId,
        uint[] calldata slots
    ) internal onlyArcadianOwner(arcadianId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        require(slots.length > 0, "InventoryFacet._unequip: Should specify at least one slot");

        for (uint i = 0; i < slots.length; i++) {
            uint slot = slots[i];
            require(slot > 0 && slot <= inventorySL.numSlots, "InventoryFacet._unequip: Invalid slot");
            require(!inventorySL.slots[slot].isUnequippable, "InventoryFacet._unequip: Slot is unequippable");
            require(inventorySL.equippedItems[arcadianId][slot].amount > 0, "InventoryFacet._unequip: Slot not equipped");
            
            _unequipUnchecked(arcadianId, slot);
        }

        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            slots
        );

        _hashBaseItemsUnchecked(arcadianId);
    }

    function _unequipAll(
        uint arcadianId
    ) internal {

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint numSlots = inventorySL.numSlots;
        uint numUnequippableSlots;
        for (uint i = 0; i < numSlots; i++) {
            uint slot = i + 1;
            if (!inventorySL.slots[slot].isUnequippable && inventorySL.equippedItems[arcadianId][slot].amount > 0) {
                numUnequippableSlots++;
            }
        }

        uint[] memory unequippedSlots = new uint[](numUnequippableSlots);
        uint counter;
        for (uint i = 0; i < numSlots; i++) {
            uint slot = i + 1;
            if (!inventorySL.slots[slot].isUnequippable && inventorySL.equippedItems[arcadianId][slot].amount > 0) {
                _unequipUnchecked(arcadianId, slot);
                unequippedSlots[counter] = slot;
                counter++;
            }
        }
        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            unequippedSlots
        );

        _hashBaseItemsUnchecked(arcadianId);
    }

    function _equipped(
        uint arcadianId,
        uint slot
    ) internal view returns (InventoryStorage.EquippedItem memory) {
        return InventoryStorage.layout().equippedItems[arcadianId][slot];
    }

    function _equippedAll(
        uint arcadianId
    ) internal view returns (InventoryStorage.EquippedItem[] memory) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint numSlots = inventorySL.numSlots;
        InventoryStorage.EquippedItem[] memory items = new InventoryStorage.EquippedItem[](numSlots);
        for (uint i = 0; i < numSlots; i++) {
            items[i] = inventorySL.equippedItems[arcadianId][i+1];
        }
        return items;
    }

    function _baseSlotsUnique(
        uint[] memory slots,
        address[] memory itemsAddresses,
        uint[] memory itemsIds
    ) internal view returns (bool) {
        require(slots.length == itemsAddresses.length && slots.length == itemsIds.length, "InventoryFacet._baseSlotsUnique: Input data length mismatch");
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        (slots, itemsAddresses, itemsIds) = _sortSlots(slots, itemsAddresses, itemsIds);
        EnumerableSet.UintSet storage baseSlots = inventorySL.categorySlots[InventoryStorage.SlotCategory.Base];
        bytes memory encodedItems;
        for (uint i = 0; i < slots.length; i++) {
            uint slot = slots[i];
            if (!baseSlots.contains(slot)) continue;
            encodedItems = abi.encodePacked(encodedItems, slot, itemsAddresses[i], itemsIds[i]);
        }
        return !inventorySL.baseItemsHashes.contains(keccak256(encodedItems));
    }

    function _sortSlots(
        uint[] memory slots,
        address[] memory itemsAddresses,
        uint[] memory itemsIds
    ) internal pure returns (uint[] memory, address[] memory, uint[] memory) {
        uint n = slots.length;
        for (uint i = 0; i < n - 1; i++) {
            uint minIdx = i;
            for (uint j = i + 1; j < n; j++) {
                if (slots[j] < slots[minIdx]) {
                    minIdx = j;
                }
            }
            if (minIdx != i) {
                uint tempSlot = slots[i];
                slots[i] = slots[minIdx];
                slots[minIdx] = tempSlot;

                address tempItemAddress = itemsAddresses[i];
                itemsAddresses[i] = itemsAddresses[minIdx];
                itemsAddresses[minIdx] = tempItemAddress;

                uint tempItemsIds = itemsIds[i];
                itemsIds[i] = itemsIds[minIdx];
                itemsIds[minIdx] = tempItemsIds;
            }
        }
        return (slots, itemsAddresses, itemsIds);
    }

    function _hashBaseItemsUnchecked(
        uint arcadianId
    ) internal returns (bool isUnique) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        bytes memory encodedItems;
        EnumerableSet.UintSet storage baseSlots = inventorySL.categorySlots[InventoryStorage.SlotCategory.Base];
        for (uint i = 0; i < baseSlots.length(); i++) {
            uint slot = baseSlots.at(i);
            InventoryStorage.EquippedItem storage equippedItem = inventorySL.equippedItems[arcadianId][slot];
            encodedItems = abi.encodePacked(encodedItems, slot, equippedItem.itemAddress, equippedItem.id);
        }
        bytes32 baseItemsHash = keccak256(encodedItems);
        isUnique = !inventorySL.baseItemsHashes.contains(baseItemsHash);
        inventorySL.baseItemsHashes.remove(inventorySL.arcadiansBaseItemsHashes[arcadianId]);
        inventorySL.baseItemsHashes.add(baseItemsHash);
        inventorySL.arcadiansBaseItemsHashes[arcadianId] = baseItemsHash;
    }

    function _createSlot(
        uint capacity,
        bool unequippable,
        InventoryStorage.SlotCategory category,
        address itemAddress,
        uint[] calldata allowedItemsIds
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        // slots are 1-index
        inventorySL.numSlots += 1;
        uint newSlot = inventorySL.numSlots;
        inventorySL.slots[newSlot].isUnequippable = unequippable;
        inventorySL.slots[newSlot].capacity = capacity;
        inventorySL.slots[newSlot].category = category;

        if (allowedItemsIds.length > 0) {
            require(itemAddress.isContract(), "InventoryFacet._createSlot: Invalid item address");
            _allowItemsInSlot(newSlot, itemAddress, allowedItemsIds);
        }

        emit SlotCreated(msg.sender, capacity, unequippable, newSlot);
    }

    function _allowItemsInSlot(
        uint slot,
        address itemAddress,
        uint[] calldata itemsIds
    ) internal virtual onlyValidSlot(slot) onlyValidAddress(itemAddress) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        for (uint i = 0; i < itemsIds.length; i++) {
            require(!inventorySL.allowedItems[slot][itemAddress].contains(itemsIds[i]), "InventoryFacet._disallowItemsInSlot: Item already allowed in the slot");
            inventorySL.allowedItems[slot][itemAddress].add(itemsIds[i]);
            inventorySL.allowedSlots[itemAddress][itemsIds[i]].add(slot);
        }
        inventorySL.categorySlots[inventorySL.slots[slot].category].add(slot);
        emit ItemsAllowedInSlotUpdated(msg.sender, slot, itemAddress, InventoryStorage.layout().allowedItems[slot][itemAddress].toArray());
    }

    function _disallowItemsInSlot(
        uint slot,
        address itemAddress,
        uint[] calldata itemsIds
    ) internal virtual onlyValidSlot(slot) onlyValidAddress(itemAddress) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        for (uint i = 0; i < itemsIds.length; i++) {
            require(inventorySL.allowedItems[slot][itemAddress].contains(itemsIds[i]), "InventoryFacet._disallowItemsInSlot: Item is not allowed in the slot");
            inventorySL.allowedItems[slot][itemAddress].remove(itemsIds[i]);
            inventorySL.allowedSlots[itemAddress][itemsIds[i]].remove(slot);
        }
        emit ItemsAllowedInSlotUpdated(msg.sender, slot, itemAddress, InventoryStorage.layout().allowedItems[slot][itemAddress].toArray());
    }

    function _getAllowedSlots(address itemAddress, uint itemId) internal view returns (uint[] memory) {
        return InventoryStorage.layout().allowedSlots[itemAddress][itemId].toArray();
    }

    function _getAllowedItems(uint slot, address itemAddress) internal view returns (uint[] memory) {
        return InventoryStorage.layout().allowedItems[slot][itemAddress].toArray();
    }

    function _getSlot(uint slot) internal view returns (InventoryStorage.Slot storage) {
        return InventoryStorage.layout().slots[slot];
    }
}