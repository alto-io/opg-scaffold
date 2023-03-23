// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { SolidStateERC1155 } from "@solidstate/contracts/token/ERC1155/SolidStateERC1155.sol";
import { ERC1155Base } from "@solidstate/contracts/token/ERC1155/base/ERC1155Base.sol";
import { ERC1155BaseInternal } from "@solidstate/contracts/token/ERC1155/base/ERC1155BaseInternal.sol";
import { ERC1155Enumerable } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155Enumerable.sol";
import { ERC1155EnumerableInternal } from "@solidstate/contracts/token/ERC1155/enumerable/ERC1155EnumerableInternal.sol";
import { ERC1155Metadata } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155Metadata.sol";
import { ERC1155Metadata } from "@solidstate/contracts/token/ERC1155/metadata/ERC1155Metadata.sol";
import { ReentrancyGuard } from "@solidstate/contracts/utils/ReentrancyGuard.sol";
import { ItemsStorage } from "./ItemsStorage.sol";
import { ItemsInternal } from "./ItemsInternal.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";

contract ItemsFacet is ERC1155Base, ERC1155Enumerable, ERC1155Metadata, ReentrancyGuard, ItemsInternal {
    
    function claim(uint tokenId, uint amount, bytes32[] calldata proof)
        public nonReentrant
    {
        _claim(tokenId, amount, proof);
    }

    function claimBatch(uint256[] calldata tokenIds, uint[] calldata amounts, bytes32[][] calldata proofs) external nonReentrant {
        _claimBatch(tokenIds, amounts, proofs);
    }

    function mint(address to, uint256 id, uint256 amount)
        public onlyMinter
    {
        _mint(to, id, amount);
    }

    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts)
        public onlyMinter
    {
        _mintBatch(to, ids, amounts);
    }

    function setBaseURI(string calldata baseURI) external onlyManager {
        _setBaseURI(baseURI);
    }

    function setTokenURI(uint tokenId, string calldata tokenURI) external onlyManager {
        _setTokenURI(tokenId, tokenURI);
    }

    // required overrides
    function supportsInterface(bytes4) external pure returns (bool) {
        return false;
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