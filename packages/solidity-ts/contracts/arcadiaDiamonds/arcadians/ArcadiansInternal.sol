// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import { SolidStateERC721 } from "@solidstate/contracts/token/ERC721/SolidStateERC721.sol";
// import { ArcadiansStorage } from "./ArcadiansStorage.sol";
// import { MerkleInternal } from "../../merkle/MerkleInternal.sol";
import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { RolesInternal } from "..//roles/RolesInternal.sol";

contract ArcadiansInternal is RolesInternal {

    function _setBaseURI(string memory baseURI) internal onlyManager {
        ERC721MetadataStorage.layout().baseURI = baseURI;
    }

    function _getBaseURI() internal view returns (string memory) {
        return ERC721MetadataStorage.layout().baseURI;
    }
}