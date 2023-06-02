// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

import { RolesInternal } from "../roles/RolesInternal.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";
import { IERC721 } from '@solidstate/contracts/interfaces/IERC721.sol';
import { ERC165BaseInternal } from '@solidstate/contracts/introspection/ERC165/base/ERC165BaseInternal.sol';

contract ArcadiansInit is RolesInternal, ArcadiansInternal, ERC165BaseInternal {
    function init(
        string calldata baseUri, 
        uint maxMintPerUser, 
        uint mintPrice, 
        address mintPassAddress, 
        uint arcadiansMaxSupply
    ) external {

        _setSupportsInterface(type(IERC721).interfaceId, true);

        // Roles facet
        _initRoles();

        // Arcadians facet
        _setBaseURI(baseUri);
        _setMaxMintPerUser(maxMintPerUser);
        _setMintPrice(mintPrice);
        _setMaxSupply(arcadiansMaxSupply);

        // Mint pass
        _setMintPassContractAddress(mintPassAddress);
    }
}
