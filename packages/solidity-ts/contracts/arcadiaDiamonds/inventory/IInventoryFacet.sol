// SPDX-License-Identifier: UNLICENSED

/**
 * Inspired in the following work:
 * Authors: Moonstream DAO (engineering@moonstream.to)
 * GitHub: https://github.com/G7DAO/contracts
 */

/**
 * @title InventoryFacet
 * @dev This contract is responsible for managing the inventory system for the Arcadians using slots. 
 * It defines the functionality to equip and unequip items to Arcadians, check if a combination of items 
 * are unique, and retrieve the inventory slots and allowed items for a slot. 
 * This contract also implements ERC1155Holder to handle ERC1155 token transfers
 * This contract can be used as a facet of a diamond which follows the EIP-2535 diamond standard.
 * It also uses the ReentrancyGuard and Multicall contracts for security and gas efficiency.
 */
interface IInventoryFacet {

    // Helper struct only used in view functions
    struct ItemInSlot {
        uint slotId;
        address contractAddress;
        uint itemId;
    }

    // Holds the information needed to identify an ERC1155 item
    struct Item {
        address contractAddress;
        uint id;
    }

    // Holds the general information about a slot
    enum SlotCategory { Base, Equippment, Cosmetic }
    struct Slot {
        uint id;
        bool permanent;
        SlotCategory category;
        Item[] allowedItems;
    }

    /**
     * @notice Returns the number of inventory slots
     * @dev Slots are 1-indexed
     * @return The number of inventory slots 
     */
    function numSlots() external view returns (uint);

    /**
     * @notice Returns the details of an inventory slot given its ID
     * @dev Slots are 1-indexed
     * @param slotId The ID of the inventory slot
     * @return existentSlot The details of the inventory slot
     */
    function slot(uint slotId) external view returns (Slot memory existentSlot);

    /**
     * @notice Returns the details of all the existent slots
     * @dev Slots are 1-indexed
     * @return existentSlots The details of all the inventory slots
     */
    function slotsAll() external view returns (Slot[] memory existentSlots);

    /**
     * @notice Creates a new inventory slot
     * @dev This function is only accessible to the manager role
     * @dev Slots are 1-indexed
     * @param permanent Whether or not the slot can be unequipped once equipped
     * @param category The category of the slot
     * @param items The list of items to allow in the slot
     */
    function createSlot(
        bool permanent,
        SlotCategory category,
        Item[] calldata items
    ) external;

    /**
     * @notice Adds items to the list of allowed items for an inventory slot
     * @param slotId The slot id
     * @param items The list of items to allow in the slot
     */
    function allowItemsInSlot(
        uint slotId,
        Item[] calldata items
    ) external;
    
    /**
     * @notice Removes items from the list of allowed items
     * @param slotId The ID of the inventory slot
     * @param items The list of items to disallow in the slot
     */
    function disallowItemsInSlot(
        uint slotId,
        Item[] calldata items
    ) external;

    /**
     * @notice Returns the allowed slot for a given item
     * @param item The item to check
     * @return The allowed slot id for the item. Slots are 1-indexed.
     */
    function allowedSlot(Item calldata item) external view returns (uint);

    /**
     * @notice Returns an array of all the items that are allowed for a given slot
     * @param slotId The slot id to check
     * @return A list of all the items that are allowed in the slot
     */
    function allowedItems(uint slotId) external view returns (Item[] memory);

    /**
     * @notice Equips a single item to a given slot for a specified Arcadian NFT
     * @param arcadianId The ID of the Arcadian NFT to equip the item for
     * @param item The item to equip in the slot
     */
    function equip(
        uint arcadianId,
        Item calldata item
    ) external;

    /**
     * @notice Equips multiple items in a specified Arcadian NFT
     * @param arcadianId The ID of the Arcadian NFT to equip the items for
     * @param items An array of items to equip in the corresponding slots
     */
    function equipBatch(
        uint arcadianId,
        Item[] calldata items
    ) external;

    /**
     * @notice Unequips the item equipped in a given slot for a specified Arcadian NFT
     * @param arcadianId The ID of the Arcadian NFT to equip the item for
     * @param slotId The slot id in which the item will be unequipped
     */
    function unequip(
        uint arcadianId,
        uint slotId
    ) external;

    /**
     * @notice Unequips the items equipped in multiple slots for a specified Arcadian NFT
     * @param arcadianId The ID of the Arcadian NFT to equip the item for
     * @param slotIds The slots ids in which the items will be unequipped
     */
    function unequipBatch(
        uint arcadianId,
        uint[] calldata slotIds
    ) external;

    /**
     * @notice Retrieves the equipped item in a slot for a specified Arcadian NFT
     * @param arcadianId The ID of the Arcadian NFT to query
     * @param slotId The slot id to query
     */
    function equipped(
        uint arcadianId,
        uint slotId
    ) external view returns (ItemInSlot memory item);

    /**
     * @notice Retrieves all the equipped items for a specified Arcadian NFT
     * @param arcadianId The ID of the Arcadian NFT to query
     */
    function equippedAll(
        uint arcadianId
    ) external view returns (ItemInSlot[] memory equippedSlot);

    /**
     * @notice Indicates if a list of items applied to an the arcadian is unique
     * @dev The uniqueness is calculated using the existent arcadian items and the input items as well
     * @dev Only items equipped in 'base' category slots are considered for uniqueness
     * @param arcadianId The ID of the Arcadian NFT to query
     * @param slotsIds An array of slot ids
     * @param items An array of items to check for uniqueness after "equipped" over the existent arcadian items.
     */
    function isArcadianUnique(
        uint arcadianId,
        uint[] calldata slotsIds,
        Item[] calldata items
    ) external view returns (bool);
}