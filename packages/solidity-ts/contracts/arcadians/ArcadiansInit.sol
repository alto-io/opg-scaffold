// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MerkleStorage } from "./MerkleStorage.sol";

contract ArcadiansInit {    
    function init(bytes32 merkleRoot) external {
        MerkleStorage.Layout storage es = MerkleStorage.layout();
        es.merkleRoot = merkleRoot;
    }
}
