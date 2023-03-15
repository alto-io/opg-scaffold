// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import { SolidStateERC721 } from "@solidstate/contracts/token/ERC721/SolidStateERC721.sol";
import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { MerkleInternal } from "../merkle/MerkleInternal.sol";
import { ArcadiansInternal } from "./ArcadiansInternal.sol";
import { ISolidStateERC721 } from '@solidstate/contracts/token/ERC721/ISolidStateERC721.sol';

interface IArcadiansFacet is ISolidStateERC721 {

    event Claimed(address indexed to, uint256 indexed amount);

    function claim(uint totalAmount, bytes32[] memory proof) external;

    function getClaimedAmount(address account) external view returns (uint);

    function mint() external payable;

    function setMintPrice(uint newMintPrice) external;

    function getMintPrice() external view returns (uint);

    function setMaxMintPerUser(uint newMaxMintPerUser) external;

    function getMaxMintPerUser() external view returns (uint);

    function setBaseURI(string memory baseURI) external;
    
    function getBaseURI() external view returns (string memory);
}