// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleInternal } from './MerkleInternal.sol';

/**
 * @title MerkleFacet
 * @notice This contract provides external functions to retrieve and update the Merkle root hash,
 * which is used to verify the authenticity of data in a Merkle tree.
 * This contract can be used as a facet of a diamond which follows the EIP-2535 diamond standard.
 */
contract MerkleFacet is MerkleInternal {

    /**
     * @notice Returns the current Merkle root hash
     * @return The current Merkle root hash
     */
    function merkleRoot() external view returns (bytes32) {
        return _merkleRoot();
    }
    /**
     * @notice Updates the Merkle root hash with a new value
     * @dev This function can only be called by an address with the manager role
     * @param newMerkleRoot The new Merkle root hash value to be set
     */
    function updateMerkleRoot(bytes32 newMerkleRoot) external onlyManager {
        _updateMerkleRoot(newMerkleRoot);
    }
}