// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { SolidStateERC1155 } from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";
// import { ReentrancyGuard } from "@solidstate/contracts/utils/SolidStateERC1155.sol"; // nonReentrant()
import { ItemsStorage } from "./ItemsStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";

contract ItemsFacet is SolidStateERC1155, RolesInternal, MerkleInternal {

    event Claimed(address indexed to, uint256 indexed tokenId, uint amount);

    function claim(address to, uint tokenId, uint amount, bytes32[] memory proof)
        public
    {
        ItemsStorage.Layout storage itemsS = ItemsStorage.layout();

        // Revert if the token was already claimed before
        require(!itemsS.claimed[to][tokenId], "Already claimed");
        itemsS.claimed[to][tokenId] = true;

        // Verify if is elegible
        bytes memory leaf = abi.encode(to, tokenId, amount);
        _validateLeaf(proof, leaf);

        // Mint token to address
        _mint(to, tokenId, amount, '');

        emit Claimed(to, tokenId, amount);
    }

    function claimBatch(address to, uint256[] calldata tokenIds, uint[] calldata amounts, bytes32[][] calldata proofs) external {
        require(tokenIds.length == amounts.length, "Inputs length mismatch");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            claim(to, tokenIds[i], amounts[i], proofs[i]);
        }
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        public
    {
        _mint(account, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
    {
        _mintBatch(to, ids, amounts, data);
    }

    function setBaseURI(string memory baseURI) external onlyManager {
        _setBaseURI(baseURI);
    }

    function setTokenURI(uint tokenId, string memory tokenURI) external onlyManager {
        _setTokenURI(tokenId, tokenURI);
    }
}