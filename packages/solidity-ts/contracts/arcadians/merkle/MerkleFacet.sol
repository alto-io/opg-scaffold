// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { MerkleStorage } from "./MerkleStorage.sol";
import { OwnableStorage } from '@solidstate/contracts/access/ownable/OwnableStorage.sol';

contract MerkleFacet {

    function getMerkleRoot() external view returns (bytes32) {
        return MerkleStorage.layout().merkleRoot;
    }

    function updateMerkleRoot(bytes32 merkleRoot) external {
        require(OwnableStorage.layout().owner == msg.sender, "Not owner");
        MerkleStorage.layout().merkleRoot = merkleRoot;
    }
}