// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155MetadataInternal } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataInternal.sol";
import { ItemsStorage } from "./ItemsStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { WhitelistInternal } from "../whitelist/WhitelistInternal.sol";

contract ItemsInternal is MerkleInternal, ERC1155BaseInternal, ERC1155EnumerableInternal, ERC1155MetadataInternal {

    event ItemClaimed(address indexed to, uint256 indexed itemId, uint amount);

    function _claim(uint itemId, uint amount, bytes32[] memory proof)
        internal
    {
        ItemsStorage.Layout storage itemsSL = ItemsStorage.layout();

        // Revert if the token was already claimed before
        require(!itemsSL.claimed[msg.sender][itemId], "ItemsInternal._claim: Already claimed");
        itemsSL.claimed[msg.sender][itemId] = true;

        // Verify if is elegible
        bytes memory leaf = abi.encode(msg.sender, itemId, amount);
        _validateLeaf(proof, leaf);

        // Mint token to address
        _mint(msg.sender, itemId, amount, '');

        emit ItemClaimed(msg.sender, itemId, amount);
    }

    function _claimBatch(uint256[] calldata tokenIds, uint[] calldata amounts, bytes32[][] calldata proofs) 
        internal
    {
        require(tokenIds.length == amounts.length, "ItemsInternal._claimBatch: Inputs length mismatch");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _claim(tokenIds[i], amounts[i], proofs[i]);
        }
    }

    function _mint(address to, uint256 itemId, uint256 amount)
        internal
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