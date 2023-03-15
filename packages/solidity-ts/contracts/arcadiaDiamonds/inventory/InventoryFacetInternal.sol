// SPDX-License-Identifier: UNLICENSED

/**
 * Authors: Moonstream DAO (engineering@moonstream.to)
 * GitHub: https://github.com/G7DAO/contracts
 */

pragma solidity ^0.8.0;

import { RolesInternal } from "../roles/RolesInternal.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { InventoryStorage } from "./InventoryStorage.sol";

/**
InventoryFacet is a smart contract that can either be used standalone or as part of an EIP-2535 Diamond
proxy contract.

It implements an inventory system which can be layered onto any ERC721 contract.

For more details, please refer to the design document:
https://docs.google.com/document/d/1Oa9I9b7t46_ngYp-Pady5XKEDW8M2NE9rI0GBRACZBI/edit?usp=sharing

Admin flow:
- [x] Create inventory slots
- [x] Specify whether inventory slots are equippable or not on slot creation
- [x] Define tokens as equippable in inventory slots

Player flow:
- [ ] Equip ERC721 tokens in eligible inventory slots
- [ ] Equip ERC1155 tokens in eligible inventory slots
- [ ] Unequip items from unequippable slots

Batch endpoints:
- [ ] Marking items as equippable
- [ ] Equipping items
- [ ] Unequipping items
 */
contract InventoryFacetInternal is
    ReentrancyGuard,
    RolesInternal
{

    modifier requireValidItemType(uint256 itemType) {
        require(
                itemType == InventoryStorage.ERC721_ITEM_TYPE ||
                itemType == InventoryStorage.ERC1155_ITEM_TYPE,
            "InventoryFacet.requireValidItemType: Invalid item type"
        );
        _;
    }

    event ArcadiansAddressChanged(address indexed oldArcadiansAddress, address indexed newArcadiansAddress);

    event SlotCreated(address indexed creator, uint256 slot, bool unequippable);

    event ItemMarkedAsEquippableInSlot(
        uint256 indexed slot,
        uint256 indexed itemType,
        address indexed itemAddress,
        uint256 itemPoolId,
        uint256 maxAmount
    );

    event ItemEquipped(
        uint256 indexed arcadianTokenId,
        uint256 indexed slot,
        uint256 itemType,
        address indexed itemAddress,
        uint256 itemTokenId,
        uint256 amount,
        address equippedBy
    );

    event ItemUnequipped(
        uint256 indexed arcadianTokenId,
        uint256 indexed slot,
        uint256 itemType,
        address indexed itemAddress,
        uint256 itemTokenId,
        uint256 amount,
        address unequippedBy
    );

    function _setArcadiansAddress(address newArcadiansAddress) internal onlyManager {
        InventoryStorage.Layout storage isl = InventoryStorage.layout();
        if (newArcadiansAddress != isl.arcadiansAddress) {
            emit ArcadiansAddressChanged(isl.arcadiansAddress, newArcadiansAddress);
            isl.arcadiansAddress = newArcadiansAddress;
        }
    }

    function _arcadiansAddress() internal view returns (address) {
        return InventoryStorage.layout().arcadiansAddress;
    }

    function _createSlot(
        bool unequippable
    ) internal onlyManager returns (uint256) {
        InventoryStorage.Layout storage istore = InventoryStorage.layout();

        // Slots are 1-indexed!
        istore.numSlots += 1;
        uint256 newSlot = istore.numSlots;
        istore.slotIsUnequippable[newSlot] = unequippable;

        emit SlotCreated(msg.sender, newSlot, unequippable);
        return newSlot;
    }

    function _numSlots() internal view returns (uint256) {
        return InventoryStorage.layout().numSlots;
    }

    function _slotIsUnequippable(uint256 slot) internal view returns (bool) {
        return InventoryStorage.layout().slotIsUnequippable[slot];
    }

    function _markItemAsEquippableInSlot(
        uint256 slot,
        uint256 itemType,
        address itemAddress,
        uint256 itemPoolId,
        uint256 maxAmount
    ) internal onlyManager requireValidItemType(itemType) {
        InventoryStorage.Layout storage istore = InventoryStorage
            .layout();

        require(
            itemType == InventoryStorage.ERC1155_ITEM_TYPE || itemPoolId == 0,
            "InventoryFacet.markItemAsEquippableInSlot: Pool ID can only be non-zero for items from ERC1155 contracts"
        );
        require(
            itemType != InventoryStorage.ERC721_ITEM_TYPE || maxAmount <= 1,
            "InventoryFacet.markItemAsEquippableInSlot: maxAmount should be at most 1 for items from ERC721 contracts"
        );

        // NOTE: We do not perform any check on the previously registered maxAmount for the item.
        // This gives administrators some flexibility in marking items as no longer eligible for slots.
        // But any player who has already equipped items in a slot before a change in maxAmount will
        // not be subject to the new limitation. This is something administrators will have to factor
        // into their game design.
        istore.slotEligibleItems[slot][itemType][itemAddress][
            itemPoolId
        ] = maxAmount;

        emit ItemMarkedAsEquippableInSlot(
            slot,
            itemType,
            itemAddress,
            itemPoolId,
            maxAmount
        );
    }

    function _maxAmountOfItemInSlot(
        uint256 slot,
        uint256 itemType,
        address itemAddress,
        uint256 itemPoolId
    ) internal view returns (uint256) {
        return
            InventoryStorage.layout().slotEligibleItems[slot][itemType][
                itemAddress
            ][itemPoolId];
    }

    function _unequip(
        uint256 arcadianTokenId,
        uint256 slot,
        bool unequipAll,
        uint256 amount
    ) internal {

        require(
            !unequipAll || amount == 0,
            "InventoryFacet._unequip: Set amount to 0 if you are unequipping all instances of the item in that slot"
        );

        require(
            unequipAll || amount > 0,
            "InventoryFacet._unequip: Since you are not unequipping all instances of the item in that slot, you must specify how many instances you want to unequip"
        );

        InventoryStorage.Layout storage istore = InventoryStorage
            .layout();

        IERC721 arcadiansContract = IERC721(istore.arcadiansAddress);
        require(
            msg.sender == arcadiansContract.ownerOf(arcadianTokenId),
            "InventoryFacet.equip: Message sender is not owner of the arcadian"
        );

        require(
            istore.slotIsUnequippable[slot],
            "InventoryFacet._unequip: That slot is not unequippable"
        );

        InventoryStorage.EquippedItem storage existingItem = istore.equippedItems[
            istore.arcadiansAddress
        ][arcadianTokenId][slot];

        if (unequipAll) {
            amount = existingItem.Amount;
        }

        require(
            amount <= existingItem.Amount,
            "InventoryFacet._unequip: Attempting to unequip too many items from the slot"
        );

        if (existingItem.ItemType == 721 && amount > 0) {
            IERC721 erc721Contract = IERC721(existingItem.ItemAddress);
            erc721Contract.safeTransferFrom(
                address(this),
                msg.sender,
                existingItem.ItemTokenId
            );
        } else if (existingItem.ItemType == 1155) {
            IERC1155 erc1155Contract = IERC1155(existingItem.ItemAddress);
            erc1155Contract.safeTransferFrom(
                address(this),
                msg.sender,
                existingItem.ItemTokenId,
                amount,
                ""
            );
        }

        emit ItemUnequipped(
            arcadianTokenId,
            slot,
            existingItem.ItemType,
            existingItem.ItemAddress,
            existingItem.ItemTokenId,
            amount,
            msg.sender
        );

        existingItem.Amount -= amount;
        if (existingItem.Amount == 0) {
            delete istore.equippedItems[istore.arcadiansAddress][
                arcadianTokenId
            ][slot];
        }
    }

    function _equip(
        uint256 arcadianTokenId,
        uint256 slot,
        uint256 itemType,
        address itemAddress,
        uint256 itemTokenId,
        uint256 amount
    ) internal requireValidItemType(itemType) nonReentrant {
        require(
                itemType == InventoryStorage.ERC1155_ITEM_TYPE ||
                amount == 1,
            "InventoryFacet.equip: amount can only be 1 for ERC721 items"
        );

        InventoryStorage.Layout storage istore = InventoryStorage
            .layout();

        IERC721 arcadiansContract = IERC721(istore.arcadiansAddress);
        require(
            msg.sender == arcadiansContract.ownerOf(arcadianTokenId),
            "InventoryFacet.equip: Message sender is not owner of the arcadian"
        );

        if (
            istore
            .equippedItems[istore.arcadiansAddress][arcadianTokenId][slot]
                .ItemType != 0
        ) {
            _unequip(arcadianTokenId, slot, true, 0);
        }

        require(
            // Note the if statement when accessing the itemPoolId key in the slotEligibleItems mapping.
            // That field is only relevant for ERC1155 tokens. For  ERC721 tokens, the capacity
            // is set under the 0 key in that position.
            // Using itemTokenId as the key in that position would incorrectly yield a value of 0 for
            // ERC721 tokens.
            istore.slotEligibleItems[slot][itemType][itemAddress][
                itemType == 1155 ? itemTokenId : 0
            ] >= amount,
            "InventoryFacet.equip: You can not equip those many instances of that item into the given slot"
        );

        if (itemType == InventoryStorage.ERC721_ITEM_TYPE) {
            IERC721 erc721Contract = IERC721(itemAddress);
            require(
                msg.sender == erc721Contract.ownerOf(itemTokenId),
                "InventoryFacet.equip: Message sender cannot equip an item that they do not own"
            );
            erc721Contract.safeTransferFrom(
                msg.sender,
                address(this),
                itemTokenId
            );
        } else if (itemType == InventoryStorage.ERC1155_ITEM_TYPE) {
            IERC1155 erc1155Contract = IERC1155(itemAddress);
            require(
                erc1155Contract.balanceOf(msg.sender, itemTokenId) >= amount,
                "InventoryFacet.equip: Message sender does not own enough of that item to equip"
            );
            erc1155Contract.safeTransferFrom(
                msg.sender,
                address(this),
                itemTokenId,
                amount,
                ""
            );
        }

        emit ItemEquipped(
            arcadianTokenId,
            slot,
            itemType,
            itemAddress,
            itemTokenId,
            amount,
            msg.sender
        );

        istore.equippedItems[istore.arcadiansAddress][arcadianTokenId][
                slot
            ] = InventoryStorage.EquippedItem({
            ItemType: itemType,
            ItemAddress: itemAddress,
            ItemTokenId: itemTokenId,
            Amount: amount
        });
    }

    function _equipped(
        uint256 arcadianTokenId,
        uint256 slot
    ) internal view returns (InventoryStorage.EquippedItem memory item) {
        InventoryStorage.Layout storage istore = InventoryStorage
            .layout();

        InventoryStorage.EquippedItem memory equippedItem = istore.equippedItems[
            istore.arcadiansAddress
        ][arcadianTokenId][slot];

        return equippedItem;
    }
}