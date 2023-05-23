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

export interface ItemTest {
    id: number,
    address: string,
    isBasic: boolean,
    slotId: number,
}

export function convertItemsSC (itemsTest: ItemTest[]): Item[] {
    return itemsTest.map((item: ItemTest): Item =>  ({erc1155Contract: item.address, id: item.id}))
}

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
        maxMintPerUser: 2,
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
    let initItemsFunctionCall = itemsContracts.init.interface.encodeFunctionData('init', [itemsParams.merkleGenerator.merkleRoot, itemsParams.baseTokenUri, arcadiansContracts.inventoryFacet.address]);
    tx = await itemsContracts.diamond.diamondCut([], itemsContracts.init.address, initItemsFunctionCall);
    await tx.wait();

    const slots: Slot[] = [
        { permanent: true, isBase: true, id: 1, itemsIdsAllowed: [1, 2] },
        { permanent: true, isBase: false, id: 2, itemsIdsAllowed: [3, 4] },
        { permanent: false, isBase: true, id: 3, itemsIdsAllowed: [5, 6] },
        { permanent: false, isBase: true, id: 4, itemsIdsAllowed: [7, 8] },
        { permanent: false, isBase: false, id: 5, itemsIdsAllowed: [9, 10] },
        { permanent: false, isBase: false, id: 6, itemsIdsAllowed: [11, 12] },
    ]

    const items: ItemTest[] = [
        { address: itemsContracts.itemsFacet.address, id: 1, isBasic: true, slotId: 1 },
        { address: itemsContracts.itemsFacet.address, id: 2, isBasic: false, slotId: 1 },
        { address: itemsContracts.itemsFacet.address, id: 3, isBasic: true, slotId: 2 },
        { address: itemsContracts.itemsFacet.address, id: 4, isBasic: false, slotId: 2 },
        { address: itemsContracts.itemsFacet.address, id: 5, isBasic: true, slotId: 3 },
        { address: itemsContracts.itemsFacet.address, id: 6, isBasic: false, slotId: 3 },
        { address: itemsContracts.itemsFacet.address, id: 7, isBasic: true, slotId: 4 },
        { address: itemsContracts.itemsFacet.address, id: 8, isBasic: false, slotId: 4 },
        { address: itemsContracts.itemsFacet.address, id: 9, isBasic: true, slotId: 5 },
        { address: itemsContracts.itemsFacet.address, id: 10, isBasic: false, slotId: 5 },
        { address: itemsContracts.itemsFacet.address, id: 11, isBasic: true, slotId: 6 },
        { address: itemsContracts.itemsFacet.address, id: 12, isBasic: false, slotId: 6 }
    ]

    const itemsTransferRequired: boolean[] = items.map((item: ItemTest) => {
        const itemSlot = slots.find((slot: Slot) => slot.id == item.slotId) as Slot;
        return !item.isBasic && !itemSlot.isBase && !itemSlot.permanent;
    })
    
    console.log("input: ", convertItemsSC(items), itemsTransferRequired);
    
    await arcadiansContracts.inventoryFacet.setItemsTransferRequired(convertItemsSC(items), itemsTransferRequired);

    return { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items };
}
