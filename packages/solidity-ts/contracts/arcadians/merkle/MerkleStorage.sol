// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { MerkleProof } from "@solidstate/contracts/cryptography/MerkleProof.sol";

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

    // To create 'leaf' using abi.encode(leafProp1, leafProp2, ...)
    function isValidLeaf(bytes32[] memory proof, bytes memory _leaf) internal view returns (bool isValid) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(_leaf)));
        isValid = MerkleProof.verify(proof, layout().merkleRoot, leaf);
    }
}