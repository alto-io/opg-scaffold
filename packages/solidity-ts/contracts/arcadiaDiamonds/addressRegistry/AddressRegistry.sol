// SPDX-License-Identifier: UNLICENSED

/**
 * Authors: Moonstream DAO (engineering@moonstream.to)
 * GitHub: https://github.com/G7DAO/contracts
 */

pragma solidity ^0.8.0;

import { RolesInternal } from "../roles/RolesInternal.sol";
import { AddressRegistryStorage } from "./AddressRegistryStorage.sol";

contract AddressRegistry is
    RolesInternal
{
    event ArcadiansChanged(address indexed oldArcadians, address indexed newArcadians);
    event ItemsChanged(address indexed oldItems, address indexed newItems);
    event InventoryChanged(address indexed oldInventory, address indexed newInventory);

    function init(
        address _arcadians,
        address _items,
        address _inventory
    ) external onlyManager {
        setArcadians(_arcadians);
        setItems(_items);
        setInventory(_inventory);
    }

    function setArcadians(address _arcadians) public onlyManager {
        AddressRegistryStorage.Layout storage arl = AddressRegistryStorage.layout();
        if (_arcadians != arl.arcadians) {
            emit ArcadiansChanged(arl.arcadians, _arcadians);
            arl.arcadians = _arcadians;
        }
    }

    function setItems(address _items) public onlyManager {
        AddressRegistryStorage.Layout storage arl = AddressRegistryStorage.layout();
        if (_items != arl.items) {
            emit ItemsChanged(arl.items, _items);
            arl.items = _items;
        }
    }

    function setInventory(address _inventory) public onlyManager {
        AddressRegistryStorage.Layout storage arl = AddressRegistryStorage.layout();
        if (_inventory != arl.inventory) {
            emit InventoryChanged(arl.inventory, _inventory);
            arl.inventory = _inventory;
        }
    }

    function arcadians() external view returns (address) {
        return AddressRegistryStorage.layout().arcadians;
    }

    function items() external view returns (address) {
        return AddressRegistryStorage.layout().items;
    }

    function inventory() external view returns (address) {
        return AddressRegistryStorage.layout().inventory;
    }

}