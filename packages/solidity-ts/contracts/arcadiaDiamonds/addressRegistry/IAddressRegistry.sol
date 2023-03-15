// SPDX-License-Identifier: UNLICENSED

/**
 * Authors: Moonstream DAO (engineering@moonstream.to)
 * GitHub: https://github.com/G7DAO/contracts
 */

pragma solidity ^0.8.0;

interface IAddressRegistry
{
    event ArcadiansChanged(address indexed oldArcadians, address indexed newArcadians);
    event ItemsChanged(address indexed oldItems, address indexed newItems);
    event InventoryChanged(address indexed oldInventory, address indexed newInventory);

    function init(
        address _arcadians,
        address _items,
        address _inventory
    ) external;

    function setArcadians(address _arcadians) external;

    function setItems(address _items) external;

    function setInventory(address _inventory) external;

    function arcadians() external view returns (address);

    function items() external view;

    function inventory() external view;
}