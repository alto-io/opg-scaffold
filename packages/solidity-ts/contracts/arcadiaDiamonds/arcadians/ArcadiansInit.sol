// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleStorage } from "../merkle/MerkleStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";
import { IERC721 } from '@solidstate/contracts/interfaces/IERC721.sol';
import { ERC165BaseInternal } from '@solidstate/contracts/introspection/ERC165/base/ERC165BaseInternal.sol';

contract ArcadiansInit is RolesInternal, ArcadiansInternal, ERC165BaseInternal {
    function init(bytes32 merkleRoot, string calldata baseUri, uint maxMintPerUser, uint mintPrice) external {

        _setSupportsInterface(type(IERC721).interfaceId, true);

        MerkleStorage.Layout storage es = MerkleStorage.layout();
        es.merkleRoot = merkleRoot;

        // Roles facet
        _initRoles();

        // Arcadians facet
        _setBaseURI(baseUri);
        _setMaxMintPerUser(maxMintPerUser);
        _setMintPrice(mintPrice);
    }
}
