// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { AccessControl } from "@solidstate/contracts/access/access_control/AccessControl.sol";
import { RolesInternal } from './RolesInternal.sol';

contract RolesFacet is RolesInternal, AccessControl {

    function defaultAdminRole() external pure returns (bytes32) {
        return _defaultAdminRole();
    }

    function managerRole() external view returns (bytes32) {
        return _managerRole();
    }

    function minterRole() external view returns (bytes32) {
        return _minterRole();
    }
}