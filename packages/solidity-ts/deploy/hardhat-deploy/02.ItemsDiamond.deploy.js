import {deployDiamond} from "../libraries/deployDiamond.ts"

export const itemsDiamondName = 'ItemsDiamond';
export const itemsDiamondInitName = 'ItemsInit';
export const itemsFacetNames = {
    itemsFacet: 'ItemsFacet',
    merkleFacet: 'MerkleFacet',
    rolesFacet: 'RolesFacet',
    inventoryFacet: 'InventoryFacet',
    whitelistFacet: 'WhitelistFacet'
}

export const func = async() => {
    await deployDiamond(itemsDiamondName, itemsDiamondInitName, Object.values(itemsFacetNames));
};

func.tags = ['ItemsDiamond'];
export default func;