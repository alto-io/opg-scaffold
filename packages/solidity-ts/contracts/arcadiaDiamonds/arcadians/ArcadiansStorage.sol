// SPDX-License-Identifier: GPL-2.0
pragma solidity 0.8.19;

library ArcadiansStorage {

    bytes32 constant ARCADIANS_STORAGE_POSITION =
        keccak256("equippable.storage.position");

    struct Layout {
        uint maxMintPerUser;
        uint mintPrice;
        bool isPublicMintOpen;
        // account => amount minted with public mint
        mapping(address => uint) userPublicMints;
        uint arcadiansMaxSupply;
    }

    function layout()
        internal
        pure
        returns (Layout storage es)
    {
        bytes32 position = ARCADIANS_STORAGE_POSITION;
        assembly {
            es.slot := position
        }
    }
}