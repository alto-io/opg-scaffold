// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

library ItemsStorage {

    bytes32 constant ITEMS_STORAGE_POSITION =
        keccak256("items.storage.position");

    struct Layout {
        // wallet address => token id => is claimed 
        mapping(address => mapping(uint => uint)) amountClaimed;
        bool isMigratedToIPFS;

        // token id => is basic item
        mapping(uint => bool) isBasicItem;
        uint[] basicItemsIds;
        address inventoryAddress;
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