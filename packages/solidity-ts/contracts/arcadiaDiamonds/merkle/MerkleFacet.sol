// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleInternal } from './MerkleInternal.sol';

contract MerkleFacet is MerkleInternal {

    function merkleRoot() external view returns (bytes32) {
        return _merkleRoot();
    }

    function updateMerkleRoot(bytes32 newMerkleRoot) external {
        _updateMerkleRoot(newMerkleRoot);
    }
}