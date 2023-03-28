// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { AccessControlInternal } from "@solidstate/contracts/access/access_control/AccessControlInternal.sol";
import { AccessControlStorage } from "@solidstate/contracts/access/access_control/AccessControlStorage.sol";
import { RolesStorage } from './RolesStorage.sol';

contract RolesInternal is AccessControlInternal {

    modifier onlyDefaultAdmin() {
        _checkRole(_defaultAdminRole());
        _;
    }

    modifier onlyManager() {
        _checkRole(_managerRole());
        _;
    }

    modifier onlyMinter() {
        _checkRole(_minterRole());
        _;
    }

    function _defaultAdminRole() internal pure returns (bytes32) {
        return AccessControlStorage.DEFAULT_ADMIN_ROLE;
    }

    function _managerRole() internal view returns (bytes32) {
        return RolesStorage.layout().managerRole;
    }

    function _minterRole() internal view returns (bytes32) {
        return RolesStorage.layout().minterRole;
    }

    function _initRoles() internal {
        RolesStorage.Layout storage rolesSL = RolesStorage.layout();
        rolesSL.managerRole = keccak256("manager.role");
        rolesSL.minterRole = keccak256("minter.role");

        _grantRole(_defaultAdminRole(), msg.sender);
        _grantRole(_managerRole(), msg.sender);
        _grantRole(_minterRole(), msg.sender);
    }
}