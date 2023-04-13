// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { ERC1155Base } from "@solidstate/contracts/token/ERC1155/base/ERC1155Base.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155Enumerable } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155Enumerable.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155Metadata } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155Metadata.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { ItemsInternal } from "./ItemsInternal.sol";
import { Multicall } from "@solidstate/contracts/utils/Multicall.sol";
import { IERC1155 } from '@solidstate/contracts/interfaces/IERC1155.sol';

/**
 * @title ItemsFacet
 * @dev This contract handles the creation and management of items
 * It uses ERC1155 tokens to represent items and provides methods to mint new items,
 * claim items via Merkle tree or a whitelist, and set the base and URIs for
 * the items. It also uses the ReentrancyGuard and Multicall contracts for security
 * and gas efficiency.
 */
contract ItemsFacet is ERC1155Base, ERC1155Enumerable, ERC1155Metadata, ReentrancyGuard, ItemsInternal, Multicall {
    
    /**
     * @notice Claims an item if present in the Merkle tree
     * @param itemId The ID of the item to claim
     * @param amount The amount of the item to claim
     * @param proof The Merkle proof for the item
     */
    function claimMerkle(uint itemId, uint amount, bytes32[] calldata proof)
        public nonReentrant
    {
        _claimMerkle(msg.sender, itemId, amount, proof);
    }

    /**
     * @notice Claims items if present in the Merkle tree
     * @param itemsIds The IDs of the items to claim
     * @param amounts The amounts of the items to claim
     * @param proofs The Merkle proofs for the items
     */
    function claimMerkleBatch(uint256[] calldata itemsIds, uint[] calldata amounts, bytes32[][] calldata proofs) external nonReentrant {
        _claimMerkleBatch(msg.sender, itemsIds, amounts, proofs);
    }

    /**
     * @notice Claims items from a whitelist
     * @param itemIds The IDs of the items to claim
     * @param amounts The amounts of the items to claim
     */
    function claimWhitelist(uint[] calldata itemIds, uint[] calldata amounts) external {
        _claimWhitelist(itemIds, amounts);
    }

    /**
     * @notice Amount claimed by an address of a specific item
     * @param account the account to query
     * @param itemId the item id to query
     * @return amount returns the claimed amount given an account and an item id
     */
    function claimedAmount(address account, uint itemId) external view returns (uint amount) {
        return _claimedAmount(account, itemId);
    }

    /**
     * @notice Mints a new item
     * @param to The address to mint the item to
     * @param id The ID of the item to mint
     * @param amount The amount of the items to mint
     */
    function mint(address to, uint256 id, uint256 amount)
        public onlyMinter
    {
        _mint(to, id, amount);
    }

    /**
     * @notice Mint a batch of items to a specific address
     * @dev Only account with minter role can call this function
     * @param to The address to receive the minted items
     * @param ids An array of items IDs to be minted
     * @param amounts An array of corresponding amounts to be minted for each item ID
     */
    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts)
        public onlyMinter
    {
        _mintBatch(to, ids, amounts);
    }

    /**
     * @notice Set the base URI for all items metadata
     * @dev Only the manager role can call this function
     * @param baseURI The new base URI
     */
    function setBaseURI(string calldata baseURI) external onlyManager {
        _setBaseURI(baseURI);
    }

    /**
     * @notice Set the URI for a specific item ID
     * @dev Only the manager role can call this function
     * @param tokenId The ID of the item to set the URI for
     * @param tokenURI The new item URI
     */
    function setTokenURI(uint tokenId, string calldata tokenURI) external onlyManager {
        _setTokenURI(tokenId, tokenURI);
    }


    // required overrides
    function supportsInterface(bytes4 _interface) external pure returns (bool) {
        return type(IERC1155).interfaceId == _interface;
    }

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
        override (ERC1155BaseInternal, ERC1155EnumerableInternal, ItemsInternal)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}