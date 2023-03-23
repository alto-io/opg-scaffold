// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { AccessControlInternal } from "@solidstate/contracts/access/access_control/AccessControlInternal.sol";
import { AccessControlStorage } from "@solidstate/contracts/access/access_control/AccessControlStorage.sol";
import { RolesStorage } from './RolesStorage.sol';

contract RolesInternal is AccessControlInternal {

    modifier onlyDefaultAdmin() {
        _checkRole(_getDefaultAdminRole());
        _;
    }

    modifier onlyManager() {
        _checkRole(_getManagerRole());
        _;
    }

    modifier onlyMinter() {
        _checkRole(_getMinterRole());
        _;
    }

    function _getDefaultAdminRole() internal pure returns (bytes32) {
        return AccessControlStorage.DEFAULT_ADMIN_ROLE;
    }

    function _getManagerRole() internal view returns (bytes32) {
        return RolesStorage.layout().managerRole;
    }

    function _getMinterRole() internal view returns (bytes32) {
        return RolesStorage.layout().minterRole;
    }

    function _initRoles() internal {
        RolesStorage.Layout storage rolesSL = RolesStorage.layout();
        rolesSL.managerRole = keccak256("manager.role");
        rolesSL.minterRole = keccak256("minter.role");

        _grantRole(_getDefaultAdminRole(), msg.sender);
        _grantRole(_getManagerRole(), msg.sender);
        _grantRole(_getMinterRole(), msg.sender);
    }
}