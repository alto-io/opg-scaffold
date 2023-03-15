import {deployDiamond} from "../libraries/deployDiamond.ts"

export const itemsDiamondName = 'ItemsDiamond';
export const itemsDiamondInitName = 'ItemsInit';
export const itemsFacetNames = [
    'ItemsFacet',
    'MerkleFacet',
    'RolesFacet',
    'InventoryFacet'
]

export const func = async() => {
    await deployDiamond(itemsDiamondName, itemsDiamondInitName, itemsFacetNames);
};

func.tags = ['ItemsDiamond'];
export default func;