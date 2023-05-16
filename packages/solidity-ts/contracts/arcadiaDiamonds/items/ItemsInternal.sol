// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155MetadataInternal } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155MetadataInternal.sol";
import { ItemsStorage } from "./ItemsStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { WhitelistInternal } from "../whitelist/WhitelistInternal.sol";
import { ArrayUtils } from "@solidstate/contracts/utils/ArrayUtils.sol";
import { WhitelistStorage } from "../whitelist/WhitelistStorage.sol";

contract ItemsInternal is MerkleInternal, WhitelistInternal, ERC1155BaseInternal, ERC1155EnumerableInternal, ERC1155MetadataInternal {

    error Items_InputsLengthMistatch();
    error Items_InvalidItemId();
    error Items_ItemsBasicStatusAlreadyUpdated();
    error Items_MintingNonBasicItem();
    error Items_MaximumItemMintsExceeded();

    event ItemClaimedMerkle(address indexed to, uint256 indexed itemId, uint amount);

    using ArrayUtils for uint[];

    uint constant MAX_BASIC_ITEM_PER_USER = 3;

    function _claimMerkle(address to, uint itemId, uint amount, bytes32[] memory proof)
        internal
    {
        if (itemId < 1) revert Items_InvalidItemId();

        ItemsStorage.Layout storage itemsSL = ItemsStorage.layout();

        bytes memory leaf = abi.encode(to, itemId, amount);
        _consumeLeaf(proof, leaf);

        ERC1155BaseInternal._mint(to, itemId, amount, "");

        itemsSL.amountClaimed[to][itemId] += amount;
        emit ItemClaimedMerkle(to, itemId, amount);
    }

    function _claimMerkleBatch(address to, uint256[] calldata itemIds, uint[] calldata amounts, bytes32[][] calldata proofs) 
        internal
    {
        if (itemIds.length != amounts.length) 
            revert Items_InputsLengthMistatch();
        
        for (uint256 i = 0; i < itemIds.length; i++) {
            _claimMerkle(to, itemIds[i], amounts[i], proofs[i]);
        }
    }
    
    function _claimWhitelist(uint[] calldata itemIds, uint[] calldata amounts) internal {
        if (itemIds.length != amounts.length) 
            revert Items_InputsLengthMistatch();


        uint totalAmount = 0;
        for (uint i = 0; i < itemIds.length; i++) {
            if (itemIds[i] < 1) 
                revert Items_InvalidItemId();

            ERC1155BaseInternal._mint(msg.sender, itemIds[i], amounts[i], "");
            totalAmount += amounts[i];
        }
        _consumeWhitelist(WhitelistStorage.PoolId.Guaranteed, msg.sender, totalAmount);
    }

    function _claimedAmount(address account, uint itemId) internal view returns (uint) {
        return ItemsStorage.layout().amountClaimed[account][itemId];
    }

    function _mint(address to, uint256 itemId, uint256 amount)
        internal
    {
        if (itemId < 1) revert Items_InvalidItemId();

        ERC1155BaseInternal._mint(to, itemId, amount, "");
    }

    function _mintBatch(address to, uint256[] calldata itemsIds, uint256[] calldata amounts)
        internal
    {
        if (itemsIds.min() < 1) revert Items_InvalidItemId();

        ERC1155BaseInternal._mintBatch(to, itemsIds, amounts, "");
    }

    function _migrateToIPFS(string calldata newBaseURI, bool migrate) internal {
        _setBaseURI(newBaseURI);
        ItemsStorage.layout().isMigratedToIPFS = migrate;
    }

    function _getInventoryAddress() internal view returns (address) {
        return ItemsStorage.layout().inventoryAddress;
    }

    function _setInventoryAddress(address inventoryAddress) internal {
        ItemsStorage.layout().inventoryAddress = inventoryAddress;
    }

    // overrides
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