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

    function _setItemSlot(uint256 id, ItemsStorage.ItemSlot itemSlot) internal {
        ItemsStorage.Layout storage itl = ItemsStorage.layout();
        require(!itl.hasSlot[id] || itl.itemSlots[id] == itemSlot, "Item slot mismatch");
        if (!itl.hasSlot[id]) {
            itl.itemSlots[id] = itemSlot;
        }
    }

    function _mint(address to, uint256 id, uint256 amount, ItemsStorage.ItemSlot itemSlot)
        internal onlyManager
    {
        _setItemSlot(id, itemSlot);
        ERC1155BaseInternal._mint(to, id, amount, "");
    }

    function _mint(address to, uint256 id, uint256 amount)
        internal onlyManager
    {
        ItemsStorage.Layout storage itl = ItemsStorage.layout();
        require(itl.hasSlot[id], "Minting an item without a slot assigned");
        ERC1155BaseInternal._mint(to, id, amount, "");
    }

    function _mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, ItemsStorage.ItemSlot[] calldata itemSlots)
        internal onlyManager
    {
        for (uint256 i = 0; i < ids.length; i++) {
            _setItemSlot(ids[i], itemSlots[i]);
        }
        ERC1155BaseInternal._mintBatch(to, ids, amounts, "");
    }

    function _mintBatch(address to, uint256[] memory ids, uint256[] memory amounts)
        internal onlyManager
    {
        ItemsStorage.Layout storage itl = ItemsStorage.layout();
        for (uint256 i = 0; i < ids.length; i++) {
            require(itl.hasSlot[ids[i]], "Minting an item without a slot assigned");
        }
        ERC1155BaseInternal._mintBatch(to, ids, amounts, "");
    }

    function _getItemsMax() internal pure returns (uint) {
        return uint(type(ItemsStorage.ItemSlot).max);
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