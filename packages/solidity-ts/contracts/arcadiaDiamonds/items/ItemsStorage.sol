// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library ItemsStorage {

    bytes32 constant ITEMS_STORAGE_POSITION =
        keccak256("items.storage.position");

    enum ItemType { Weapon, Top, Bottom, Head, Mouth, Eyes, Skin, Shadow, Background }

    struct Layout {
        // wallet => token id => bool 
        mapping(address => mapping(uint => bool)) claimed;

        mapping(uint => ItemType) itemType;
        mapping(ItemType => bool) typeExists;
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
}