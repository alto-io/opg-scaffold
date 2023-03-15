pragma solidity ^0.8.0;

import { RolesInternal } from "../roles/RolesInternal.sol";
import {ReentrancyGuard} from "@solidstate/contracts/utils/ReentrancyGuard.sol";

library AddressRegistryStorage {
    bytes32 constant STORAGE_POSITION =
        keccak256("address.registry.storage.position");

    struct Layout {
        address arcadians;
        address items;
        address inventory;
    }

    function layout()
        internal
        pure
        returns (Layout storage istore)
    {
        bytes32 position = STORAGE_POSITION;
        assembly {
            istore.slot := position
        }
    }
}