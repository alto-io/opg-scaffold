// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library ItemsStorage {

    bytes32 constant ITEMS_STORAGE_POSITION =
        keccak256("items.storage.position");

    struct ItemType {
        string name;
        // slot 0 means that cannot be equipped
        uint slot;
        bool exists;
    }

    struct ItemTypeId {
        uint id;
        bool exists;
    }

    struct Layout {
        // wallet => token id => bool 
        mapping(address => mapping(uint => bool)) claimed;

        // item type id => ItemType
        mapping(uint => ItemType) itemTypes;
        // token id => ItemTypeId
        mapping(uint => ItemTypeId) tokenIdToTypeId;
        uint itemTypesCount;
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