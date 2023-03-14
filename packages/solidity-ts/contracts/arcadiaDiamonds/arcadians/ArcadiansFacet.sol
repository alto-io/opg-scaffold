// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import { SolidStateERC721 } from "@solidstate/contracts/token/ERC721/SolidStateERC721.sol";
import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";

contract ArcadiansFacet is ArcadiansInternal, MerkleInternal {

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

    function getClaimedAmount(address account) external view returns (uint) {
        return _getClaimedAmount(account);
    }

    function mint(address to)
        public payable
    {
        _mint(to);
    }

    function setMintPrice(uint newMintPrice) external onlyManager {
        _setMintPrice(newMintPrice);
    }
    function getMintPrice() external view returns (uint) {
        return _getMintPrice();
    }

    function setMaxMintPerUser(uint newMaxMintPerUser) external onlyManager {
        _setMaxMintPerUser(newMaxMintPerUser);
    }
    function getMaxMintPerUser() external view returns (uint) {
        return _getMaxMintPerUser();
    }

    function setBaseURI(string memory baseURI) external onlyManager {
        _setBaseURI(baseURI);
    }
    function getBaseURI() external view returns (string memory) {
        return _getBaseURI();
    }
}