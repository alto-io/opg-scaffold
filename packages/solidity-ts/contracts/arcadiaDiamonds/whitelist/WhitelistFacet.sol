// SPDX-License-Identifier: GPL-2.0
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
    WhitelistStorage.PoolId constant GuaranteedPool = WhitelistStorage.PoolId.Guaranteed;
    WhitelistStorage.PoolId constant RestrictedPool = WhitelistStorage.PoolId.Restricted;

    /**
     * @return The amount claimed from the guaranteed pool by the account
     */
    function claimedGuaranteedPool(address account) external view returns (uint) {
        return _claimedWhitelist(GuaranteedPool, account);
    }

    /**
     * @return The amount claimed from the restricted pool by the account 
     */
    function claimedRestrictedPool(address account) external view returns (uint) {
        return _claimedWhitelist(RestrictedPool, account);
    }

    /**
     * @return The account elegible amount from the guaranteed pool
     */
    function elegibleGuaranteedPool(address account) external view returns (uint) {
        return _elegibleWhitelist(GuaranteedPool, account);
    }

    /**
     * @return The account elegible amount from the restricted pool
     */
    function elegibleRestrictedPool(address account) external view returns (uint) {
        return _elegibleWhitelist(RestrictedPool, account);
    }
    
    /**
     * @return The total claimed amount from the Guaranteed pool
     */
    function totalClaimedGuaranteedPool() external view returns (uint) {
        return _totalClaimedWhitelist(GuaranteedPool);
    }
    
    /**
     * @return The total claimed amount from the Restricted pool
     */
    function totalClaimedRestrictedPool() external view returns (uint) {
        return _totalClaimedWhitelist(RestrictedPool);
    }
    
    /**
     * @return The total elegible amount from the Guaranteed pool
     */
    function totalElegibleGuaranteedPool() external view returns (uint) {
        return _totalElegibleWhitelist(GuaranteedPool);
    }

    /**
     * @return The total elegible amount from the Restricted pool
     */
    function totalElegibleRestrictedPool() external view returns (uint) {
        return _totalElegibleWhitelist(RestrictedPool);
    }

    /**
     * @notice Increase the account whitelist elegible amount in the Guaranteed pool
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param amount The amount to whitelist for the address
     */
    function increaseElegibleGuaranteedPool(address account, uint amount) onlyManager external {
        _increaseWhitelistElegible(GuaranteedPool, account, amount);
    }

    /**
     * @notice Increase the account whitelist elegible amount in the restricted pool
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param amount The amount to whitelist for the address
     */
    function increaseElegibleRestrictedPool(address account, uint amount) onlyManager external {
        _increaseWhitelistElegible(RestrictedPool, account, amount);
    }

    /**
     * @notice Increase the guaranteed pool elegible amounts for multiple addresses
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param amounts An array of amounts to whitelist for each address
     */
    function increaseElegibleGuaranteedPoolBatch(address[] calldata accounts, uint[] calldata amounts) external onlyManager {
        _increaseWhitelistElegibleBatch(GuaranteedPool, accounts, amounts);
    }

    /**
     * @notice Increase the restricted pool elegible amounts for multiple addresses
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param amounts An array of amounts to whitelist for each address
     */
    function increaseElegibleRestrictedPoolBatch(address[] calldata accounts, uint[] calldata amounts) external onlyManager {
        _increaseWhitelistElegibleBatch(RestrictedPool, accounts, amounts);
    }

    /**
     * @notice Adds a new address to the Guaranteed Pool with a specific amount
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param totalAmount The amount to whitelist for the address
     */
    function setElegibleGuaranteedPool(address account, uint totalAmount) onlyManager external {
        _setWhitelistElegible(GuaranteedPool, account, totalAmount);
    }

    /**
     * @notice Adds a new address to the Restricted Pool with a specific amount
     * @dev This function can only be called by an address with the manager role
     * @param account The address to add to the whitelist
     * @param totalAmount The amount to whitelist for the address
     */
    function setElegibleRestrictedPool(address account, uint totalAmount) onlyManager external {
        _setWhitelistElegible(RestrictedPool, account, totalAmount);
    }

    /**
     * @notice Adds multiple addresses to the Guaranteed Pool with specific amounts
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param totalAmounts An array of amounts to whitelist for each address
     */
    function setElegibleGuaranteedPoolBatch(address[] calldata accounts, uint[] calldata totalAmounts) external onlyManager {
        _setWhitelistElegibleBatch(GuaranteedPool, accounts, totalAmounts);
    }

    /**
     * @notice Adds multiple addresses to the Restricted Pool with specific amounts
     * @dev This function can only be called by an address with the manager role
     * @param accounts An array of addresses to add to the whitelist
     * @param totalAmounts An array of amounts to whitelist for each address
     */
    function setElegibleRestrictedPoolBatch(address[] calldata accounts, uint[] calldata totalAmounts) external onlyManager {
        _setWhitelistElegibleBatch(RestrictedPool, accounts, totalAmounts);
    }

    /**
     * @notice Updates the claim state to active and enables the guaranteed pool token claim
     * @dev This function can only be called by an address with the manager role
     */
    function setClaimActiveGuaranteedPool(bool active) external onlyManager {
        _setWhitelistClaimActive(GuaranteedPool, active);
    }

    /**
     * @notice Updates the claim state to active and enables the restricted pool token claim
     * @dev This function can only be called by an address with the manager role
     */
    function setClaimActiveRestrictedPool(bool active) external onlyManager {
        _setWhitelistClaimActive(RestrictedPool, active);
    }

    /**
     * @notice Returns true if elegible tokens can be claimed in the guaranteed pool, or false otherwise
     * @return active bool indicating if claim is active
     */
    function isClaimActiveGuaranteedPool() view external returns (bool active) {
        return _isWhitelistClaimActive(GuaranteedPool);
    }

    /**
     * @notice Returns true if elegible tokens can be claimed in the restricted pool, or false otherwise
     * @return active bool indicating if claim is active
     */
    function isClaimActiveRestrictedPool() view external returns (bool active) {
        return _isWhitelistClaimActive(RestrictedPool);
    }
    
    /**
     * @return supply Returns the max supply available for the restricted pool
     */
    function maxSupplyRestrictedPool() view external returns (uint supply) {
        return _maxSupplyWhitelist(RestrictedPool);
    }

    /**
     * @return supply Returns the max supply available for the guaranteed pool
     */
    function maxSupplyGuaranteedPool() view external returns (uint supply) {
        return _maxSupplyWhitelist(GuaranteedPool);
    }
}