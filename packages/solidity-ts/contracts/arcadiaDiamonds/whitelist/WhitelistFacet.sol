// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { WhitelistInternal } from './WhitelistInternal.sol';

contract WhitelistFacet is WhitelistInternal {

    function getWhitelistClaimed(address account) external view returns (uint) {
        return _getWhitelistClaimed(account);
    }

    function getWhitelistBalance(address account) external view returns (uint) {
        return _getWhitelistBalance(account);
    }

    function addToWhitelist(address account, uint amount) external {
        _addToWhitelist(account, amount);
    }

    function addToWhitelistBatch(address[] calldata accounts, uint[] calldata amounts) external {
        _addToWhitelistBatch(accounts, amounts);
    }
}