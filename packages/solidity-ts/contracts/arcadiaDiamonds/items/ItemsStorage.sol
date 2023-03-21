// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library ItemsStorage {

    bytes32 constant ITEMS_STORAGE_POSITION =
        keccak256("items.storage.position");

    struct Item {
        uint[] slots;
    }

    struct Layout {
        // wallet => token id => bool 
        mapping(address => mapping(uint => bool)) claimed;

        // token id => Item
        mapping(uint => Item) items;
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