// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library ArcadiansStorage {

    bytes32 constant EQUIPPABLE_STORAGE_POSITION =
        keccak256("equippable.storage.position");

    struct Layout {
        // wallet => amount claimed 
        mapping(address => uint) amountClaimed;
        uint counterId;
        uint maxMintPerUser;
        uint mintPrice;
    }

    function layout()
        internal
        pure
        returns (Layout storage es)
    {
        bytes32 position = EQUIPPABLE_STORAGE_POSITION;
        assembly {
            es.slot := position
        }
    }
}