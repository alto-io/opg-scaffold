/* global ethers */
/* eslint prefer-const: "off" */
import hre, { ethers } from 'hardhat';
import fs from "fs";
import { MERKLE_TREE_PATH } from '~helpers/merkle-tree/merkleGenerator';

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

export const func = async() => {
    const { getNamedAccounts, deployments } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const diamondName = 'ArcadiansDiamond';
    const diamondInitName = 'ArcadiansInit';
    const FacetNames = [
        'ArcadiansFacet',
        'MerkleFacet',
        'RolesFacet'
    ]

    await deploy(diamondName, { from: deployer, log: true });
    await deploy(diamondInitName, { from: deployer, log: true });

    // deploy facets
    console.log('Deploying facets: ', FacetNames)

    const diamond = await hre.ethers.getContract("ArcadiansDiamond");

    const newDeployedFacets = [];
    for (const FacetName of FacetNames) {
        await deploy(FacetName, { from: deployer, log: true });

        const facet = await hre.ethers.getContract(FacetName);
        newDeployedFacets.push(facet);
        console.log(`${FacetName} deployed: ${facet.address}`)
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
    console.log('Diamond Cut:', cut)

    const arcadiansInit = await hre.ethers.getContract("ArcadiansInit");

    // Get merkle root previously generated
    const merkleTree = JSON.parse(fs.readFileSync(MERKLE_TREE_PATH).toString());
    const merkleRoot = merkleTree.root

    // Intialize our contract storage
    const baseTokenUri = "https://api.arcadians.io/";
    const maxMintPerUser = 1;
    const priceMint = 10;
    let functionCall = arcadiansInit.interface.encodeFunctionData('init', [merkleRoot.toString(), baseTokenUri, maxMintPerUser, priceMint]);
    let tx = await diamond.diamondCut(cut, arcadiansInit.address, functionCall);
    let receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    console.log("Diamond cut address: ", diamond.address);
};

export function ensureUniqueEvents(newDeployedFacets, diamond) {
    const eventsToIgnore = [];
    const allEvents = [];
    for (const newDeployedFacet of newDeployedFacets) {
        allEvents.push(...Object.keys(newDeployedFacet.interface.events))
    }
    allEvents.push(...Object.keys(diamond.interface.events))
    let duplicatedEvents = allEvents.filter((event, i) => allEvents.indexOf(event) != i)
    duplicatedEvents = duplicatedEvents.filter((event) => !eventsToIgnore.includes(event));
    if (duplicatedEvents.length > 0) {
        throw new Error("Error: Diamond facets have duplicated events signatures: " + duplicatedEvents)
    }
}

export function ensureUniqueFunctions(newDeployedFacets, diamond) {
    const allFunctions = [];
    for (const newDeployedFacet of newDeployedFacets) {
        allFunctions.push(...Object.keys(newDeployedFacet.interface.functions))
    }
    allFunctions.push(...Object.keys(diamond.interface.functions))
    const functionsToIgnore = ['init(bytes)', 'supportsInterface(bytes4)'];
    let duplicatedFunctions = allFunctions.filter((event, i) => allFunctions.indexOf(event) != i)
    duplicatedFunctions = duplicatedFunctions.filter((event) => !functionsToIgnore.includes(event));
    if (duplicatedFunctions.length > 0) {
        throw new Error("Error: Diamond facets have duplicated function signatures: " + duplicatedFunctions)
    }
}

// get facet cut from a facet
export async function getFacetCut(facet, diamond) {
    const deployedFacets = await diamond.facets();
    const selectorsToAdd = [];
    const selectorsToReplace = [];
    const signatures = Object.keys(facet.interface.functions)
    const functionsToIgnore = ['init(bytes)', 'supportsInterface(bytes4)'];
    
    signatures.map((val) => {
        if (!functionsToIgnore.includes(val)) {
            const functionHash = facet.interface.getSighash(val)
            const selectorMatch = deployedFacets.find((deployedFacet) => deployedFacet.selectors.includes(functionHash))
            if (!selectorMatch) {
                console.log(`Add diamond with selector: ${val} with address ${facet.address}`);
                selectorsToAdd.push(functionHash)
            } else if (selectorMatch.target != facet.address) {
                console.log(`Update diamond with selector: ${val} from address ${selectorMatch.target} to address ${facet.address}`);
                selectorsToReplace.push(functionHash)
            } else {
                console.log(`Diamond already contains address ${facet.address} with selector: ${val}`);
            }
        } else {
            console.log(`function ignored: ${val}`);
        }
    })

    const facetCut = [];
    if (selectorsToAdd.length > 0) {
        facetCut.push({
            target: facet.address,
            action: FacetCutAction.Add,
            selectors: selectorsToAdd
        })
    }
    if (selectorsToReplace.length > 0) {
        facetCut.push({
            target: facet.address,
            action: FacetCutAction.Replace,
            selectors: selectorsToReplace
        })
    }
    return facetCut
}

export async function getRemoveCut(newDeployedFacets, diamond) {
    const cutsToDeploy = [];
    for (const newDeployedFacet of newDeployedFacets) {
        cutsToDeploy.push({
            target: newDeployedFacet.address,
            selectors: Object.keys(newDeployedFacet.interface.functions).map((func) => newDeployedFacet.interface.getSighash(func))
        })
    }

    const facetsSelectorsHashed = cutsToDeploy.reduce((acc, val) => {
        acc.push(...val.selectors)
        return acc;
    }, [])

    const diamondDefaultSelectors = Object.keys(diamond.interface.functions).map((func) => diamond.interface.getSighash(func))

    let deployedFacets = await diamond.facets()
    const cut = [];
    for (const deployedFacet of deployedFacets) {
        const selectorsToRemove = [];
        for (const selector of deployedFacet.selectors) {
            if (!facetsSelectorsHashed.includes(selector) && !diamondDefaultSelectors.includes(selector)) {
                console.log(`Remove selector ${selector} from diamond`);
                selectorsToRemove.push(selector)
            }
        }
        if (selectorsToRemove.length > 0) {
            cut.push({
                target: ethers.constants.AddressZero,
                action: FacetCutAction.Remove,
                selectors: selectorsToRemove
            })
        }
    }
    return cut;
}

func.tags = ['DiamondCutFacet'];
export default func;