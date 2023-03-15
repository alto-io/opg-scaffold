// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


import { ItemsStorage } from "./ItemsStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155MetadataInternal } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataInternal.sol";

contract ItemsInternal is RolesInternal, MerkleInternal, ERC1155BaseInternal, ERC1155EnumerableInternal, ERC1155MetadataInternal {

    event Claimed(address indexed to, uint256 indexed tokenId, uint amount);

    function _checkValidItemType(uint itemId) internal view {
        if (ItemsStorage.layout().isEquipment[itemId]) {
            ItemsStorage.EquipmentItemType(itemId);
        } else {
            ItemsStorage.CosmeticItemType(itemId);
        }
    }

    function _setItemType(uint256 id, uint256 itemType, bool isEquipment)
        internal onlyManager
    {
        ItemsStorage.Layout storage itl = ItemsStorage.layout();
        if (isEquipment) {
            itl.equipmentItemType[id] = ItemsStorage.EquipmentItemType(itemType);
        } else {
            itl.cosmeticItemType[id] = ItemsStorage.CosmeticItemType(itemType);
        }
        itl.isEquipment[id] = isEquipment;
    }

    function _setItemTypeBatch(uint256[] calldata ids, uint256[] calldata itemTypes, bool[] calldata isEquipment)
        internal onlyManager
    {
        require(ids.length == itemTypes.length && ids.length == isEquipment.length, "ItemsFacet: Data length mismatch");
        for (uint256 i = 0; i < ids.length; i++) {
            _setItemType(ids[i], itemTypes[i], isEquipment[i]);
        }
    }

    function _claim(uint tokenId, uint amount, bytes32[] memory proof)
        internal
    {
        ItemsStorage.Layout storage itl = ItemsStorage.layout();

        // Revert if the token was already claimed before
        require(!itl.claimed[msg.sender][tokenId], "Already claimed");
        itl.claimed[msg.sender][tokenId] = true;

        // Verify if is elegible
        bytes memory leaf = abi.encode(msg.sender, tokenId, amount);
        _validateLeaf(proof, leaf);

        // Mint token to address
        _mint(msg.sender, tokenId, amount, '');

        emit Claimed(msg.sender, tokenId, amount);
    }

    function _claimBatch(uint256[] calldata tokenIds, uint[] calldata amounts, bytes32[][] calldata proofs) internal {
        require(tokenIds.length == amounts.length, "Inputs length mismatch");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _claim(tokenIds[i], amounts[i], proofs[i]);
        }
    }

    function _mint(address to, uint256 id, uint256 amount)
        internal onlyManager
    {
        _checkValidItemType(id);
        super._mint(to, id, amount, "");
    }

    function _mintBatch(address to, uint256[] memory ids, uint256[] memory amounts)
        internal onlyManager
    {
        for (uint256 i = 0; i < ids.length; i++) {
            _checkValidItemType(ids[i]);
        }
        super._mintBatch(to, ids, amounts, "");
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
        virtual
        override (ERC1155BaseInternal, ERC1155EnumerableInternal)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}