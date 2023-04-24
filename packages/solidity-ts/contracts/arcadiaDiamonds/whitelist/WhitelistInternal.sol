// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { WhitelistStorage } from "./WhitelistStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";

contract WhitelistInternal is RolesInternal {

    error Whitelist_ExceedsElegibleAmount();
    error Whitelist_InputDataMismatch();
    error Whitelist_ClaimStateAlreadyUpdated();
    error Whitelist_ClaimInactive();

    event WhitelistBalanceChanged(address account, WhitelistStorage.PoolId poolId, uint totalElegibleAmount, uint totalClaimedAmount);

    function _totalClaimedWhitelist(WhitelistStorage.PoolId poolId) internal view returns (uint) {
        return WhitelistStorage.layout().pools[poolId].totalClaimed;
    }

    function _totalElegibleWhitelist(WhitelistStorage.PoolId poolId) internal view returns (uint) {
        return WhitelistStorage.layout().pools[poolId].totalElegible;
    }

    function _claimedWhitelist(WhitelistStorage.PoolId poolId, address account) internal view returns (uint) {
        return WhitelistStorage.layout().pools[poolId].claimed[account];
    }

    function _elegibleWhitelist(WhitelistStorage.PoolId poolId, address account) internal view returns (uint) {
        return WhitelistStorage.layout().pools[poolId].elegible[account];
    }

    function _consumeWhitelist(WhitelistStorage.PoolId poolId, address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        if (!whitelistSL.pools[poolId].claimActive)
            revert Whitelist_ClaimInactive();

        if (whitelistSL.pools[poolId].elegible[account] < amount) 
            revert Whitelist_ExceedsElegibleAmount();

        whitelistSL.pools[poolId].elegible[account] -= amount;
        whitelistSL.pools[poolId].claimed[account] += amount;
        whitelistSL.pools[poolId].totalClaimed += amount;
        whitelistSL.pools[poolId].totalElegible -= amount;

        emit WhitelistBalanceChanged(account, poolId, whitelistSL.pools[poolId].elegible[account], whitelistSL.pools[poolId].claimed[account]);
    }

    function _increaseWhitelistElegible(WhitelistStorage.PoolId poolId, address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        whitelistSL.pools[poolId].elegible[account] += amount;
        whitelistSL.pools[poolId].totalElegible += amount;
        
        emit WhitelistBalanceChanged(account, poolId, whitelistSL.pools[poolId].elegible[account], whitelistSL.pools[poolId].claimed[account]);
    }

    function _increaseWhitelistElegibleBatch(WhitelistStorage.PoolId poolId, address[] calldata accounts, uint[] calldata amounts) internal {
        if (accounts.length != amounts.length) revert Whitelist_InputDataMismatch();

        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        for (uint i = 0; i < accounts.length; i++) {
            whitelistSL.pools[poolId].elegible[accounts[i]] += amounts[i];
            whitelistSL.pools[poolId].totalElegible += amounts[i];
            emit WhitelistBalanceChanged(accounts[i], poolId, whitelistSL.pools[poolId].elegible[accounts[i]], whitelistSL.pools[poolId].claimed[accounts[i]]);
        }
    }

    function _setWhitelistElegible(WhitelistStorage.PoolId poolId, address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        whitelistSL.pools[poolId].totalElegible += amount - whitelistSL.pools[poolId].elegible[account];
        whitelistSL.pools[poolId].elegible[account] += amount;
        emit WhitelistBalanceChanged(account, poolId, whitelistSL.pools[poolId].elegible[account], whitelistSL.pools[poolId].claimed[account]);
    }

    function _setWhitelistElegibleBatch(WhitelistStorage.PoolId poolId, address[] calldata accounts, uint[] calldata amounts) internal {
        if (accounts.length != amounts.length) revert Whitelist_InputDataMismatch();

        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        for (uint i = 0; i < accounts.length; i++) {
            whitelistSL.pools[poolId].totalElegible += amounts[i] - whitelistSL.pools[poolId].elegible[accounts[i]];
            whitelistSL.pools[poolId].elegible[accounts[i]] = amounts[i];
            emit WhitelistBalanceChanged(accounts[i], poolId, whitelistSL.pools[poolId].elegible[accounts[i]], whitelistSL.pools[poolId].claimed[accounts[i]]);
        }
    }

    function _isWhitelistClaimActive(WhitelistStorage.PoolId poolId) view internal returns (bool) {
        return WhitelistStorage.layout().pools[poolId].claimActive;
    }

    function _setWhitelistClaimActive(WhitelistStorage.PoolId poolId, bool active) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        if (active == whitelistSL.pools[poolId].claimActive) 
            revert Whitelist_ClaimStateAlreadyUpdated();
        
        whitelistSL.pools[poolId].claimActive = active;
    }
}