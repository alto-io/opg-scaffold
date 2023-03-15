import {deployDiamond} from "../libraries/deployDiamond.ts"

export const arcadiansDiamondName = 'ArcadiansDiamond';
export const arcadiansDiamondInitName = 'ArcadiansInit';
export const arcadiansFacetNames = [
    'ArcadiansFacet',
    'MerkleFacet',
    'RolesFacet'
]

export const func = async() => {
    await deployDiamond(arcadiansDiamondName, arcadiansDiamondInitName, arcadiansFacetNames);
};

func.tags = ['ArcadiansDiamond'];
export default func;