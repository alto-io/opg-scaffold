// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.19;

import { SolidStateDiamond } from '@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol';
import { IERC1155 } from '@solidstate/contracts/interfaces/IERC1155.sol';

contract ItemsDiamond is SolidStateDiamond {
    constructor() {
        _setSupportsInterface(type(IERC1155).interfaceId, true);
    }
}