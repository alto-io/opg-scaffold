/* global ethers */
/* eslint prefer-const: "off" */
import hre from 'hardhat';

import { arcadiansDiamondName, arcadiansDiamondInitName, arcadiansFacetNames } from '../hardhat-deploy/01.ArcadiansDiamond.deploy';
import { ensureUniqueFunctions, getFacetCut, getRemoveCut } from 'deploy/libraries/deployDiamond';

// Diamond init params
export const baseArcadianURI = "https://arcadians.sandbox.outplay.games/v2/arcadians/";
export const maxMintPerUser = 3;
export const mintPrice = 2;

export const func = async() => {
    const diamond = await hre.ethers.getContract(arcadiansDiamondName);
    const diamondInit = await hre.ethers.getContract(arcadiansDiamondInitName);

    const newDeployedFacets = [];
    for (const FacetName of Object.values(arcadiansFacetNames)) {
        const facet = await hre.ethers.getContract(FacetName);
        newDeployedFacets.push(facet);
    }

    ensureUniqueFunctions(newDeployedFacets, diamond);
    // ensureUniqueEvents(newDeployedFacets, diamond, []);

    const cut = []
    for (const facet of newDeployedFacets) {
        const facetCut = await getFacetCut(facet, diamond);
        cut.push(...facetCut);
    }

    const removeCut = await getRemoveCut(newDeployedFacets, diamond);
    cut.push(...removeCut);

    // upgrade diamond with facets
    console.log('Arcadians Diamond Cut: ', cut)

    // Intialize contract storage
    let functionCall = diamondInit.interface.encodeFunctionData('init', [baseArcadianURI, maxMintPerUser, mintPrice])
    let tx = await diamond.diamondCut(cut, diamondInit.address, functionCall)
    let receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    console.log("Diamond cut address: ", diamond.address);
};

func.tags = ['ArcadiansInit'];
export default func;