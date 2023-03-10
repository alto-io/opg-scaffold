// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MerkleStorage } from "../merkle/MerkleStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ERC1155MetadataInternal } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataInternal.sol";

contract ItemsInit is RolesInternal, ERC1155MetadataInternal {    
    function init(bytes32 merkleRoot, string calldata baseUri) external {
        MerkleStorage.Layout storage es = MerkleStorage.layout();
        es.merkleRoot = merkleRoot;

        _initRoles();

        _setBaseURI(baseUri);
    }
}
