// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import { SolidStateDiamond } from '@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol';
import { IERC721 } from '@solidstate/contracts/interfaces/IERC721.sol';

contract ArcadiansDiamond is SolidStateDiamond {
    constructor() {
        _setSupportsInterface(type(IERC721).interfaceId, true);
    }
}