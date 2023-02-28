/* global ethers */
/* eslint prefer-const: "off" */
import hre from 'hardhat';
import fs from "fs";
import path from "path";
import { MERKLE_TREE_PATH } from '~helpers/merkle-tree/merkleGenerator';

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

export const func = async () => {
    const { getNamedAccounts, deployments } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('ArcadianDiamond', { from: deployer, log: true });
    await deploy('ArcadiansInit', { from: deployer, log: true });

    // deploy facets
    const FacetNames = [
        'EquippableFacet',
        'MerkleFacet'
    ]
    console.log('Deploying facets: ', FacetNames)

    // TODO
    // check for Events names clash (to avoid listeners malfunction, since they listen the same address)
    const cut = []
    for (const FacetName of FacetNames) {
        await deploy(FacetName, { from: deployer, log: true });

        const facet = await hre.ethers.getContract(FacetName);
        console.log(`${FacetName} deployed: ${facet.address}`)
        
        cut.push({
            target: facet.address,
            action: FacetCutAction.Add,
            selectors: getSelectors(facet)
        })
    }

    // upgrade diamond with facets
    console.log('Diamond Cut:', cut)

    const diamond = await hre.ethers.getContract("ArcadianDiamond");
    const arcadiansInit = await hre.ethers.getContract("ArcadiansInit");

    // Get merkle root previously generated
    const merkleTree = JSON.parse(fs.readFileSync(MERKLE_TREE_PATH).toString());
    const merkleRoot = merkleTree.root
    
    // Intialize our contract storage
    let functionCall = arcadiansInit.interface.encodeFunctionData('init', [merkleRoot.toString()])
    let tx = await diamond.diamondCut(cut, arcadiansInit.address, functionCall)
    let receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    console.log("Diamond cut address: ", diamond.address);
};

// get function selectors from ABI
function getSelectors(contract) {
    const signatures = Object.keys(contract.interface.functions)
    const selectors = signatures.reduce((acc, val) => {
        if (val !== 'init(bytes)' && val !== 'supportsInterface(bytes4)') {
        acc.push(contract.interface.getSighash(val))
        }
        return acc
    }, [])
    return selectors
}

func.tags = ['DiamondCutFacet'];
export default func;