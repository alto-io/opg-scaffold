// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import { SolidStateDiamond } from '@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol';
import { IERC1155 } from '@solidstate/contracts/interfaces/IERC1155.sol';

contract ArcadianDiamond is SolidStateDiamond {
    constructor() {
        _setSupportsInterface(type(IERC1155).interfaceId, true);
    }
}