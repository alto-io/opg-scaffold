// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

import { ERC721MetadataStorage } from "@solidstate/contracts/token/ERC721/metadata/ERC721MetadataStorage.sol";
import { UintUtils } from '@solidstate/contracts/utils/UintUtils.sol';
import { ArcadiansStorage } from "./ArcadiansStorage.sol";
import { RolesInternal } from "../roles/RolesInternal.sol";
import { WhitelistInternal } from "../whitelist/WhitelistInternal.sol";
import { WhitelistStorage } from "../whitelist/WhitelistStorage.sol";
import { InventoryInternal } from "../inventory/InventoryInternal.sol";
import { MintPassInternal } from "../mintPass/MintPassInternal.sol";

contract ArcadiansInternal is RolesInternal, WhitelistInternal, InventoryInternal, MintPassInternal {

    error Arcadians_InvalidPayAmount();
    error Arcadians_MaximumArcadiansSupplyReached();
    error Arcadians_NotElegibleToMint();

    event MaxMintPerUserChanged(address indexed by, uint oldMaxMintPerUser, uint newMaxMintPerUser);
    event MintPriceChanged(address indexed by, uint oldMintPrice, uint newMintPrice);
    event BaseURIChanged(address indexed by, string oldBaseURI, string newBaseURI);

    using UintUtils for uint;

    function _setBaseURI(string memory newBaseURI) internal {
        ERC721MetadataStorage.Layout storage ERC721SL = ERC721MetadataStorage.layout();
        emit BaseURIChanged(msg.sender, ERC721SL.baseURI, newBaseURI);
        ERC721SL.baseURI = newBaseURI;
    }

    function _baseURI() internal view returns (string memory) {
        return ERC721MetadataStorage.layout().baseURI;
    }

    function _mintPrice() internal view returns (uint) {
        return ArcadiansStorage.layout().mintPrice;
    }

    function _setMintPrice(uint newMintPrice) internal {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        emit MintPriceChanged(msg.sender, arcadiansSL.mintPrice, newMintPrice);
        arcadiansSL.mintPrice = newMintPrice;
    }

    function _setMaxMintPerUser(uint newMaxMintPerUser) internal {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        emit MaxMintPerUserChanged(msg.sender, arcadiansSL.maxMintPerUser, newMaxMintPerUser);
        arcadiansSL.maxMintPerUser = newMaxMintPerUser;
    }

    function _maxMintPerUser() internal view returns (uint) {
        return ArcadiansStorage.layout().maxMintPerUser;
    }

    function _setMaxSupply(uint arcadiansMaxSupply) internal {
        ArcadiansStorage.Layout storage arcadiansSL = ArcadiansStorage.layout();
        
        arcadiansSL.arcadiansMaxSupply = arcadiansMaxSupply;
    }
}