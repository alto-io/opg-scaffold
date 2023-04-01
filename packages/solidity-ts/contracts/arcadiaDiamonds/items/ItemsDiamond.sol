// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.19;

import { SolidStateDiamond } from '@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol';

/**
 * @title ItemsDiamond
 * @notice This contract is a Diamond contract that extends the SolidStateDiamond to implement the EIP-2535 interface, 
 * which allows it to act as a proxy for a collection of other contracts.
 * This contract specifically supports the ERC-1155 standard, which is used to store and manage the Arcadians Items.
 */
contract ItemsDiamond is SolidStateDiamond {}