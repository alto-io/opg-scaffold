// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MerkleStorage } from "../merkle/MerkleStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";

contract ArcadiansInit is RolesInternal, ArcadiansInternal {
    function init(address itemsAddress, bytes32 merkleRoot, string calldata baseUri, uint maxMintPerUser, uint mintPrice) external {
        MerkleStorage.Layout storage es = MerkleStorage.layout();
        es.merkleRoot = merkleRoot;

        // Roles facet
        _initRoles();

        // Arcadians facet
        _setBaseURI(baseUri);
        _setMaxMintPerUser(maxMintPerUser);
        _setMintPrice(mintPrice);
        _setItemsAddress(itemsAddress);
    }
}
