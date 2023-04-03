// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { WhitelistInternal } from './WhitelistInternal.sol';

/**
 * @title WhitelistFacet
 * @notice This contract allows the admins to whitelist an address with a specific amount,
 * which can then be used to claim tokens in other contracts.
 * To consume the whitelist, the token contracts should call the internal functions from WhitelistInternal.
 * This contract can be used as a facet of a diamond which follows the EIP-2535 diamond standard.
 */
contract WhitelistFacet is WhitelistInternal {

    /**
     * @notice Returns the amount claimed by a whitelisted account
     * @param account The address of the account to query
     * @return The amount claimed by the account
     */
    function claimedWhitelist(address account) external view returns (uint) {
        return _claimedWhitelist(account);
    }

    /**
     * @notice Returns the remaining elegible amount for a whitelisted account
     * @param account The address of the account to query
     * @return The elegible amount of the account
     */
    function elegibleWhitelist(address account) external view returns (uint) {
        return _elegibleWhitelist(account);
    }
    
    /**
     * @notice Returns the total claimed amount
     * @return The total claimed amount
     */
    function totalClaimedWhitelist() external view returns (uint) {
        return _totalClaimedWhitelist();
    }
    
    /**
     * @notice Returns the total elegible amount
     * @return The total elegible amount
     */
    function totalElegibleWhitelist() external view returns (uint) {
        return _totalElegibleWhitelist();
    }

    /**
     * @notice Increase the whitelist elegible amount for an address
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param amount The amount to whitelist for the address
     */
    function increaseWhitelistElegible(address account, uint amount) onlyManager external {
        _increaseWhitelistElegible(account, amount);
    }

    /**
     * @notice Increase the whitelist elegible amounts for multiple addresses
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param amounts An array of amounts to whitelist for each address
     */
    function increaseWhitelistElegibleBatch(address[] calldata accounts, uint[] calldata amounts) external onlyManager {
        _increaseWhitelistElegibleBatch(accounts, amounts);
    }

    /**
     * @notice Adds a new address to the whitelist with a specific amount
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param totalAmount The amount to whitelist for the address
     */
    function setWhitelistElegible(address account, uint totalAmount) onlyManager external {
        _setWhitelistElegible(account, totalAmount);
    }

    /**
     * @notice Adds multiple addresses to the whitelist with specific amounts
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param totalAmounts An array of amounts to whitelist for each address
     */
    function setWhitelistElegibleBatch(address[] calldata accounts, uint[] calldata totalAmounts) external onlyManager {
        _setWhitelistElegibleBatch(accounts, totalAmounts);
    }

    /**
     * @notice Updates the claim state to active and enables the claim of tokens
     * @dev This function can only be called by an address with the manager role
     */
    function setWhitelistClaimActive() external onlyManager {
        _setWhitelistClaimActive();
    }

    /**
     * @notice Updates the claim state to inactive and disables the claim of tokens
     * @dev This function can only be called by an address with the manager role
     */
    function setWhitelistClaimInactive() external onlyManager {
        _setWhitelistClaimInactive();
    }

    /**
     * @notice Returns true if elegible tokens can be claimed, or false otherwise
     * @return active bool indicating if claim is active
     */
    function isWhitelistClaimActive() view external returns (bool active) {
        return _isWhitelistClaimActive();
    }
}