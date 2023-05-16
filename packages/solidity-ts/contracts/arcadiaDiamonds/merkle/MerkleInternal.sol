// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleProof } from "@solidstate/contracts/cryptography/MerkleProof.sol";
import { MerkleStorage } from "./MerkleStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";

contract MerkleInternal is RolesInternal {

    error Merkle_AlreadyClaimed();
    error Merkle_InvalidClaimAmount();
    error Merkle_NotIncludedInMerkleTree();
    error Merkle_ClaimInactive();
    error Merkle_ClaimStateAlreadyUpdated();

    function _merkleRoot() internal view returns (bytes32) {
        return MerkleStorage.layout().merkleRoot;
    }

    function _updateMerkleRoot(bytes32 newMerkleRoot) internal {
        MerkleStorage.layout().merkleRoot = newMerkleRoot;
    }

    function _isMerkleClaimActive() view internal returns (bool) {
        return !MerkleStorage.layout().claimInactive;
    }

    function _setMerkleClaimActive() internal {
        MerkleStorage.Layout storage merkleSL = MerkleStorage.layout();

        if (!merkleSL.claimInactive) revert Merkle_ClaimStateAlreadyUpdated();
        
        merkleSL.claimInactive = false;
    }

    function _setMerkleClaimInactive() internal {
        MerkleStorage.Layout storage merkleSL = MerkleStorage.layout();

        if (merkleSL.claimInactive) revert Merkle_ClaimStateAlreadyUpdated();
        
        merkleSL.claimInactive = true;
    }

    // To create 'leaf' use abi.encode(leafProp1, leafProp2, ...)
    function _consumeLeaf(bytes32[] memory proof, bytes memory _leaf) internal {
        MerkleStorage.Layout storage merkleSL = MerkleStorage.layout();

        if (merkleSL.claimInactive) revert Merkle_ClaimInactive();

        // TODO: IMPORTANT: ON PRODUCTION REVERT CHANGED ON ITEMS MERKLE CLAIM, TO AVOID INFINITE CLAIM
        bytes32 proofHash = keccak256(abi.encodePacked(proof));
        // if (merkleSL.claimedProof[proofHash]) revert Merkle_AlreadyClaimed();

        bytes32 leaf = keccak256(bytes.concat(keccak256(_leaf)));
        bool isValid = MerkleProof.verify(proof, merkleSL.merkleRoot, leaf);
        
        if (!isValid) revert Merkle_NotIncludedInMerkleTree();
        
        merkleSL.claimedProof[proofHash] = true;
    }
}