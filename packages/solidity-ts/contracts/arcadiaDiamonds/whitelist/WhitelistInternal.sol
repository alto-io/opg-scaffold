// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

import { WhitelistStorage } from "./WhitelistStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";
contract WhitelistInternal is RolesInternal {

    error Whitelist_ExceedsElegibleAmount();
    error Whitelist_InputDataMismatch();
    error Whitelist_ClaimStateAlreadyUpdated();
    error Whitelist_ClaimInactive();

    event WhitelistBalanceChanged(address indexed account, WhitelistStorage.PoolId poolId, uint totalElegibleAmount, uint totalClaimedAmount);

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
        WhitelistStorage.Pool storage pool = whitelistSL.pools[poolId];

        if (!pool.claimActive)
            revert Whitelist_ClaimInactive();

        if (pool.elegible[account] < amount) 
            revert Whitelist_ExceedsElegibleAmount();

        pool.elegible[account] -= amount;
        pool.claimed[account] += amount;
        pool.totalClaimed += amount;
        pool.totalElegible -= amount;

        emit WhitelistBalanceChanged(account, poolId, pool.elegible[account], pool.claimed[account]);
    }

    function _increaseWhitelistElegible(WhitelistStorage.PoolId poolId, address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        WhitelistStorage.Pool storage pool = whitelistSL.pools[poolId];
        pool.elegible[account] += amount;
        pool.totalElegible += amount;
        
        emit WhitelistBalanceChanged(account, poolId, pool.elegible[account], pool.claimed[account]);
    }

    function _increaseWhitelistElegibleBatch(WhitelistStorage.PoolId poolId, address[] calldata accounts, uint[] calldata amounts) internal {
        if (accounts.length != amounts.length) revert Whitelist_InputDataMismatch();

        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        WhitelistStorage.Pool storage pool = whitelistSL.pools[poolId];

        for (uint i = 0; i < accounts.length; i++) {
            pool.elegible[accounts[i]] += amounts[i];
            pool.totalElegible += amounts[i];
            emit WhitelistBalanceChanged(accounts[i], poolId, pool.elegible[accounts[i]], pool.claimed[accounts[i]]);
        }
    }

    function _setWhitelistElegible(WhitelistStorage.PoolId poolId, address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        WhitelistStorage.Pool storage pool = whitelistSL.pools[poolId];

        pool.totalElegible += amount - pool.elegible[account];
        pool.elegible[account] += amount;
        emit WhitelistBalanceChanged(account, poolId, pool.elegible[account], pool.claimed[account]);
    }

    function _setWhitelistElegibleBatch(WhitelistStorage.PoolId poolId, address[] calldata accounts, uint[] calldata amounts) internal {
        if (accounts.length != amounts.length) revert Whitelist_InputDataMismatch();

        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        WhitelistStorage.Pool storage pool = whitelistSL.pools[poolId];

        for (uint i = 0; i < accounts.length; i++) {
            pool.totalElegible += amounts[i] - pool.elegible[accounts[i]];
            pool.elegible[accounts[i]] = amounts[i];
            emit WhitelistBalanceChanged(accounts[i], poolId, pool.elegible[accounts[i]], pool.claimed[accounts[i]]);
        }
    }

    function _isWhitelistClaimActive(WhitelistStorage.PoolId poolId) view internal returns (bool) {
        return WhitelistStorage.layout().pools[poolId].claimActive;
    }

    function _setWhitelistClaimActive(WhitelistStorage.PoolId poolId, bool active) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        WhitelistStorage.Pool storage pool = whitelistSL.pools[poolId];
        
        pool.claimActive = active;
    }
}