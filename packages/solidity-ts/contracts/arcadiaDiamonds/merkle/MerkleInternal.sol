// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import { MerkleStorage } from "./MerkleStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";
import { MerkleProof } from "@solidstate/contracts/cryptography/MerkleProof.sol";

contract MerkleInternal is RolesInternal {

    function _getMerkleRoot() internal view returns (bytes32) {
        return MerkleStorage.layout().merkleRoot;
    }

    function _updateMerkleRoot(bytes32 merkleRoot) onlyManager internal {
        MerkleStorage.layout().merkleRoot = merkleRoot;
    }

    // To create 'leaf' use abi.encode(leafProp1, leafProp2, ...)
    function _validateLeaf(bytes32[] memory proof, bytes memory _leaf) internal view returns (bool isValid) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(_leaf)));
        isValid = MerkleProof.verify(proof, MerkleStorage.layout().merkleRoot, leaf);
        require(isValid, "Data not included in merkle");
    }
}