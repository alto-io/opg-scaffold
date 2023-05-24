// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

library MerkleStorage {

    bytes32 constant MERKLE_STORAGE_POSITION =
        keccak256("merkle.storage.position");

    struct Layout {
        bytes32 merkleRoot;
        bool claimInactive;
        mapping(bytes32 => bool) claimedProof;
        mapping(address => uint) amountClaimed;
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