
pragma solidity ^0.8.19;

import { InventoryStorage } from "./InventoryStorage.sol";

contract IInventorySlotsInternal {
    modifier onlyValidSlot(uint slot) {
        require(slot != 0, "Slot id can't be zero");
        require(slot <= InventoryStorage.layout().numSlots, "Inexistent slot id");
        _;
    }
}