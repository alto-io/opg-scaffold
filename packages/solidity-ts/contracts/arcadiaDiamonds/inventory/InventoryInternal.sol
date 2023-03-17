pragma solidity ^0.8.0;

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
        uint256 indexed itemType,
        address indexed itemAddress,
        uint256 itemPoolId,
        uint256 maxAmount
    );

    event ItemEquipped(
        uint256 indexed arcadianTokenId,
        uint256 indexed slot,
        uint256 itemTokenId,
        uint256 amount,
        address equippedBy
    );

    event ItemUnequipped(
        uint256 indexed arcadianTokenId,
        uint256 indexed slot,
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

    function _getArcadiansAddress() internal view returns (address) {
        return InventoryStorage.layout().arcadiansAddress;
    }

    function _numSlots() internal view returns (uint256) {
        return InventoryStorage.layout().numSlots;
    }

    function _slotIsUnequippable(uint256 slot) internal view returns (bool) {
        return InventoryStorage.layout().slotIsUnequippable[slot];
    }

    function _unequip(
        uint256 arcadianTokenId,
        uint256 slot,
        bool unequipAll,
        uint256 amount
    ) internal {

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

        InventoryStorage.EquippedItem storage existingItem = istore.equippedItems[arcadianTokenId][slot];

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
            existingItem.itemTokenId,
            amount,
            ""
        );

        emit ItemUnequipped(
            arcadianTokenId,
            slot,
            existingItem.itemTokenId,
            amount,
            msg.sender
        );

        existingItem.amount -= amount;
        if (existingItem.amount == 0) {
            delete istore.equippedItems[arcadianTokenId][slot];
        }
    }

    function _equip(
        uint256 arcadianTokenId,
        uint256 slot,
        uint256 itemTokenId,
        uint256 amount
    ) internal nonReentrant {

        // Verify if this item can be equipped in this slot
        ItemsStorage.Layout storage isl = ItemsStorage.layout();
        ItemsStorage.ItemTypeId storage itemTypeId = isl.tokenIdToTypeId[itemTokenId];
        require(itemTypeId.exists, "Item has no item type");
        ItemsStorage.ItemType storage itemType = isl.itemTypes[itemTypeId.id];
        require(itemType.exists, "No item type");
        require(slot == itemType.slot, "Item inadequate for slot");

        InventoryStorage.Layout storage istore = InventoryStorage
            .layout();

        IERC721 arcadiansContract = IERC721(istore.arcadiansAddress);
        require(
            msg.sender == arcadiansContract.ownerOf(arcadianTokenId),
            "InventoryFacet.equip: Message sender is not owner of the arcadian"
        );

        if (
            istore.equippedItems[arcadianTokenId][slot].amount != 0
        ) {
            _unequip(arcadianTokenId, slot, true, 0);
        }
        
        require(
            _balanceOf(msg.sender, itemTokenId) >= amount,
            "InventoryFacet.equip: Message sender does not own enough of that item to equip"
        );
    
        _safeTransfer(
            msg.sender,
            msg.sender,
            address(this),
            itemTokenId,
            amount,
            ""
        );

        emit ItemEquipped(
            arcadianTokenId,
            slot,
            itemTokenId,
            amount,
            msg.sender
        );

        istore.equippedItems[arcadianTokenId][slot] = InventoryStorage.EquippedItem({
            itemTokenId: itemTokenId,
            amount: amount
        });
    }

    function _equipped(
        uint256 arcadianTokenId,
        uint256 slot
    ) internal view returns (InventoryStorage.EquippedItem memory item) {
        InventoryStorage.Layout storage istore = InventoryStorage
            .layout();

        InventoryStorage.EquippedItem memory equippedItem = istore.equippedItems[arcadianTokenId][slot];

        return equippedItem;
    }
}