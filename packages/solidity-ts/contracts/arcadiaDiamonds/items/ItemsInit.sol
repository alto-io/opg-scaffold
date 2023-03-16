// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MerkleStorage } from "../merkle/MerkleStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ItemsInternal } from "./ItemsInternal.sol";
import { ItemsStorage } from "./ItemsStorage.sol";
import { InventoryInternal } from "../inventory/InventoryInternal.sol";
import { ERC1155MetadataInternal } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataInternal.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";

contract ItemsInit is RolesInternal, ERC1155MetadataInternal, ItemsInternal, InventoryInternal {    
    function init(address arcadiansAddress, bytes32 merkleRoot, string calldata baseUri) external {
        MerkleStorage.Layout storage es = MerkleStorage.layout();
        es.merkleRoot = merkleRoot;

        _initRoles();

        _setBaseURI(baseUri);
        _setArcadiansAddress(arcadiansAddress);

        uint numSlots = _numSlots();
        uint itemsMax = _getItemsMax();
        for (uint256 i = numSlots; i < itemsMax; i++) {
            if (i < 3) {
                _createSlot(false);
            } else {
                _createSlot(true);
            }
        }
        // _mint(msg.sender, 1, 10, ItemsStorage.ItemSlot.Weapon);
        // _mint(msg.sender, 2, 20, ItemsStorage.ItemSlot.Head);
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
