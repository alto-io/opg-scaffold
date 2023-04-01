// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { MerkleProof } from "@solidstate/contracts/cryptography/MerkleProof.sol";
import { WhitelistStorage } from "./WhitelistStorage.sol";
import { RolesInternal } from "./../roles/RolesInternal.sol";

contract WhitelistInternal is RolesInternal {

    error Whitelist_ExceedsElegibleAmount();
    error Whitelist_InputDataMismatch();

    event WhitelistBalanceChanged(address account, int amount, uint totalElegibleAmount, uint totalClaimedAmount);

    function _whitelistClaimed(address account) internal view returns (uint) {
        return WhitelistStorage.layout().claimed[account];
    }

    function _whitelistBalance(address account) internal view returns (uint) {
        return WhitelistStorage.layout().elegible[account];
    }

    function _consumeWhitelist(address account, uint amount) internal {
        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        if (whitelistSL.elegible[account] < amount) 
            revert Whitelist_ExceedsElegibleAmount();

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
        if (accounts.length != amounts.length) revert Whitelist_InputDataMismatch();

        WhitelistStorage.Layout storage whitelistSL = WhitelistStorage.layout();

        for (uint i = 0; i < accounts.length; i++) {
            whitelistSL.elegible[accounts[i]] += amounts[i];
            emit WhitelistBalanceChanged(msg.sender, int(amounts[i]), whitelistSL.elegible[accounts[i]], whitelistSL.claimed[accounts[i]]);
        }
    }
}