// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

import { MintPassStorage } from "./MintPassStorage.sol";
import { IERC721A } from "./IERC721A.sol";

contract MintPassInternal {

    error MintPass_ClaimInactive();

    event MintPassConsumed(address indexed account, uint tokenId);

    function _totalClaimedMintPass() internal view returns (uint) {
        return MintPassStorage.layout().totalClaimed;
    }

    function _claimedMintPass(address account) internal view returns (uint) {
        return MintPassStorage.layout().claimedAmount[account];
    }

    function _elegibleMintPass(address account) internal view returns (uint elegibleAmount) {
        MintPassStorage.Layout storage mintPassSL = MintPassStorage.layout();

        IERC721A passContract = IERC721A(mintPassSL.passContractAddress);

        uint[] memory tokensOfOwner = passContract.tokensOfOwner(account);
        for (uint i = 0; i < tokensOfOwner.length; i++) {
            if (!mintPassSL.isTokenClaimed[tokensOfOwner[i]]) {
                elegibleAmount++;
            }
        }
    }

    function _consumeMintPass(address account) internal returns (bool consumed) {
        MintPassStorage.Layout storage mintPassSL = MintPassStorage.layout();

        IERC721A passContract = IERC721A(mintPassSL.passContractAddress);

        if (!MintPassStorage.layout().claimActive)
            revert MintPass_ClaimInactive();

        uint[] memory tokensOfOwner = passContract.tokensOfOwner(account);

        for (uint i = 0; i < tokensOfOwner.length; i++) {
            uint tokenId = tokensOfOwner[i];
            if (!mintPassSL.isTokenClaimed[tokenId]) {
                mintPassSL.claimedAmount[account]++;
                mintPassSL.totalClaimed++;
                mintPassSL.isTokenClaimed[tokenId] = true;
                consumed = true;

                emit MintPassConsumed(account, 1);
                break;
            }
        }
    }

    function _isMintPassClaimActive() view internal returns (bool) {
        return MintPassStorage.layout().claimActive;
    }

    function _setClaimActiveMintPass(bool active) internal {
        MintPassStorage.layout().claimActive = active;
    }

    function _setMintPassContractAddress(address passContractAddress) internal {
        MintPassStorage.layout().passContractAddress = passContractAddress;
    }

    function _mintPassContractAddress() internal view returns (address) {
        return MintPassStorage.layout().passContractAddress;
    }

    function _isTokenClaimed(uint tokenId) internal view returns (bool) {
        return MintPassStorage.layout().isTokenClaimed[tokenId];
    }
}