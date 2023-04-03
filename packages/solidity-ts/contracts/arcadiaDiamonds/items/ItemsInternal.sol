// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155MetadataInternal } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataInternal.sol";
import { ItemsStorage } from "./ItemsStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { WhitelistInternal } from "../whitelist/WhitelistInternal.sol";

contract ItemsInternal is MerkleInternal, WhitelistInternal, ERC1155BaseInternal, ERC1155EnumerableInternal, ERC1155MetadataInternal {

    error Items_InputsLengthMistatch();

    event ItemClaimedMerkle(address indexed to, uint256 indexed itemId, uint amount);

    function _claimMerkle(uint itemId, uint amount, bytes32[] memory proof)
        internal
    {
        ItemsStorage.Layout storage itemsSL = ItemsStorage.layout();

        bytes memory leaf = abi.encode(msg.sender, itemId, amount);
        _consumeLeaf(proof, leaf);

        _mint(msg.sender, itemId, amount, '');

        itemsSL.amountClaimed[msg.sender][itemId] += amount;
        emit ItemClaimedMerkle(msg.sender, itemId, amount);
    }

    function _claimMerkleBatch(uint256[] calldata itemIds, uint[] calldata amounts, bytes32[][] calldata proofs) 
        internal
    {
        if (itemIds.length != amounts.length) 
            revert Items_InputsLengthMistatch();
        
        for (uint256 i = 0; i < itemIds.length; i++) {
            _claimMerkle(itemIds[i], amounts[i], proofs[i]);
        }
    }
    
    function _claimWhitelist(uint[] calldata itemIds, uint[] calldata amounts) internal {
        if (itemIds.length != amounts.length) 
            revert Items_InputsLengthMistatch();

        uint totalAmount = 0;
        for (uint i = 0; i < itemIds.length; i++) {
            _mint(msg.sender, itemIds[i], amounts[i], '');
            totalAmount += amounts[i];
        }
        _consumeWhitelist(msg.sender, totalAmount);
    }

    function _claimedAmount(address account, uint itemId) internal view returns (uint) {
        return ItemsStorage.layout().amountClaimed[account][itemId];
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