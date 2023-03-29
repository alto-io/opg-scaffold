// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.19;

import { SolidStateDiamond } from '@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol';
import { IERC721 } from '@solidstate/contracts/interfaces/IERC721.sol';

/**
 * @title ArcadiansDiamond
 * @notice This contract is a Diamond contract that extends the SolidStateDiamond to implement the EIP-2535 interface, 
 * which allows it to act as a proxy for a collection of other contracts.
 * This contract specifically supports the ERC-721 standard, which is used to store and manage the Arcadians NFTs.
 */
contract ArcadiansDiamond is SolidStateDiamond {
    constructor() {
        _setSupportsInterface(type(IERC721).interfaceId, true);
    }
}