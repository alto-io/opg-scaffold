// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleProof } from "@solidstate/contracts/cryptography/MerkleProof.sol";
import { MerkleStorage } from "./MerkleStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";

contract MerkleInternal is RolesInternal {

    error Merkle_AlreadyClaimed();
    error Merkle_InvalidClaimAmount();
    error Merkle_NotIncludedInMerkleTree();

    function _merkleRoot() internal view returns (bytes32) {
        return MerkleStorage.layout().merkleRoot;
    }

    function _updateMerkleRoot(bytes32 newMerkleRoot) internal {
        MerkleStorage.layout().merkleRoot = newMerkleRoot;
    }

    // To create 'leaf' use abi.encode(leafProp1, leafProp2, ...)
    function _validateLeaf(bytes32[] memory proof, bytes memory _leaf) internal view returns (bool isValid) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(_leaf)));

        isValid = MerkleProof.verify(proof, MerkleStorage.layout().merkleRoot, leaf);
        if (!isValid) revert Merkle_NotIncludedInMerkleTree();
    }
}