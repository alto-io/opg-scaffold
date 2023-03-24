// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

library WhitelistStorage {

    bytes32 constant WHITELIST_STORAGE_POSITION =
        keccak256("whitelist.storage.position");

    struct Layout {
        mapping(address => uint) claimed;
        mapping(address => uint) elegible;
    }

    function layout()
        internal
        pure
        returns (Layout storage es)
    {
        bytes32 position = WHITELIST_STORAGE_POSITION;
        assembly {
            es.slot := position
        }
    }
}