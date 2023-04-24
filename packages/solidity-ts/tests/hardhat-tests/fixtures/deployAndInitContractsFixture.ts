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
import { Item, Slot } from '../Items.test';

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
    
    // Init arcadians contract
    const arcadiansParams = { 
        baseTokenUri: baseArcadianURI, 
        maxMintPerUser: 3,
        mintPrice: 10
    }
    let initArcadiansFunctionCall = arcadiansContracts.init.interface.encodeFunctionData('init', [arcadiansParams.baseTokenUri, arcadiansParams.maxMintPerUser, arcadiansParams.mintPrice])
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

    const slots: Slot[] = [
        { permanent: true, category: 0, id: 1, itemsIdsAllowed: [1, 20] },
        { permanent: false, category: 0, id: 2, itemsIdsAllowed: [2, 3] },
        { permanent: false, category: 0, id: 3, itemsIdsAllowed: [4, 5] },
        { permanent: false, category: 1, id: 4, itemsIdsAllowed: [6, 7] },
        { permanent: false, category: 1, id: 5, itemsIdsAllowed: [8, 9] },
        { permanent: false, category: 1, id: 6, itemsIdsAllowed: [10, 11] },
        { permanent: false, category: 1, id: 7, itemsIdsAllowed: [12, 13] },
        { permanent: false, category: 2, id: 8, itemsIdsAllowed: [14, 15] },
        { permanent: false, category: 2, id: 9, itemsIdsAllowed: [16, 17] },
        { permanent: false, category: 2, id: 10, itemsIdsAllowed: [18, 19] },
    ]
    const items: Item[] = [
        { erc721Contract: itemsContracts.itemsFacet.address, id: 1 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 2 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 3 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 4 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 5 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 6 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 7 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 8 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 9 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 10 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 11 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 12 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 13 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 14 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 15 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 16 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 17 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 18 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 19 },
        { erc721Contract: itemsContracts.itemsFacet.address, id: 20 }
    ]

    const basicItemsIds: number[] = items.reduce((acc: number[], item)=>{
        if (item.id % 3 == 0) {
            acc.push(item.id);
        }
        return acc;
    }, [])
    
    await itemsContracts.itemsFacet.setBasicBatch(basicItemsIds, basicItemsIds.map(()=>true));

    return { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items, basicItemsIds };
}
