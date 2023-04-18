// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { WhitelistStorage } from "./WhitelistStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";

contract WhitelistInternal is RolesInternal {

    error Whitelist_ExceedsElegibleAmount();
    error Whitelist_InputDataMismatch();
    error Whitelist_ClaimStateAlreadyUpdated();
    error Whitelist_ClaimInactive();

    event WhitelistBalanceChanged(address account, uint totalElegibleAmount, uint totalClaimedAmount);

    function _consumeWhitelist(address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        if (whitelistSL.claimInactive) 
            revert Whitelist_ClaimInactive();
            
        if (whitelistSL.elegible[account] < amount) 
            revert Whitelist_ExceedsElegibleAmount();

        whitelistSL.elegible[account] -= amount;
        whitelistSL.claimed[account] += amount;
        whitelistSL.totalClaimed += amount;
        whitelistSL.totalElegible -= amount;

        emit WhitelistBalanceChanged(msg.sender, whitelistSL.elegible[account], whitelistSL.claimed[account]);
    }

    function _increaseWhitelistElegible(address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        whitelistSL.elegible[account] += amount;
        whitelistSL.totalElegible += amount;
        
        emit WhitelistBalanceChanged(msg.sender, whitelistSL.elegible[account], whitelistSL.claimed[account]);
    }

    function _increaseWhitelistElegibleBatch(address[] calldata accounts, uint[] calldata amounts) internal {
        if (accounts.length != amounts.length) revert Whitelist_InputDataMismatch();

        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        for (uint i = 0; i < accounts.length; i++) {
            whitelistSL.elegible[accounts[i]] += amounts[i];
            whitelistSL.totalElegible += amounts[i];
            emit WhitelistBalanceChanged(msg.sender, whitelistSL.elegible[accounts[i]], whitelistSL.claimed[accounts[i]]);
        }
    }

    function _setWhitelistElegible(address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        whitelistSL.totalElegible += amount - whitelistSL.elegible[account];
        whitelistSL.elegible[account] += amount;
        emit WhitelistBalanceChanged(msg.sender, whitelistSL.elegible[account], whitelistSL.claimed[account]);
    }

    function _setWhitelistElegibleBatch(address[] calldata accounts, uint[] calldata amounts) internal {
        if (accounts.length != amounts.length) revert Whitelist_InputDataMismatch();

        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        for (uint i = 0; i < accounts.length; i++) {
            whitelistSL.totalElegible += amounts[i] - whitelistSL.elegible[accounts[i]];
            whitelistSL.elegible[accounts[i]] = amounts[i];
            emit WhitelistBalanceChanged(msg.sender, whitelistSL.elegible[accounts[i]], whitelistSL.claimed[accounts[i]]);
        }
    }

    function _isWhitelistClaimActive() view internal returns (bool) {
        return !WhitelistStorage.layout().claimInactive;
    }

    function _setWhitelistClaimActive() internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        if (!whitelistSL.claimInactive) revert Whitelist_ClaimInactive();
        
        whitelistSL.claimInactive = false;
    }

    function _setWhitelistClaimInactive() internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        if (whitelistSL.claimInactive) revert Whitelist_ClaimStateAlreadyUpdated();
        
        whitelistSL.claimInactive = true;
    }
}