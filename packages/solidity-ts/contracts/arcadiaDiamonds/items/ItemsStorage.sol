// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library ItemsStorage {

    bytes32 constant ITEMS_STORAGE_POSITION =
        keccak256("items.storage.position");

    // Add items only in the end of the enum to keep data consistency
    enum ItemSlot { Weapon, Top, Bottom, Head, Mouth, Eyes, Skin, Shadow, Background }

    struct Layout {
        // wallet => token id => bool 
        mapping(address => mapping(uint => bool)) claimed;

        // token id => ItemSlots
        mapping(uint => ItemSlot) itemSlots;
        mapping(uint => bool) hasSlot;
    }

    function layout()
        internal
        pure
        returns (Layout storage es)
    {
        bytes32 position = ITEMS_STORAGE_POSITION;
        assembly {
            es.slot := position
        }
    }

    // function _isValidItemType(uint itemId) internal view returns (bool){
    //     return ItemsStorage.layout().itemType[itemId] != ItemType.None;
    // }
}