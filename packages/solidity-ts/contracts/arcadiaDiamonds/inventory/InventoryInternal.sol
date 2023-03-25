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
    }

    function _unequipAll(
        uint arcadianId
    ) internal {

            InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

            for (uint slot = 1; slot <= inventorySL.numSlots; slot++) {
                if (!inventorySL.slots[slot].isUnequippable && inventorySL.equippedItems[arcadianId][slot].amount > 0) {
                    _unequipUnchecked(arcadianId, slot);
                }
            }
            emit ItemsUnequipped(
                msg.sender,
                arcadianId,
                new uint[](0)
            );
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
        uint numSlots = InventoryStorage.layout().numSlots;
        InventoryStorage.EquippedItem[] memory items = new InventoryStorage.EquippedItem[](numSlots);
        for (uint i = 0; i < numSlots; i++) {
            items[i] = _equipped(arcadianId, i+1);
        }
        return items;
    }

    function _createSlot(
        uint capacity,
        bool unequippable,
        address itemAddress,
        uint[] calldata allowedItemsIds
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        // slots are 1-index
        inventorySL.numSlots += 1;
        uint newSlot = inventorySL.numSlots;
        inventorySL.slots[newSlot].isUnequippable = unequippable;
        inventorySL.slots[newSlot].capacity = capacity;

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