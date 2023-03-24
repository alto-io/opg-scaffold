// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { AddressUtils } from "@solidstate/contracts/utils/AddressUtils.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { InventoryStorage } from "./InventoryStorage.sol";
import { IERC1155 } from "@solidstate/contracts/interfaces/IERC1155.sol";

contract InventoryInternal is
    ReentrancyGuard,
    RolesInternal
{

    event ArcadiansAddressChanged(address indexed oldArcadiansAddress, address indexed newArcadiansAddress);

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
        uint slot,
        uint amount
    );

    event SlotCreated(
        address indexed by, 
        uint capacity,
        bool unequippable,
        uint slot
    );

    using AddressUtils for address;

    modifier onlyValidSlot(uint slot) {
        require(slot != 0, "InventoryFacet: Slot id can't be zero");
        require(slot <= InventoryStorage.layout().numSlots, "InventoryFacet: Inexistent slot id");
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

    function _unequip(
        uint arcadianId,
        uint slot,
        bool unequipAll,
        uint amount
    ) internal onlyArcadianOwner(arcadianId) {
        
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        require(
            !inventorySL.slots[slot].isUnequippable,
            "InventoryFacet._unequip: Slot is not unequippable"
        );

        InventoryStorage.EquippedItem storage existingItem = inventorySL.equippedItems[arcadianId][slot];

        if (unequipAll) {
            amount = existingItem.amount;
        } else {
            require(
                amount <= existingItem.amount,
                "InventoryFacet._unequip: Attempting to unequip too many items from the slot"
            );
        }

        IERC1155 erc1155Contract = IERC1155(existingItem.itemAddress);
        erc1155Contract.safeTransferFrom(
            address(this),
            msg.sender,
            existingItem.id,
            amount,
            ''
        );

        emit ItemUnequipped(
            msg.sender,
            arcadianId,
            slot,
            amount
        );

        existingItem.amount -= amount;
        if (existingItem.amount == 0) {
            delete inventorySL.equippedItems[arcadianId][slot];
        }
    }

    function _unequipBatch(
        uint arcadianId,
        uint[] calldata slots,
        bool[] calldata unequipAll,
        uint[] calldata amounts
    ) internal onlyArcadianOwner(arcadianId) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        for (uint i = 0; i < slots.length; i++) {

            uint amountToUnequip = amounts[i];

            require(
                !inventorySL.slots[slots[i]].isUnequippable,
                "InventoryFacet._unequipBatch: Slot is not unequippable"
            );

            InventoryStorage.EquippedItem storage existingItem = inventorySL.equippedItems[arcadianId][slots[i]];

            if (unequipAll[i]) {
                amountToUnequip = existingItem.amount;
            } else {
                require(
                    amountToUnequip <= existingItem.amount,
                    "InventoryFacet._unequipBatch: Attempting to unequip too many items from the slot"
                );
            }


            IERC1155 erc1155Contract = IERC1155(existingItem.itemAddress);
            erc1155Contract.safeTransferFrom(
                address(this),
                msg.sender,
                existingItem.id,
                amountToUnequip,
                ''
            );

            existingItem.amount -= amountToUnequip;
            if (existingItem.amount == 0) {
                delete inventorySL.equippedItems[arcadianId][slots[i]];
            }

            emit ItemUnequipped(
                msg.sender,
                arcadianId,
                slots[i],
                amountToUnequip
            );
        }
    }

    function _unequipAllItems(
        uint arcadianId
    ) internal {

        IERC721 arcadiansContract = IERC721(address(this));
        try arcadiansContract.ownerOf(arcadianId) returns (address arcadianOwner) {
            require(
                msg.sender == arcadianOwner,
                "InventoryFacet._unequipAllItems: Caller not Arcadians contract neither or the arcadian owner"
            );

            InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

            for (uint i = 0; i < inventorySL.numSlots; i++) {
                uint slot = i + 1;

                InventoryStorage.EquippedItem storage existingItem = inventorySL.equippedItems[arcadianId][slot];

                // TODO: evaluate if unequippable items should also be unequiped in case of arcadian transfer
                if (!inventorySL.slots[slot].isUnequippable && existingItem.amount > 0) {

                    IERC1155 erc1155Contract = IERC1155(existingItem.itemAddress);
                    erc1155Contract.safeTransferFrom(
                        address(this),
                        msg.sender,
                        existingItem.id,
                        existingItem.amount,
                        ''
                    );

                    emit ItemUnequipped(
                        arcadianOwner,
                        arcadianId,
                        slot,
                        existingItem.amount
                    );
                    
                    delete inventorySL.equippedItems[arcadianId][slot];
                }
            }
        } catch {

        }
    }

    function _validateItemForSlot(uint slot, uint itemId, uint amount) internal view {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint[] storage allowedItemsIds = inventorySL.slots[slot].allowedItemsIds;
        for (uint i = 0; i < allowedItemsIds.length; i++) {
            if (allowedItemsIds[i] == itemId) {
                require(amount <= inventorySL.slots[slot].capacity, "InventoryFacet._validateItemForSlot: Amount exceeds slot capacity");
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

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        require(inventorySL.isItemAllowed[slot][itemAddress][itemId], "InventoryFacet.equip: Item not elegible for slot");
        require(inventorySL.slots[slot].capacity >= amount, "InventoryFacet.equip: Item amount exceeds slot capacity");

        if (inventorySL.equippedItems[arcadianId][slot].amount != 0) {
            _unequip(arcadianId, slot, true, 0);
        }
        
        IERC1155 erc1155Contract = IERC1155(itemAddress);
        require(
            erc1155Contract.balanceOf(msg.sender, itemId) >= amount,
            "InventoryFacet.equip: Message sender does not own enough of that item to equip"
        );

        erc1155Contract.safeTransferFrom(
            msg.sender,
            address(this),
            itemId,
            amount,
            ''
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

    function _equipBatch(
        uint arcadianId,
        address itemAddress,
        uint[] calldata itemsIds,
        uint[] calldata amounts,
        uint[] calldata slots
    ) internal onlyArcadianOwner(arcadianId) {
        require(slots.length == itemsIds.length && itemsIds.length == amounts.length, "InventoryFacet._equipBatch: Input data length mismatch");

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        IERC1155 erc1155Contract = IERC1155(itemAddress);

        for (uint i = 0; i < itemsIds.length; i++) {

            require(inventorySL.isItemAllowed[slots[i]][itemAddress][itemsIds[i]], "InventoryFacet._equipBatch: Item not elegible for slot");
            require(inventorySL.slots[slots[i]].capacity >= amounts[i], "InventoryFacet._equipBatch: Item amount exceeds slot capacity");

            require(
                erc1155Contract.balanceOf(msg.sender, itemsIds[i]) >= amounts[i],
                "InventoryFacet.equip: Sender has insufficient item balance"
            );

            if (inventorySL.equippedItems[arcadianId][slots[i]].amount > 0) {
                _unequip(arcadianId, slots[i], true, 0);
            }

            emit ItemEquipped(
                msg.sender,
                arcadianId,
                itemAddress,
                itemsIds[i],
                amounts[i],
                slots[i]
            );

            inventorySL.equippedItems[arcadianId][slots[i]] = InventoryStorage.EquippedItem({
                itemAddress: itemAddress,
                id: itemsIds[i],
                amount: amounts[i]
            });
        }

        erc1155Contract.safeBatchTransferFrom(
            msg.sender,
            address(this),
            itemsIds,
            amounts,
            ''
        );
    }

    function _equipped(
        uint arcadianId,
        uint slot
    ) internal view returns (InventoryStorage.EquippedItem memory item) {
        return InventoryStorage.layout().equippedItems[arcadianId][slot];
    }

    function _equippedAll(
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
        uint[] calldata allowedItemsIds,
        uint capacity,
        bool unequippable
    ) internal onlyContract(itemAddress) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        // slots are 1-index
        inventorySL.numSlots += 1;
        uint newSlot = inventorySL.numSlots;
        inventorySL.slots[newSlot].isUnequippable = unequippable;
        inventorySL.slots[newSlot].capacity = capacity;

        if (allowedItemsIds.length > 0) {
            _allowItemsInSlot(itemAddress, allowedItemsIds, newSlot);
        }

        emit SlotCreated(msg.sender, capacity, unequippable, newSlot);
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
        uint[] calldata itemsIds,
        uint slot
    ) internal virtual onlyValidSlot(slot) onlyValidAddress(itemAddress) {
        for (uint i = 0; i < itemsIds.length; i++) {
            _allowItemInSlotUnchecked(itemAddress, itemsIds[i], slot);
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
        inventorySL.isItemAllowed[slot][itemAddress][itemId] = true;
        emit ItemAllowedInSlot(msg.sender, itemAddress, itemId, slot);
    }

    function _getItemAllowedSlots(address itemAddress, uint itemId) internal view returns (uint[] storage) {
        return InventoryStorage.layout().itemAllowedSlots[itemAddress][itemId];
    }

    function _getSlot(uint slot) internal view returns (InventoryStorage.Slot storage) {
        return InventoryStorage.layout().slots[slot];
    }
}