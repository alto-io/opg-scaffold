// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ItemsStorage } from "./ItemsStorage.sol";
import { InventoryStorage } from "../inventory/InventoryStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155MetadataInternal } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataInternal.sol";

contract ItemsInternal is MerkleInternal, ERC1155BaseInternal, ERC1155EnumerableInternal, ERC1155MetadataInternal {

    event Claimed(address indexed to, uint256 indexed itemId, uint amount);

    modifier onlyEquippableItem(uint itemId) {
        require(
            InventoryStorage.layout().itemAllowedSlots[itemId].length > 0,
            "Item does not have any slot where it can be equipped"
        );
        _;
    }

    modifier onlyNonZeroItemId(uint itemId) {
        require(itemId != 0, "Item id can't be zero");
        _;
    }

    function _claim(uint itemId, uint amount, bytes32[] memory proof)
        internal onlyNonZeroItemId(itemId)
    {
        ItemsStorage.Layout storage itemsSL = ItemsStorage.layout();

        // Revert if the token was already claimed before
        require(!itemsSL.claimed[msg.sender][itemId], "Already claimed");
        itemsSL.claimed[msg.sender][itemId] = true;

        // Verify if is elegible
        bytes memory leaf = abi.encode(msg.sender, itemId, amount);
        _validateLeaf(proof, leaf);

        // Mint token to address
        _mint(msg.sender, itemId, amount, '');

        emit Claimed(msg.sender, itemId, amount);
    }

    function _claimBatch(uint256[] calldata tokenIds, uint[] calldata amounts, bytes32[][] calldata proofs) 
        internal
    {
        require(tokenIds.length == amounts.length, "Inputs length mismatch");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _claim(tokenIds[i], amounts[i], proofs[i]);
        }
    }

    function _mint(address to, uint256 itemId, uint256 amount)
        internal onlyNonZeroItemId(itemId) onlyEquippableItem(itemId)
    {
        
        ERC1155BaseInternal._mint(to, itemId, amount, "");
    }

    function _mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts)
        internal
    {
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