// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { MerkleStorage } from "../merkle/MerkleStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ItemsInternal } from "./ItemsInternal.sol";
import { InventoryInternal } from "../inventory/InventoryInternal.sol";
import { ERC165BaseInternal } from '@solidstate/contracts/introspection/ERC165/base/ERC165BaseInternal.sol';
import { IERC1155 } from '@solidstate/contracts/interfaces/IERC1155.sol';

contract ItemsInit is RolesInternal, ItemsInternal, InventoryInternal, ERC165BaseInternal {    
    function init(bytes32 merkleRoot, string calldata baseUri) external {

        _setSupportsInterface(type(IERC1155).interfaceId, true);

        MerkleStorage.Layout storage es = MerkleStorage.layout();
        es.merkleRoot = merkleRoot;

        _initRoles();

        _setBaseURI(baseUri);
    }
}
