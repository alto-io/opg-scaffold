// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleStorage } from "../merkle/MerkleStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ItemsInternal } from "./ItemsInternal.sol";
import { InventoryInternal } from "../inventory/InventoryInternal.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";

contract ItemsInit is RolesInternal, ItemsInternal, InventoryInternal {    
    function init(address arcadiansAddress, bytes32 merkleRoot, string calldata baseUri) external {
        MerkleStorage.Layout storage es = MerkleStorage.layout();
        es.merkleRoot = merkleRoot;

        _initRoles();

        _setBaseURI(baseUri);
        _setArcadiansAddress(arcadiansAddress);
    }




    // required overrides
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        internal
        override (ERC1155BaseInternal, ItemsInternal)
    {}
}
