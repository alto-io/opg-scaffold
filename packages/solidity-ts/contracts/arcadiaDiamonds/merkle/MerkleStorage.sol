// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library MerkleStorage {

    bytes32 constant MERKLE_STORAGE_POSITION =
        keccak256("merkle.storage.position");

    struct Layout {
        bytes32 merkleRoot;
    }

    function layout()
        internal
        pure
        returns (Layout storage es)
    {
        bytes32 position = MERKLE_STORAGE_POSITION;
        assembly {
            es.slot := position
        }
    }
}