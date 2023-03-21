
pragma solidity ^0.8.19;

import { InventoryStorage } from "./InventoryStorage.sol";
import { IInventorySlotsInternal } from "./IInventorySlotsInternal.sol";

contract InventorySlotsInternal is IInventorySlotsInternal {

    function _allowItemInSlot(
        uint slot,
        uint itemId
    ) internal virtual onlyValidSlot(slot) {
        InventoryStorage.Layout storage istore = InventoryStorage.layout();
        istore.slots[slot].allowedItems.push(itemId);
    }
}