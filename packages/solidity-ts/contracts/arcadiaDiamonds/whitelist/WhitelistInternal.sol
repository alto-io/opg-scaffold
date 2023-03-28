// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleProof } from "@solidstate/contracts/cryptography/MerkleProof.sol";
import { WhitelistStorage } from "./WhitelistStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";

contract WhitelistInternal is RolesInternal {

    event WhitelistBalanceChanged(address account, int amount, uint totalElegibleAmount, uint totalClaimedAmount);

    function _whitelistClaimed(address account) internal view returns (uint) {
        return WhitelistStorage.layout().claimed[account];
    }

    function _whitelistBalance(address account) internal view returns (uint) {
        return WhitelistStorage.layout().elegible[account];
    }

    function _consumeWhitelist(address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        require(whitelistSL.elegible[account] >= amount, "WhitelistInternal._consumeWhitelist: amount exceeds elegible amount");
        whitelistSL.elegible[account] -= amount;
        whitelistSL.claimed[account] += amount;
        emit WhitelistBalanceChanged(msg.sender, int(amount), whitelistSL.elegible[account], whitelistSL.claimed[account]);
    }

    function _addToWhitelist(address account, uint amount) onlyManager internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        whitelistSL.elegible[account] += amount;
        emit WhitelistBalanceChanged(msg.sender, int(amount), whitelistSL.elegible[account], whitelistSL.claimed[account]);
    }

    function _addToWhitelistBatch(address[] calldata accounts, uint[] calldata amounts) onlyManager internal {
        require(accounts.length == amounts.length, "WhitelistInternal._addToWhitelistBatch: Inputs length mismatch");
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();
        for (uint i = 0; i < accounts.length; i++) {
            WhitelistStorage.layout().elegible[accounts[i]] += amounts[i];
            emit WhitelistBalanceChanged(msg.sender, int(amounts[i]), whitelistSL.elegible[accounts[i]], whitelistSL.claimed[accounts[i]]);
        }
    }
}