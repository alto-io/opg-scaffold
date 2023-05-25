// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

import { ERC1155Base } from "@solidstate/contracts/token/ERC1155/base/ERC1155Base.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155Enumerable } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155Enumerable.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155Metadata } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155Metadata.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { ItemsInternal } from "./ItemsInternal.sol";
import { ItemsStorage } from "./ItemsStorage.sol";
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
    function claimMerkleBatch(uint[] calldata itemsIds, uint[] calldata amounts, bytes32[][] calldata proofs) external nonReentrant {
        _claimMerkleBatch(msg.sender, itemsIds, amounts, proofs);
    }

    /**
     * @notice Claims items from a whitelist
     * @param itemIds The IDs of the items to claim
     * @param amounts The amounts of the items to claim
     */
    function claimWhitelist(uint[] calldata itemIds, uint[] calldata amounts) external nonReentrant {
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
     * @notice Burn an amount of an item
     * @param itemId The ID of the item to burn
     * @param amount The item amount to burn
     */
    function burn(uint itemId, uint amount)
        public
    {
        _burn(msg.sender, itemId, amount);
    }

    /**
     * @notice Burn amounts of items
     * @param itemIds The item ID burn
     * @param amounts The item amounts to be minted
     */
    function burnBatch(uint256[] memory itemIds, uint256[] memory amounts)
        public
    {
        _burnBatch(msg.sender, itemIds, amounts);
    }

    /**
     * @notice Mints a new item. Only minter role account can mint
     * @param to The address to mint the item to
     * @param itemId The ID of the item to mint
     * @param amount The item amount to be minted
     */
    function mint(address to, uint itemId, uint amount)
        public onlyManager
    {
        _mint(to, itemId, amount);
    }

    /**
     * @notice Mint a batch of items to a specific address. Only minter role account can mint
     * @param to The address to receive the minted items
     * @param itemIds An array of items IDs to be minted
     * @param amounts The items amounts to be minted
     */
    function mintBatch(address to, uint[] calldata itemIds, uint[] calldata amounts)
        public onlyManager
    {
        _mintBatch(to, itemIds, amounts);
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
     * @notice Set the base URI for all items metadata
     * @dev Only the manager role can call this function
     * @param newBaseURI The new base URI
     * @param migrate Should migrate to IPFS
     */
    function migrateToIPFS(string calldata newBaseURI, bool migrate) external onlyManager {
        _migrateToIPFS(newBaseURI, migrate);
    }

    /**
     * @dev Returns the current inventory address
     * @return The address of the inventory contract
     */
    function getInventoryAddress() external view returns (address) {
        return _getInventoryAddress();
    }

    /**
     * @dev Sets the inventory address
     * @param inventoryAddress The new address of the inventory contract
     */
    function setInventoryAddress(address inventoryAddress) external onlyManager {
        _setInventoryAddress(inventoryAddress);
    }

    /**
     * @notice Override ERC1155Metadata
     */
    function uri(uint tokenId) public view override returns (string memory) {
        if (ItemsStorage.layout().isMigratedToIPFS) {
            return string.concat(super.uri(tokenId), ".json");
        } else {
            return super.uri(tokenId);
        }
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


    // overrides
    function safeTransferFrom(
        address from,
        address to,
        uint id,
        uint amount,
        bytes memory data
    ) public override (ERC1155Base) {
        // Add red carpet logic for the inventory
        if (from != msg.sender && !isApprovedForAll(from, msg.sender) && _getInventoryAddress() != msg.sender )
            revert ERC1155Base__NotOwnerOrApproved();
        _safeTransfer(msg.sender, from, to, id, amount, data);
    }

    function supportsInterface(bytes4 _interface) external pure returns (bool) {
        return type(IERC1155).interfaceId == _interface;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint[] memory ids,
        uint[] memory amounts,
        bytes memory data
    )
        internal
        virtual
        override (ERC1155BaseInternal, ERC1155EnumerableInternal, ItemsInternal)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}