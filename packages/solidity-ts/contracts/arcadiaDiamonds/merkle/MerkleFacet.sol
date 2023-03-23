// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleInternal } from './MerkleInternal.sol';

contract MerkleFacet is MerkleInternal {

    function getMerkleRoot() external view returns (bytes32) {
        return _getMerkleRoot();
    }

    function updateMerkleRoot(bytes32 merkleRoot) external {
        _updateMerkleRoot(merkleRoot);
    }
}