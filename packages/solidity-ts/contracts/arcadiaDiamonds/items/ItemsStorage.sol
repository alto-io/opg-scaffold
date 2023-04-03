// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

library ItemsStorage {

    bytes32 constant ITEMS_STORAGE_POSITION =
        keccak256("items.storage.position");

    struct Layout {
        // wallet address => token id => is claimed 
        mapping(address => mapping(uint => uint)) amountClaimed;
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