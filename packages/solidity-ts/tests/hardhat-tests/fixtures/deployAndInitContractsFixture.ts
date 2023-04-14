import '~helpers/hardhat-imports';
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import hre from 'hardhat';
import MerkleGenerator, { MerklePaths } from '~helpers/merkle-tree/merkleGenerator';
import path from "path";
import fs from "fs";
import deployArcadiansDiamond, { arcadiansDiamondInitName, arcadiansDiamondName, arcadiansFacetNames } from '../../../deploy/hardhat-deploy/01.ArcadiansDiamond.deploy';
import deployItemsDiamond, { itemsDiamondName, itemsDiamondInitName, itemsFacetNames } from '../../../deploy/hardhat-deploy/02.ItemsDiamond.deploy';
import initArcadiansDiamond, { baseArcadianURI } from '../../../deploy/hardhat-deploy/03.initArcadiansDiamond.deploy';
import initItemsDiamond, { baseItemURI } from '../../../deploy/hardhat-deploy/04.initItemsDiamond.deploy';

export default async function deployAndInitContractsFixture() {
    const deploymentHardhatPath = path.join(__dirname, '../../../generated/hardhat/deployments/hardhat');
    if (fs.existsSync(deploymentHardhatPath)) {
        fs.rmdirSync(deploymentHardhatPath, { recursive: true })
    }
    const deploymentLocalhostPath = path.join(__dirname, '../../../generated/hardhat/deployments/localhost');
    if (fs.existsSync(deploymentLocalhostPath)) {
        fs.rmdirSync(deploymentLocalhostPath, { recursive: true })
    }

    await deployArcadiansDiamond();
    await deployItemsDiamond();
    await initArcadiansDiamond();
    await initItemsDiamond();

    const namedAccounts = await hre.ethers.getNamedSigners();
    const namedAddresses = {
        deployer: (await namedAccounts.deployer.getAddress()),
        alice: (await namedAccounts.alice.getAddress()),
        bob: (await namedAccounts.bob.getAddress()),
    }

    const arcadiansDiamond = await hre.ethers.getContract(arcadiansDiamondName);
    const arcadiansContracts = {
        diamond: arcadiansDiamond,
        init: await hre.ethers.getContract(arcadiansDiamondInitName),
        arcadiansFacet: await hre.ethers.getContractAt(arcadiansFacetNames.arcadiansFacet, arcadiansDiamond.address),
        merkleFacet: await hre.ethers.getContractAt(arcadiansFacetNames.merkleFacet, arcadiansDiamond.address),
        rolesFacet: await hre.ethers.getContractAt(arcadiansFacetNames.rolesFacet, arcadiansDiamond.address),
        whitelistFacet: await hre.ethers.getContractAt(arcadiansFacetNames.whitelistFacet, arcadiansDiamond.address),
        inventoryFacet: await hre.ethers.getContractAt(arcadiansFacetNames.inventoryFacet, arcadiansDiamond.address),
    };

    const itemsDiamond = await hre.ethers.getContract(itemsDiamondName);
    const itemsContracts = {
        diamond: itemsDiamond,
        init: await hre.ethers.getContract(itemsDiamondInitName),
        itemsFacet: await hre.ethers.getContractAt(itemsFacetNames.itemsFacet, itemsDiamond.address),
        merkleFacet: await hre.ethers.getContractAt(itemsFacetNames.merkleFacet, itemsDiamond.address),
        rolesFacet: await hre.ethers.getContractAt(itemsFacetNames.rolesFacet, itemsDiamond.address),
        whitelistFacet: await hre.ethers.getContractAt(itemsFacetNames.whitelistFacet, itemsDiamond.address),
    };

    let arcadiansMerklePaths: MerklePaths = {
        inputTokens: path.join(__dirname, "../../mocks/ownedArcadiansMock.json"),
        outputMerkleTree: path.join(__dirname, "../../mocks/ownedArcadiansMerkleTree.json"),
    }
    
    // Initialise contracts
    const arcadiansParams = { 
        baseTokenUri: baseArcadianURI, 
        maxMintPerUser: 3, 
        mintPrice: 10,
        merkleGenerator: new MerkleGenerator(arcadiansMerklePaths)
    }
    let initArcadiansFunctionCall = arcadiansContracts.init.interface.encodeFunctionData('init', [arcadiansParams.merkleGenerator.merkleRoot, arcadiansParams.baseTokenUri, arcadiansParams.maxMintPerUser, arcadiansParams.mintPrice])
    let tx = await arcadiansContracts.diamond.diamondCut([], arcadiansContracts.init.address, initArcadiansFunctionCall)
    await tx.wait()

    let itemsMerklePaths: MerklePaths = {
        inputTokens: path.join(__dirname, "../../mocks/ownedItemsMock.json"),
        outputMerkleTree: path.join(__dirname, "../../mocks/ownedItemsMerkleTree.json"),
    }

    const itemsParams = { 
        baseTokenUri: baseItemURI,
        merkleGenerator: new MerkleGenerator(itemsMerklePaths)
    }
    // init items diamond
    let initItemsFunctionCall = itemsContracts.init.interface.encodeFunctionData('init', [itemsParams.merkleGenerator.merkleRoot, itemsParams.baseTokenUri])
    tx = await itemsContracts.diamond.diamondCut([], itemsContracts.init.address, initItemsFunctionCall)
    await tx.wait()

    return { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams };
}
