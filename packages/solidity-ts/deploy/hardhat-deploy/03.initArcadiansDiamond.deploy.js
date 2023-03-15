/* global ethers */
/* eslint prefer-const: "off" */
import hre from 'hardhat';
import fs from "fs";
import { MERKLE_TREE_PATH } from '~helpers/merkle-tree/merkleGenerator';

import { arcadiansDiamondName, arcadiansDiamondInitName, arcadiansFacetNames } from '../hardhat-deploy/01.ArcadiansDiamond.deploy'
import { ensureUniqueFunctions, getFacetCut, getRemoveCut } from 'deploy/libraries/deployDiamond';
import { itemsDiamondName } from './02.ItemsDiamond.deploy';

// Get merkle root previously generated
const merkleTree = JSON.parse(fs.readFileSync(MERKLE_TREE_PATH).toString());

// Diamond init params
const merkleRootDefault = merkleTree.root.toString();
const baseTokenURIDefault = "https://api.arcadians.io/";
const maxMintPerUserDefault = 3;
const mintPriceDefault = 2;

export const func = async(baseTokenUri = baseTokenURIDefault, maxMintPerUser = maxMintPerUserDefault, mintPrice = mintPriceDefault, merkleRoot = merkleRootDefault) => {

    const diamond = await hre.ethers.getContract(arcadiansDiamondName);
    
    const diamondInit = await hre.ethers.getContract(arcadiansDiamondInitName);

    const newDeployedFacets = [];
    for (const FacetName of arcadiansFacetNames) {
        const facet = await hre.ethers.getContract(FacetName);
        newDeployedFacets.push(facet);
    }

    ensureUniqueFunctions(newDeployedFacets, diamond);
    // ensureUniqueEvents(newDeployedFacets, diamond);

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
    const itemsDiamond = await hre.ethers.getContract(itemsDiamondName);
    let functionCall = diamondInit.interface.encodeFunctionData('init', [itemsDiamond.address, merkleRoot, baseTokenUri, maxMintPerUser, mintPrice])
    let tx = await diamond.diamondCut(cut, diamondInit.address, functionCall)
    let receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    console.log("Diamond cut address: ", diamond.address);
};

func.tags = ['ArcadiansInit'];
export default func;