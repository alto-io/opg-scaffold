
pragma solidity ^0.8.19;

import { InventoryStorage } from "./InventoryStorage.sol";

contract InventorySlotsInternal {

    event SlotCreated(address indexed creator, uint256 slot, bool unequippable);

    function _createSlot(
        bool unequippable
    ) internal returns (uint256) {
        InventoryStorage.Layout storage istore = InventoryStorage.layout();

        istore.numSlots += 1;
        uint256 newSlot = istore.numSlots;
        istore.slotIsUnequippable[newSlot] = unequippable;

        emit SlotCreated(msg.sender, newSlot, unequippable);
        return newSlot;
    }
}