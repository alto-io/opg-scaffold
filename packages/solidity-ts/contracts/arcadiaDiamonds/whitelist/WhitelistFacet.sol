// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { WhitelistInternal } from './WhitelistInternal.sol';

contract WhitelistFacet is WhitelistInternal {

    function whitelistClaimed(address account) external view returns (uint) {
        return _whitelistClaimed(account);
    }

    function whitelistBalance(address account) external view returns (uint) {
        return _whitelistBalance(account);
    }

    function addToWhitelist(address account, uint amount) external {
        _addToWhitelist(account, amount);
    }

    function addToWhitelistBatch(address[] calldata accounts, uint[] calldata amounts) external {
        _addToWhitelistBatch(accounts, amounts);
    }
}