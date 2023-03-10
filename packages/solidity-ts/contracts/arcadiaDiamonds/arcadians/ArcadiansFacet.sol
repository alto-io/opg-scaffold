// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { SolidStateERC721 } from "@solidstate/contracts/token/ERC721/SolidStateERC721.sol";
import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";

contract ArcadiansFacet is SolidStateERC721, ArcadiansInternal, MerkleInternal {

    event Claimed(address indexed to, uint256 indexed amount);

    function claim(address to, uint totalAmount, bytes32[] memory proof)
        public
    {
        ArcadiansStorage.Layout storage es = ArcadiansStorage.layout();

        // Revert if the token was already claimed before
        require(es.amountClaimed[to] < totalAmount, "All tokens claimed");

        // Verify if is elegible
        bytes memory leaf = abi.encode(to, totalAmount);
        _validateLeaf(proof, leaf);

        // Mint token to address
        uint amountLeftToClaim = totalAmount - es.amountClaimed[to];
        for (uint256 i = 0; i < amountLeftToClaim; i++) {
            uint tokenId = es.counterId;
            _mint(to, tokenId);
            es.counterId++;
        }
        es.amountClaimed[to] += amountLeftToClaim;
        emit Claimed(to, amountLeftToClaim);
    }

    function mint(address account)
        public
    {
        ArcadiansStorage.Layout storage es = ArcadiansStorage.layout();
        _mint(account, es.counterId);
        es.counterId++;
    }

    function setBaseURI(string memory baseURI) external onlyManager {
        _setBaseURI(baseURI);
    }

    function getBaseURI() external view returns (string memory) {
        return _getBaseURI();
    }
}