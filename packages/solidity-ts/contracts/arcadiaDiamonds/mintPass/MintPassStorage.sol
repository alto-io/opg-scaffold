// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

library MintPassStorage {

    bytes32 constant MINT_PASS_STORAGE_POSITION =
        keccak256("mintPass.storage.position");
    
    struct Layout {
        mapping(uint => bool) isTokenClaimed;
        mapping(address => uint) claimedAmount;
        uint totalClaimed;
        uint maxSupply;
        bool claimActive;
        address passContractAddress;
    }

    function layout()
        internal
        pure
        returns (Layout storage es)
    {
        bytes32 position = MINT_PASS_STORAGE_POSITION;
        assembly {
            es.slot := position
        }
    }
}