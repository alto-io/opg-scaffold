// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { ItemsStorage } from "./ItemsStorage.sol";
import { InventorySlotsInternal } from "../inventory/InventorySlotsInternal.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155MetadataInternal } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataInternal.sol";

contract ItemsInternal is RolesInternal, MerkleInternal, ERC1155BaseInternal, ERC1155EnumerableInternal, ERC1155MetadataInternal, InventorySlotsInternal {

    event Claimed(address indexed to, uint256 indexed tokenId, uint amount);

    modifier OnlyTokenWithType(uint tokenId) {
        ItemsStorage.Layout storage isl = ItemsStorage.layout();
        require(
            isl.tokenIdToTypeId[tokenId].exists && isl.itemTypes[isl.tokenIdToTypeId[tokenId].id].exists, 
            "Item does not have a registered item type"
        );
        _;
    }

    modifier OnlyTokensWithType(uint[] calldata tokenIds) {
        ItemsStorage.Layout storage isl = ItemsStorage.layout();
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                isl.tokenIdToTypeId[tokenIds[i]].exists && isl.itemTypes[isl.tokenIdToTypeId[tokenIds[i]].id].exists, 
                "Item does not have a registered item type"
            );
        }
        _;
    }

    function _addNonEquippableItemType(string calldata name) internal {
        ItemsStorage.Layout storage isl = ItemsStorage.layout();

        uint itemTypeId = isl.itemTypesCount;
        isl.itemTypes[itemTypeId].name = name;
        isl.itemTypes[itemTypeId].exists = true;
        isl.itemTypesCount++;
    }

    function _addEquippableItemType(string calldata name, bool canBeUnequipped) internal {
        ItemsStorage.Layout storage isl = ItemsStorage.layout();

        uint itemTypeId = isl.itemTypesCount;
        isl.itemTypes[itemTypeId].name = name;
        isl.itemTypes[itemTypeId].slot = _createSlot(canBeUnequipped);
        isl.itemTypes[itemTypeId].exists = true;
        isl.itemTypesCount++;
    }

    function _setTokenIdType(uint tokenId, uint itemType) internal {
        ItemsStorage.Layout storage isl = ItemsStorage.layout();
        require(isl.itemTypes[itemType].exists, "Item type does not exist");
        isl.tokenIdToTypeId[tokenId].id = itemType;
        isl.tokenIdToTypeId[tokenId].exists = true;
    }

    function _claim(uint tokenId, uint amount, bytes32[] memory proof)
        internal OnlyTokenWithType(tokenId)
    {
        ItemsStorage.Layout storage isl = ItemsStorage.layout();

        // Revert if the token was already claimed before
        require(!isl.claimed[msg.sender][tokenId], "Already claimed");
        isl.claimed[msg.sender][tokenId] = true;

        // Verify if is elegible
        bytes memory leaf = abi.encode(msg.sender, tokenId, amount);
        _validateLeaf(proof, leaf);

        // Mint token to address
        _mint(msg.sender, tokenId, amount, '');

        emit Claimed(msg.sender, tokenId, amount);
    }

    function _claimBatch(uint256[] calldata tokenIds, uint[] calldata amounts, bytes32[][] calldata proofs) 
        internal OnlyTokensWithType(tokenIds)
    {
        require(tokenIds.length == amounts.length, "Inputs length mismatch");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _claim(tokenIds[i], amounts[i], proofs[i]);
        }
    }

    function _mint(address to, uint256 id, uint256 amount)
        internal onlyManager OnlyTokenWithType(id)
    {
        ItemsStorage.Layout storage isl = ItemsStorage.layout();
        require(isl.itemTypes[id].exists, "Minting an item without a slot assigned");
        
        ERC1155BaseInternal._mint(to, id, amount, "");
    }

    function _mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts)
        internal onlyManager OnlyTokensWithType(ids)
    {
        ItemsStorage.Layout storage isl = ItemsStorage.layout();
        for (uint256 i = 0; i < ids.length; i++) {
            require(isl.itemTypes[ids[i]].exists, "Minting an item without type");
        }
        ERC1155BaseInternal._mintBatch(to, ids, amounts, "");
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