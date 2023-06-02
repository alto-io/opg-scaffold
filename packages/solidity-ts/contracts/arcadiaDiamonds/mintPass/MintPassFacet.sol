// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

import { MintPassInternal } from './MintPassInternal.sol';
import { MintPassStorage } from "./MintPassStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";

/**
 * @title WhitelistFacet
 * @notice This contract allows the admins to whitelist an address with a specific amount,
 * which can then be used to claim tokens in other contracts.
 * To consume the whitelist, the token contracts should call the internal functions from WhitelistInternal.
 * This contract can be used as a facet of a diamond which follows the EIP-2535 diamond standard.
 */
contract MintPassFacet is MintPassInternal, RolesInternal {
    
    /**
     * @return The total claimed amount using the mint pass
     */
    function totalClaimedMintPass() external view returns (uint) {
        return _totalClaimedMintPass();
    }

    /**
     * @return The amount of mint passes redeemed by the account
     */
    function claimedMintPass(address account) external view returns (uint) {
        return _claimedMintPass(account);
    }

    /**
     * @return The amount of mint passes owned by the account that are not redeemed
     */
    function elegibleMintPass(address account) external view returns (uint) {
        return _elegibleMintPass(account);
    }
    
    /**
     * @notice Sets the claim state to active/inactive
     * @dev This function can only be called by an address with the manager role
     */
    function setClaimActiveMintPass(bool active) external onlyManager {
        _setClaimActiveMintPass(active);
    }

    /**
     * @notice Returns true if the mint pass claim is active, or false otherwise
     * @return active bool indicating if claim is active
     */
    function isMintPassClaimActive() view external returns (bool active) {
        return _isMintPassClaimActive();
    }

    /**
     * @notice Sets the ERC721 contract address that holds the mint passes tokens
     */
    function setMintPassContractAddress(address passContractAddress) external onlyManager {
        _setMintPassContractAddress(passContractAddress);
    }

    /**
     * @notice Returns the ERC721 contract address that holds the mint passes tokens
     */
    function mintPassContractAddress() external view returns (address) {
        return _mintPassContractAddress();
    }

    /**
     * @notice Returns true if a token pass was used to mint
     */
    function isTokenClaimed(uint tokenId) external view returns (bool) {
        return _isTokenClaimed(tokenId);
    }
}