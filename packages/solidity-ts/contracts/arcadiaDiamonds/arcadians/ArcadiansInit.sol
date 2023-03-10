// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MerkleStorage } from "../merkle/MerkleStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";
import { ERC721MetadataInternal } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataInternal.sol";

contract ArcadiansInit is RolesInternal, ERC721MetadataInternal, ArcadiansInternal {
    function init(bytes32 merkleRoot, string calldata baseUri) external {
        MerkleStorage.Layout storage es = MerkleStorage.layout();
        es.merkleRoot = merkleRoot;

        _initRoles();

        _setBaseURI(baseUri);
    }
}
