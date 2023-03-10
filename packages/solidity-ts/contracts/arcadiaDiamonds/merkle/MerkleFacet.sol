// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { MerkleStorage } from "./MerkleStorage.sol";
import { MerkleInternal } from './MerkleInternal.sol';

contract MerkleFacet is MerkleInternal {

    function getMerkleRoot() external view returns (bytes32) {
        return _getMerkleRoot();
    }

    function updateMerkleRoot(bytes32 merkleRoot) external {
        _updateMerkleRoot(merkleRoot);
    }
}