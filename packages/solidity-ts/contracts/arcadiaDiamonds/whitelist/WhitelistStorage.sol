// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

library WhitelistStorage {

    bytes32 constant WHITELIST_STORAGE_POSITION =
        keccak256("whitelist.storage.position");

    enum PoolId { Guaranteed, Restricted }
    
    struct Pool {
        mapping(address => uint) claimed;
        mapping(address => uint) elegible;
        uint totalClaimed;
        uint totalElegible;
        bool claimActive;
    }

    struct Layout {
        // pool id => tokens pool
        mapping(PoolId => Pool) pools;
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