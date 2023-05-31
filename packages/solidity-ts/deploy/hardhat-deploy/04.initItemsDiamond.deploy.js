/* global ethers */
/* eslint prefer-const: "off" */
import hre from 'hardhat';
import fs from "fs";

import { ensureUniqueFunctions, getFacetCut, getRemoveCut } from 'deploy/libraries/deployDiamond';
import { itemsDiamondInitName, itemsDiamondName, itemsFacetNames } from './02.ItemsDiamond.deploy';
import { arcadiansDiamondName } from './01.ArcadiansDiamond.deploy';

// Diamond init params
// export const merkleRoot = "0x4cc201573e110f41c0ab8a8a57a12e631393ab9e43b551868d1e9e95b37b5d0f";
export const baseItemURI = process.env.BASE_TOKEN_URI || "";

export const func = async() => {

    const diamond = await hre.ethers.getContract(itemsDiamondName);
    const diamondInit = await hre.ethers.getContract(itemsDiamondInitName);

    const arcadiansDiamond = await hre.ethers.getContract(arcadiansDiamondName);

    const newDeployedFacets = [];
    for (const facetName of Object.values(itemsFacetNames)) {
        const facet = await hre.ethers.getContract(facetName);
        newDeployedFacets.push(facet);
    }

    ensureUniqueFunctions(newDeployedFacets, diamond);
    // TODO: role functions are duplicated
    // ensureUniqueEvents(newDeployedFacets, diamond, []);

    const cut = []
    for (const facet of newDeployedFacets) {
        const facetCut = await getFacetCut(facet, diamond);
        cut.push(...facetCut);
    }

    const removeCut = await getRemoveCut(newDeployedFacets, diamond);
    cut.push(...removeCut);

    // upgrade diamond with facets
    console.log('Items Diamond Cut: ', cut)

    const inventoryAddress = arcadiansDiamond.address;
    // Intialize contract storage
    let functionCall = diamondInit.interface.encodeFunctionData('init', [baseItemURI, inventoryAddress])
    let tx = await diamond.diamondCut(cut, diamondInit.address, functionCall)
    let receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`Items Diamond upgrade failed: ${tx.hash}`)
    }
    console.log("Items Diamond cut address: ", diamond.address);
};

func.tags = ['ItemsInit'];
export default func;