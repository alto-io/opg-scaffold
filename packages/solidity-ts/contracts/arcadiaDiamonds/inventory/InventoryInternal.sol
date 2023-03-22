
pragma solidity ^0.8.19;

import { RolesInternal } from "../roles/RolesInternal.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { InventoryStorage } from "./InventoryStorage.sol";
import { ItemsStorage } from "../items/ItemsStorage.sol";

contract InventoryInternal is
    ReentrancyGuard,
    RolesInternal,
    ERC1155BaseInternal
{

    event ArcadiansAddressChanged(address indexed oldArcadiansAddress, address indexed newArcadiansAddress);

    event SlotAllowedToUnequip(
        address indexed by,
        uint indexed slot
    );

    event ItemAllowedInSlot(
        address indexed by, 
        address itemAddress, 
        uint itemId,
        uint slot
    );

    event ItemEquipped(
        address indexed by,
        uint indexed arcadianId,
        address indexed itemAddress,
        uint itemId,
        uint amount,
        uint slot
    );

    event ItemUnequipped(
        address indexed by,
        uint indexed arcadianId,
        address indexed itemAddress,
        uint itemId,
        uint amount,
        uint slot
    );

    event SlotCreated(
        address indexed by, 
        address itemAddress, 
        uint[] allowedItemIds,
        uint capacity,
        bool unequippable,
        uint slot
    );

    modifier onlyValidSlot(uint slot) {
        require(slot != 0, "Slot id can't be zero");
        require(slot <= InventoryStorage.layout().numSlots, "Inexistent slot id");
        _;
    }

    modifier onlyArcadianOwner(uint arcadianId) {
        IERC721 arcadiansContract = IERC721(InventoryStorage.layout().arcadiansAddress);
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

    function _setArcadiansAddress(address newArcadiansAddress) internal onlyManager onlyValidAddress(newArcadiansAddress) {
        InventoryStorage.Layout storage itemsSL = InventoryStorage.layout();
        if (newArcadiansAddress != itemsSL.arcadiansAddress) {
            emit ArcadiansAddressChanged(itemsSL.arcadiansAddress, newArcadiansAddress);
            itemsSL.arcadiansAddress = newArcadiansAddress;
        }
    }

    function _getArcadiansAddress() internal view returns (address) {
        return InventoryStorage.layout().arcadiansAddress;
    }

    function _numSlots() internal view returns (uint) {
        return InventoryStorage.layout().numSlots;
    }

    function _unequipBatch(
        uint arcadianId
    ) internal onlyArcadianOwner(arcadianId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        for (uint i = 0; i < inventorySL.numSlots; i++) {
            _unequip(arcadianId, i+1, true, 0);
            _unequipWithoutArcadianOwnershipCheck(arcadianId, i+1, true, 0);
        }
    }

    function _unequip(
        uint arcadianId,
        uint slot,
        bool unequipAll,
        uint amount
    ) internal onlyArcadianOwner(arcadianId) {
        _unequipWithoutArcadianOwnershipCheck(arcadianId, slot, unequipAll, amount);
    }

    function _unequipWithoutArcadianOwnershipCheck(
        uint arcadianId,
        uint slot,
        bool unequipAll,
        uint amount
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        require(
            !inventorySL.slots[slot].isUnequippable,
            "InventoryFacet._unequip: That slot is not unequippable"
        );

        InventoryStorage.EquippedItem storage existingItem = inventorySL.equippedItems[arcadianId][slot];

        if (unequipAll) {
            amount = existingItem.amount;
        }

        require(
            amount <= existingItem.amount,
            "InventoryFacet._unequip: Attempting to unequip too many items from the slot"
        );

        _safeTransfer(
            msg.sender,
            address(this),
            msg.sender,
            existingItem.id,
            amount,
            ""
        );

        emit ItemUnequipped(
            msg.sender,
            arcadianId,
            existingItem.itemAddress,
            existingItem.id,
            amount,
            slot
        );

        existingItem.amount -= amount;
        if (existingItem.amount == 0) {
            delete inventorySL.equippedItems[arcadianId][slot];
        }
    }

    function _validateItemForSlot(uint slot, uint itemId, uint amount) internal view {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint[] storage allowedItemsIds = inventorySL.slots[slot].allowedItemsIds;
        for (uint i = 0; i < allowedItemsIds.length; i++) {
            if (allowedItemsIds[i] == itemId) {
                require(amount <= inventorySL.slots[slot].capacity, "Amount exceeds slot capacity");
                return;
            }
        }
        revert("Item not elegible for slot");
    }

    function _equip(
        uint arcadianId,
        address itemAddress,
        uint itemId,
        uint amount,
        uint slot
    ) internal onlyArcadianOwner(arcadianId) {
        _equipWithoutArcadianOwnershipCheck(arcadianId, itemAddress, itemId, amount, slot);
    }

    function _equipBatch(
        uint arcadianId,
        address itemAddress,
        uint[] calldata itemIds,
        uint[] calldata amounts,
        uint[] calldata slots
    ) internal onlyArcadianOwner(arcadianId) {
        require(slots.length == itemIds.length && itemIds.length == amounts.length, "Input data length mismatch");

        for (uint i = 0; i < itemIds.length; i++) {
            _equipWithoutArcadianOwnershipCheck(arcadianId, itemAddress, itemIds[i], amounts[i], slots[i]);
        }
    }

    function _equipWithoutArcadianOwnershipCheck(
        uint arcadianId,
        address itemAddress,
        uint itemId,
        uint amount,
        uint slot
    ) internal onlyValidSlot(slot) {
        _validateItemForSlot(slot, itemId, amount);

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        if (
            inventorySL.equippedItems[arcadianId][slot].amount != 0
        ) {
            _unequip(arcadianId, slot, true, 0);
        }
        
        require(
            _balanceOf(msg.sender, itemId) >= amount,
            "InventoryFacet.equip: Message sender does not own enough of that item to equip"
        );
    
        _safeTransfer(
            msg.sender,
            msg.sender,
            address(this),
            itemId,
            amount,
            ""
        );

        emit ItemEquipped(
            msg.sender,
            arcadianId,
            itemAddress,
            itemId,
            amount,
            slot
        );

        inventorySL.equippedItems[arcadianId][slot] = InventoryStorage.EquippedItem({
            itemAddress: itemAddress,
            id: itemId,
            amount: amount
        });
    }

    function _equipped(
        uint arcadianId,
        uint slot
    ) internal view returns (InventoryStorage.EquippedItem memory item) {
        return InventoryStorage.layout().equippedItems[arcadianId][slot];
    }

    function _equippedBatch(
        uint arcadianId
    ) internal view returns (InventoryStorage.EquippedItem[] memory item) {
        uint numSlots = InventoryStorage.layout().numSlots;
        InventoryStorage.EquippedItem[] memory items = new InventoryStorage.EquippedItem[](numSlots);
        for (uint i = 0; i < numSlots; i++) {
            items[i] = _equipped(arcadianId, i+1);
        }
        return items;
    }

    function _createSlot(
        address itemAddress,
        uint[] calldata allowedItemIds,
        uint capacity,
        bool unequippable
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        // slots are 1-index
        inventorySL.numSlots += 1;
        uint newSlot = inventorySL.numSlots;
        inventorySL.slots[newSlot].isUnequippable = unequippable;
        inventorySL.slots[newSlot].capacity = capacity;

        if (allowedItemIds.length > 0) {
            _allowItemsInSlot(itemAddress, allowedItemIds, newSlot);
        }

        emit SlotCreated(msg.sender, itemAddress, allowedItemIds, capacity, unequippable, newSlot);
    }

    function _allowSlotToUnequip(
        uint slot
    ) internal onlyValidSlot(slot) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        require(inventorySL.slots[slot].isUnequippable, "Slot already unquippable");
        inventorySL.slots[slot].isUnequippable = false;
        emit SlotAllowedToUnequip(msg.sender, slot);
    }

    function _allowItemInSlot(
        address itemAddress,
        uint itemId,
        uint slot
    ) internal onlyValidSlot(slot) onlyValidAddress(itemAddress) {
        _allowItemInSlotUnchecked(itemAddress, itemId, slot);
    }

    function _allowItemsInSlot(
        address itemAddress,
        uint[] calldata itemIds,
        uint slot
    ) internal virtual onlyValidSlot(slot) onlyValidAddress(itemAddress) {
        for (uint i = 0; i < itemIds.length; i++) {
            _allowItemInSlotUnchecked(itemAddress, itemIds[i], slot);
        }
    }

    function _allowItemInSlotUnchecked(
        address itemAddress,
        uint itemId,
        uint slot
    ) internal virtual {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        inventorySL.slots[slot].allowedItemsIds.push(itemId);
        inventorySL.itemAllowedSlots[itemAddress][itemId].push(slot);
        emit ItemAllowedInSlot(msg.sender, itemAddress, itemId, slot);
    }

    function _getSlot(uint slot) internal view returns (InventoryStorage.Slot storage) {
        return InventoryStorage.layout().slots[slot];
    }
}