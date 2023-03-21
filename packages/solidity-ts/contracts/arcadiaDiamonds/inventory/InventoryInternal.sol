
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

    event ItemMarkedAsEquippableInSlot(
        uint256 indexed slot,
        address indexed itemAddress,
        uint256 itemPoolId,
        uint256 maxAmount
    );

    event ItemEquipped(
        uint256 indexed arcadianId,
        uint256 indexed slot,
        uint256 itemId,
        uint256 amount,
        address equippedBy
    );

    event ItemUnequipped(
        uint256 indexed arcadianId,
        uint256 indexed slot,
        uint256 itemId,
        uint256 amount,
        address unequippedBy
    );

    modifier onlyValidSlot(uint slot) {
        require(slot != 0, "Slot id can't be zero");
        require(slot <= InventoryStorage.layout().numSlots, "Inexistent slot id");
        _;
    }

    modifier onlyValidItemId(uint itemId) {
        require(itemId > 0, "Item id can't be zero");
        _;
    }

    modifier onlyArcadianOwner(uint arcadianId) {
        IERC721 arcadiansContract = IERC721(InventoryStorage.layout().arcadiansAddress);
        require(
            msg.sender == arcadiansContract.ownerOf(arcadianId),
            "InventoryFacet.equip: Message sender is not owner of the arcadian"
        );
        _;
    }

    function _setArcadiansAddress(address newArcadiansAddress) internal onlyManager {
        InventoryStorage.Layout storage itemsSL = InventoryStorage.layout();
        if (newArcadiansAddress != itemsSL.arcadiansAddress) {
            emit ArcadiansAddressChanged(itemsSL.arcadiansAddress, newArcadiansAddress);
            itemsSL.arcadiansAddress = newArcadiansAddress;
        }
    }

    function _getArcadiansAddress() internal view returns (address) {
        return InventoryStorage.layout().arcadiansAddress;
    }

    function _numSlots() internal view returns (uint256) {
        return InventoryStorage.layout().numSlots;
    }

    function _unequipBatch(
        uint256 arcadianId
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        for (uint256 i = 0; i < inventorySL.numSlots; i++) {
            _unequip(arcadianId, i+1, true, 0);
        }
    }

    function _unequip(
        uint256 arcadianId,
        uint256 slot,
        bool unequipAll,
        uint256 amount
    ) internal {

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        IERC721 arcadiansContract = IERC721(inventorySL.arcadiansAddress);
        require(
            msg.sender == arcadiansContract.ownerOf(arcadianId),
            "InventoryFacet.equip: Message sender is not owner of the arcadian"
        );

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
            arcadianId,
            slot,
            existingItem.id,
            amount,
            msg.sender
        );

        existingItem.amount -= amount;
        if (existingItem.amount == 0) {
            delete inventorySL.equippedItems[arcadianId][slot];
        }
    }

    function _validateItemForSlot(uint256 slot, uint256 itemId, uint256 amount) internal view {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint[] storage allowedItems = inventorySL.slots[slot].allowedItems;
        for (uint256 i = 0; i < allowedItems.length; i++) {
            if (allowedItems[i] == itemId) {
                require(amount <= inventorySL.slots[slot].capacity, "Amount exceeds slot capacity");
                return;
            }
        }
        revert("Item not elegible for slot");
    }

    function _equip(
        uint256 arcadianId,
        uint256 slot,
        uint256 itemId,
        uint256 amount
    ) internal onlyArcadianOwner(arcadianId) {
        _equipWithoutArcadianOwnershipCheck(arcadianId, slot, itemId, amount);
    }

    function _equipBatch(
        uint256 arcadianId,
        uint256[] calldata slots,
        uint256[] calldata itemIds,
        uint256[] calldata amounts
    ) internal onlyArcadianOwner(arcadianId) {
        require(slots.length == itemIds.length && itemIds.length == amounts.length, "Input data length mismatch");

        for (uint256 i = 0; i < slots.length; i++) {
            _equipWithoutArcadianOwnershipCheck(arcadianId, slots[i], itemIds[i], amounts[i]);
        }
    }

    function _equipWithoutArcadianOwnershipCheck(
        uint256 arcadianId,
        uint256 slot,
        uint256 itemId,
        uint256 amount
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
            arcadianId,
            slot,
            itemId,
            amount,
            msg.sender
        );

        inventorySL.equippedItems[arcadianId][slot] = InventoryStorage.EquippedItem({
            id: itemId,
            amount: amount
        });
    }

    function _equipped(
        uint256 arcadianId,
        uint256 slot
    ) internal view returns (InventoryStorage.EquippedItem memory item) {
        return InventoryStorage.layout().equippedItems[arcadianId][slot];
    }

    function _equippedBatch(
        uint256 arcadianId
    ) internal view returns (InventoryStorage.EquippedItem[] memory item) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        InventoryStorage.EquippedItem[] memory items = new InventoryStorage.EquippedItem[](inventorySL.numSlots);
        for (uint256 i = 0; i < inventorySL.numSlots; i++) {
            items[i] = _equipped(arcadianId, i+1);
        }
        return items;
    }

    event SlotCreated(address indexed creator, uint256 slot, bool unequippable);

    function _createSlot(
        uint capacity,
        bool unequippable,
        uint[] calldata allowedItemIds
    ) internal {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        // slots are 1-index
        inventorySL.numSlots += 1;
        uint256 newSlot = inventorySL.numSlots;
        inventorySL.slots[newSlot].isUnequippable = unequippable;
        inventorySL.slots[newSlot].capacity = capacity;

        if (allowedItemIds.length > 0) {
            _allowItemsInSlot(newSlot, allowedItemIds);
        }

        emit SlotCreated(msg.sender, newSlot, unequippable);
    }

    function _allowSlotToUnequip(
        uint slot
    ) internal onlyValidSlot(slot) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        require(inventorySL.slots[slot].isUnequippable, "Slot already unquippable");
        inventorySL.slots[slot].isUnequippable = false;
    }

    function _allowItemInSlot(
        uint slot,
        uint itemId
    ) internal onlyValidItemId(itemId) onlyValidSlot(slot) {
        _allowItemInSlotUnchecked(slot, itemId);
    }

    function _allowItemsInSlot(
        uint slot,
        uint[] calldata itemIds
    ) internal virtual onlyValidSlot(slot) {
        for (uint256 i = 0; i < itemIds.length; i++) {
            _allowItemInSlotUnchecked(slot, itemIds[i]);
        }
    }

    function _allowItemInSlotUnchecked(
        uint slot,
        uint itemId
    ) internal virtual {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        inventorySL.slots[slot].allowedItems.push(itemId);
        inventorySL.itemAllowedSlots[itemId].push(slot);
    }

    function _getSlot(uint256 slot) internal view returns (InventoryStorage.Slot storage) {
        return InventoryStorage.layout().slots[slot];
    }
}