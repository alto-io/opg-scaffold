import {deployDiamond} from "../libraries/deployDiamond.ts"

export const arcadiansDiamondName = 'ArcadiansDiamond';
export const arcadiansDiamondInitName = 'ArcadiansInit';
export const arcadiansFacetNames = {
    arcadiansFacet: 'ArcadiansFacet',
    merkleFacet: 'MerkleFacet',
    rolesFacet: 'RolesFacet',
    whitelistFacet: 'WhitelistFacet'
}

export const func = async() => {
    await deployDiamond(arcadiansDiamondName, arcadiansDiamondInitName, Object.values(arcadiansFacetNames));
};

func.tags = ['ArcadiansDiamond'];
export default func;