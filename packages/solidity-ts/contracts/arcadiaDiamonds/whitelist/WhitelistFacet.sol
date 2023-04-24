// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { WhitelistInternal } from './WhitelistInternal.sol';
import { WhitelistStorage } from "./WhitelistStorage.sol";

/**
 * @title WhitelistFacet
 * @notice This contract allows the admins to whitelist an address with a specific amount,
 * which can then be used to claim tokens in other contracts.
 * To consume the whitelist, the token contracts should call the internal functions from WhitelistInternal.
 * This contract can be used as a facet of a diamond which follows the EIP-2535 diamond standard.
 */
contract WhitelistFacet is WhitelistInternal {
    /**
     * @return The amount claimed from the guaranteed pool by the account
     */
    function claimedGuaranteedPool(address account) external view returns (uint) {
        return _claimedWhitelist(WhitelistStorage.PoolId.Guaranteed, account);
    }

    /**
     * @return The amount claimed from the restricted pool by the account 
     */
    function claimedRestrictedPool(address account) external view returns (uint) {
        return _claimedWhitelist(WhitelistStorage.PoolId.Restricted, account);
    }

    /**
     * @return The account elegible amount from the guaranteed pool
     */
    function elegibleGuaranteedPool(address account) external view returns (uint) {
        return _elegibleWhitelist(WhitelistStorage.PoolId.Guaranteed, account);
    }

    /**
     * @return The account elegible amount from the restricted pool
     */
    function elegibleRestrictedPool(address account) external view returns (uint) {
        return _elegibleWhitelist(WhitelistStorage.PoolId.Restricted, account);
    }
    
    /**
     * @return The total claimed amount from the Guaranteed pool
     */
    function totalClaimedGuaranteedPool() external view returns (uint) {
        return _totalClaimedWhitelist(WhitelistStorage.PoolId.Guaranteed);
    }
    
    /**
     * @return The total claimed amount from the Restricted pool
     */
    function totalClaimedRestrictedPool() external view returns (uint) {
        return _totalClaimedWhitelist(WhitelistStorage.PoolId.Restricted);
    }
    
    /**
     * @return The total elegible amount from the Guaranteed pool
     */
    function totalElegibleGuaranteedPool() external view returns (uint) {
        return _totalElegibleWhitelist(WhitelistStorage.PoolId.Guaranteed);
    }

    /**
     * @return The total elegible amount from the Restricted pool
     */
    function totalElegibleRestrictedPool() external view returns (uint) {
        return _totalElegibleWhitelist(WhitelistStorage.PoolId.Restricted);
    }

    /**
     * @notice Increase the account whitelist elegible amount in the Guaranteed pool
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param amount The amount to whitelist for the address
     */
    function increaseElegibleGuaranteedPool(address account, uint amount) onlyManager external {
        _increaseWhitelistElegible(WhitelistStorage.PoolId.Guaranteed, account, amount);
    }

    /**
     * @notice Increase the account whitelist elegible amount in the restricted pool
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param amount The amount to whitelist for the address
     */
    function increaseElegibleRestrictedPool(address account, uint amount) onlyManager external {
        _increaseWhitelistElegible(WhitelistStorage.PoolId.Restricted, account, amount);
    }

    /**
     * @notice Increase the guaranteed pool elegible amounts for multiple addresses
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param amounts An array of amounts to whitelist for each address
     */
    function increaseElegibleGuaranteedPoolBatch(address[] calldata accounts, uint[] calldata amounts) external onlyManager {
        _increaseWhitelistElegibleBatch(WhitelistStorage.PoolId.Guaranteed, accounts, amounts);
    }

    /**
     * @notice Increase the restricted pool elegible amounts for multiple addresses
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param amounts An array of amounts to whitelist for each address
     */
    function increaseElegibleRestrictedPoolBatch(address[] calldata accounts, uint[] calldata amounts) external onlyManager {
        _increaseWhitelistElegibleBatch(WhitelistStorage.PoolId.Restricted, accounts, amounts);
    }

    /**
     * @notice Adds a new address to the Guaranteed Pool with a specific amount
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param totalAmount The amount to whitelist for the address
     */
    function setElegibleGuaranteedPool(address account, uint totalAmount) onlyManager external {
        _setWhitelistElegible(WhitelistStorage.PoolId.Guaranteed, account, totalAmount);
    }

    /**
     * @notice Adds a new address to the Restricted Pool with a specific amount
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param totalAmount The amount to whitelist for the address
     */
    function setElegibleRestrictedPool(address account, uint totalAmount) onlyManager external {
        _setWhitelistElegible(WhitelistStorage.PoolId.Restricted, account, totalAmount);
    }

    /**
     * @notice Adds multiple addresses to the Guaranteed Pool with specific amounts
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param totalAmounts An array of amounts to whitelist for each address
     */
    function setElegibleGuaranteedPoolBatch(address[] calldata accounts, uint[] calldata totalAmounts) external onlyManager {
        _setWhitelistElegibleBatch(WhitelistStorage.PoolId.Guaranteed, accounts, totalAmounts);
    }

    /**
     * @notice Adds multiple addresses to the Restricted Pool with specific amounts
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param totalAmounts An array of amounts to whitelist for each address
     */
    function setElegibleRestrictedPoolBatch(address[] calldata accounts, uint[] calldata totalAmounts) external onlyManager {
        _setWhitelistElegibleBatch(WhitelistStorage.PoolId.Restricted, accounts, totalAmounts);
    }

    /**
     * @notice Updates the claim state to active and enables the guaranteed pool token claim
     * @dev This function can only be called by an address with the manager role
     */
    function setClaimActiveGuaranteedPool(bool active) external onlyManager {
        _setWhitelistClaimActive(WhitelistStorage.PoolId.Guaranteed, active);
    }

    /**
     * @notice Updates the claim state to active and enables the restricted pool token claim
     * @dev This function can only be called by an address with the manager role
     */
    function setClaimActiveRestrictedPool(bool active) external onlyManager {
        _setWhitelistClaimActive(WhitelistStorage.PoolId.Restricted, active);
    }

    /**
     * @notice Returns true if elegible tokens can be claimed in the guaranteed pool, or false otherwise
     * @return active bool indicating if claim is active
     */
    function isClaimActiveGuaranteedPool() view external returns (bool active) {
        return _isWhitelistClaimActive(WhitelistStorage.PoolId.Guaranteed);
    }

    /**
     * @notice Returns true if elegible tokens can be claimed in the restricted pool, or false otherwise
     * @return active bool indicating if claim is active
     */
    function isClaimActiveRestrictedPool() view external returns (bool active) {
        return _isWhitelistClaimActive(WhitelistStorage.PoolId.Restricted);
    }
}