// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { RolesStorage } from './RolesStorage.sol';
import { RolesInternal } from './RolesInternal.sol';
import { AccessControl } from "@solidstate/contracts/access/access_control/AccessControl.sol";

contract RolesFacet is RolesInternal, AccessControl {

    function getDefaultAdminRole() external pure returns (bytes32) {
        return _getDefaultAdminRole();
    }

    function getManagerRole() external view returns (bytes32) {
        return _getManagerRole();
    }

    function getMinterRole() external view returns (bytes32) {
        return _getMinterRole();
    }
}