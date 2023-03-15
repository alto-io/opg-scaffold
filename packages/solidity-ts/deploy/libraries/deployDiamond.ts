/* global ethers */
/* eslint prefer-const: "off" */
import { ethers } from 'ethers';
import hre from 'hardhat';
import { DeployResult } from 'hardhat-deploy/types';

export const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

export const deployDiamond = async(diamondName: string, diamondInitName: string, facetNames: string[]): Promise<DeployResult> => {
    const { getNamedAccounts, deployments } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const diamondDeployment = await deploy(diamondName, { from: deployer, log: true });
    console.log(`${diamondName} address: `, diamondDeployment.address);
    const diamondInitDeployment = await deploy(diamondInitName, { from: deployer, log: true });
    console.log(`${diamondInitName} address: `, diamondInitDeployment.address);

    for (const FacetName of facetNames) {
        const deployment = await deploy(FacetName, { from: deployer, log: true });
        console.log(`${FacetName} deployed: ${deployment.address}`)
    }
    return diamondDeployment;
}

export function ensureUniqueEvents(newDeployedFacets: ethers.Contract[], diamond: ethers.Contract, eventsToIgnore: string[]) {
    const allEvents: string[] = [];
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

export function ensureUniqueFunctions(newDeployedFacets: ethers.Contract[], diamond: ethers.Contract) {
    const allFunctions: string[] = [];
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
export async function getFacetCut(facet: ethers.Contract, diamond: ethers.Contract) {
    const deployedFacets: any[] = await diamond.facets();
    const selectorsToAdd: string[] = [];
    const selectorsToReplace: string[] = [];
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

export async function getRemoveCut(newDeployedFacets: ethers.Contract[], diamond: ethers.Contract) {
    const cutsToDeploy: any[] = [];
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