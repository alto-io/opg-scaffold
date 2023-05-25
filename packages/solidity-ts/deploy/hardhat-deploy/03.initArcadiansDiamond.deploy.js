/* global ethers */
/* eslint prefer-const: "off" */
import hre from 'hardhat';

import { arcadiansDiamondName, arcadiansDiamondInitName, arcadiansFacetNames } from '../hardhat-deploy/01.ArcadiansDiamond.deploy';
import { ensureUniqueFunctions, getFacetCut, getRemoveCut } from 'deploy/libraries/deployDiamond';

// Diamond init params
export const baseArcadianURI = "https://arcadians.dev.outplay.games/v2/arcadians/";
export const maxMintPerUser = 2;
export const mintPrice = 0;

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
    const maxSupplies = {
        arcadiansMaxSupply: 6666,
        maxMintPassSupply: 1000,
        maxGuaranteedWLSupply: 3000,
        maxRestrictedWLSupply: 2000,
        publicMintMaxSupply: 666
    }
    const mintPassContractAddress = "0x9bfE56f968a3466D8ef35D7A011E373a7475FEF5";
    let functionCall = diamondInit.interface.encodeFunctionData('init', 
        [
            baseArcadianURI, 
            maxMintPerUser, 
            mintPrice,
            mintPassContractAddress,
            maxSupplies.arcadiansMaxSupply,
            maxSupplies.maxMintPassSupply,
            maxSupplies.maxGuaranteedWLSupply,
            maxSupplies.maxRestrictedWLSupply,
            maxSupplies.publicMintMaxSupply,
        ])
    let tx = await diamond.diamondCut(cut, diamondInit.address, functionCall)
    let receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    console.log("Diamond cut address: ", diamond.address);
};

func.tags = ['ArcadiansInit'];
export default func;