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
        uint slotId,
        InventoryStorage.Item calldata item
    ) internal onlyArcadianOwner(arcadianId) {

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        require(inventorySL.itemSlot[item.contractAddress][item.id] == slotId, "InventoryFacet.equip: Item not elegible for slot");
        require(!inventorySL.slots[slotId].unequippable || inventorySL.equippedItems[arcadianId][slotId].contractAddress == address(0), "InventoryFacet.equip: Unequippable slots already has an item");
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

        uint[] memory slotsIds = new uint[](1);
        slotsIds[0] = slotId;
        emit ItemsEquipped(
            msg.sender,
            arcadianId,
            slotsIds
        );

        inventorySL.equippedItems[arcadianId][slotId] = item;
        require(_hashBaseItemsUnchecked(arcadianId), "InventoryFacet._equip: Base items are not unique");
    }

    function _equipBatch(
        uint arcadianId,
        uint[] calldata slotIds,
        InventoryStorage.Item[] calldata items
    ) internal {
        // current: 1954977
        require(slotIds.length > 0, "InventoryFacet._unequip: Should specify at least one slot");
        require(slotIds.length == items.length, "InventoryFacet._equipBatch: Input data length mismatch");
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
                "InventoryFacet.equip: Sender has insufficient item balance"
            );

            InventoryStorage.Item storage existingItem = inventorySL.equippedItems[arcadianId][slotId];
            require(
                !inventorySL.slots[slotId].unequippable || existingItem.contractAddress == address(0), 
                "InventoryFacet.equip: Unequippable slots already has an item"
            );

            if (existingItem.contractAddress == items[i].contractAddress && existingItem.id == items[i].id) {
                continue;
            }

            if (existingItem.contractAddress != address(0)) {
                erc1155Contract.safeTransferFrom(
                    address(this),
                    msg.sender,
                    existingItem.id,
                    1,
                    ''
                );
            }

            inventorySL.equippedItems[arcadianId][slotId] = items[i];

            erc1155Contract.safeTransferFrom(
                msg.sender,
                address(this),
                items[i].id,
                1,
                ''
            );
        }

        emit ItemsEquipped(
            msg.sender,
            arcadianId,
            slotIds
        );

        require(_hashBaseItemsUnchecked(arcadianId), "InventoryFacet._equipBatch: Base items are not unique");
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

        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            slots
        );

        _hashBaseItemsUnchecked(arcadianId);
    }

    function _unequipBatch(
        uint arcadianId,
        uint[] calldata slotIds
    ) internal onlyArcadianOwner(arcadianId) {
        require(slotIds.length > 0, "InventoryFacet._unequip: Should specify at least one slot");

        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();

        for (uint i = 0; i < slotIds.length; i++) {
            uint slotId = slotIds[i];
            require(slotId > 0 && slotId <= inventorySL.numSlots, "InventoryFacet._unequip: Invalid slot");
            require(!inventorySL.slots[slotId].unequippable, "InventoryFacet._unequip: Slot is unequippable");
            require(inventorySL.equippedItems[arcadianId][slotId].contractAddress != address(0), "InventoryFacet._unequip: Slot not equipped");
            
            _unequipUnchecked(arcadianId, slotId);
        }

        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            slotIds
        );

        _hashBaseItemsUnchecked(arcadianId);
    }

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
        emit ItemsUnequipped(
            msg.sender,
            arcadianId,
            unequippedSlots
        );

        _hashBaseItemsUnchecked(arcadianId);
    }

    function _equipped(
        uint arcadianId,
        uint slotId
    ) internal view returns (InventoryStorage.Item memory) {
        return InventoryStorage.layout().equippedItems[arcadianId][slotId];
    }

    function _equippedAll(
        uint arcadianId
    ) internal view returns (InventoryStorage.Item[] memory items) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        uint numSlots = inventorySL.numSlots;
        items = new InventoryStorage.Item[](numSlots);
        for (uint i = 0; i < numSlots; i++) {
            items[i] = inventorySL.equippedItems[arcadianId][i+1];
        }
    }

    function _isArcadianUnique(
        uint arcadianId,
        uint[] calldata slotsIds,
        InventoryStorage.Item[] calldata items
    ) internal view returns (bool) {
        require(slotsIds.length == items.length, "InventoryFacet._isArcadianUnique: Input data length mismatch");
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        EnumerableSet.UintSet storage baseSlots = inventorySL.categoryToSlots[InventoryStorage.SlotCategory.Base];

        uint baseSlotsLength = baseSlots.length();
        uint[] memory baseSlotsIds = new uint[](baseSlotsLength);
        InventoryStorage.Item[] memory baseItems = new InventoryStorage.Item[](baseSlotsLength);
        uint numSlots = inventorySL.numSlots;
        for (uint i = 0; i < baseSlotsLength; i++) {
            uint slotId = baseSlots.at(i);
            require(slotId > 0 && slotId <= numSlots, "InventoryFacet._isArcadianUnique: Invalid slot");
            baseSlotsIds[i] = slotId;
            baseItems[i] = inventorySL.equippedItems[arcadianId][slotId];
        }

        for (uint i = 0; i < slotsIds.length; i++) {
            if (!baseSlots.contains(slotsIds[i])) continue;
            baseSlotsIds[i] = slotsIds[i];
            baseItems[i].contractAddress = items[i].contractAddress;
            baseItems[i].id = items[i].id;
        }

        bytes memory encodedItems;
        for (uint i = 0; i < baseSlotsIds.length; i++) {
            encodedItems = abi.encodePacked(encodedItems, baseSlotsIds[i], baseItems[i].contractAddress, baseItems[i].id);
        }

        return !inventorySL.baseItemsHashesSet.contains(keccak256(encodedItems));
    }

    function _hashBaseItemsUnchecked(
        uint arcadianId
    ) internal returns (bool isUnique) {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        bytes memory encodedItems;
        EnumerableSet.UintSet storage baseSlots = inventorySL.categoryToSlots[InventoryStorage.SlotCategory.Base];
        uint baseSlotsLength = baseSlots.length();
        for (uint i = 0; i < baseSlotsLength; i++) {
            uint slotId = baseSlots.at(i);
            InventoryStorage.Item storage equippedItem = inventorySL.equippedItems[arcadianId][slotId];
            encodedItems = abi.encodePacked(encodedItems, slotId, equippedItem.contractAddress, equippedItem.id);
        }
        bytes32 baseItemsHash = keccak256(encodedItems);
        isUnique = !inventorySL.baseItemsHashesSet.contains(baseItemsHash);
        inventorySL.baseItemsHashesSet.remove(inventorySL.arcadiansBaseItemsHashes[arcadianId]);
        inventorySL.baseItemsHashesSet.add(baseItemsHash);
        inventorySL.arcadiansBaseItemsHashes[arcadianId] = baseItemsHash;
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
            require(items[i].contractAddress.isContract(), "InventoryFacet._allowItemsInSlot: Invalid items contract address");
            require(inventorySL.itemSlot[items[i].contractAddress][items[i].id] != slotId, "InventoryFacet._allowItemsInSlot: Item already allowed in the slot");

            if (inventorySL.itemSlot[items[i].contractAddress][items[i].id] > 0) {
                _disallowItemInSlotUnchecked(slotId, items[i]);
            }
            inventorySL.allowedItems[slotId].push(items[i]);
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
            require(inventorySL.itemSlot[items[i].contractAddress][items[i].id] == slotId, "InventoryFacet._disallowItemsInSlot: Item already not allowed in the slot");
            _disallowItemInSlotUnchecked(slotId, items[i]);
        }
        emit ItemsAllowedInSlotUpdated(msg.sender, slotId);
    }

    function _disallowItemInSlotUnchecked(
        uint slotId,
        InventoryStorage.Item calldata item
    ) internal virtual {
        InventoryStorage.Layout storage inventorySL = InventoryStorage.layout();
        
        for (uint i = 0; i < inventorySL.allowedItems[slotId].length; i++) {
            if (inventorySL.allowedItems[slotId][i].id == item.id) {
                inventorySL.allowedItems[slotId][i] = inventorySL.allowedItems[slotId][inventorySL.allowedItems[slotId].length-1];
                delete inventorySL.allowedItems[slotId][inventorySL.allowedItems[slotId].length-1];
                inventorySL.allowedItems[slotId].pop();
                break;
            }
        }
        
        delete inventorySL.itemSlot[item.contractAddress][item.id];
    }

    function _allowedSlot(InventoryStorage.Item calldata item) internal view returns (uint) {
        return InventoryStorage.layout().itemSlot[item.contractAddress][item.id];
    }

    function _allowedItems(uint slotId) internal view onlyValidSlot(slotId) returns (InventoryStorage.Item[] memory) {
        return InventoryStorage.layout().allowedItems[slotId];
    }

    function _slot(uint slotId) internal view returns (InventoryStorage.Slot storage) {
        return InventoryStorage.layout().slots[slotId];
    }
}