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
    function whitelistClaimed(address account) external view returns (uint) {
        return _whitelistClaimed(account);
    }

    /**
     * @notice Returns the remaining balance for a whitelisted account
     * @param account The address of the account to query
     * @return The remaining balance of the account
     */
    function whitelistBalance(address account) external view returns (uint) {
        return _whitelistBalance(account);
    }

    /**
     * @notice Adds a new address to the whitelist with a specific amount
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param amount The amount to whitelist for the address
     */
    function addToWhitelist(address account, uint amount) onlyManager external {
        _addToWhitelist(account, amount);
    }

    /**
     * @notice Adds multiple addresses to the whitelist with specific amounts
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param amounts An array of amounts to whitelist for each address
     */
    function addToWhitelistBatch(address[] calldata accounts, uint[] calldata amounts) external onlyManager {
        _addToWhitelistBatch(accounts, amounts);
    }
}