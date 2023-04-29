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
import { Item, Slot, SlotCategory } from '../Items.test';

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
    let initItemsFunctionCall = itemsContracts.init.interface.encodeFunctionData('init', [itemsParams.merkleGenerator.merkleRoot, itemsParams.baseTokenUri, arcadiansContracts.inventoryFacet.address]);
    tx = await itemsContracts.diamond.diamondCut([], itemsContracts.init.address, initItemsFunctionCall);
    await tx.wait();

    const slots: Slot[] = [
        { permanent: true, category: SlotCategory.Base, id: 1, itemsIdsAllowed: [1, 2] },
        { permanent: false, category: SlotCategory.Base, id: 2, itemsIdsAllowed: [3, 4] },
        { permanent: false, category: SlotCategory.Base, id: 3, itemsIdsAllowed: [5, 6] },
        { permanent: false, category: SlotCategory.Base, id: 4, itemsIdsAllowed: [7, 8] },
        { permanent: false, category: SlotCategory.Base, id: 5, itemsIdsAllowed: [9, 10] },
        { permanent: false, category: SlotCategory.Base, id: 6, itemsIdsAllowed: [11, 12] },
        { permanent: false, category: SlotCategory.Base, id: 7, itemsIdsAllowed: [13, 14] },
        { permanent: false, category: SlotCategory.Base, id: 8, itemsIdsAllowed: [15, 16] },
        { permanent: false, category: SlotCategory.Cosmetic, id: 9, itemsIdsAllowed: [17, 18] },
        { permanent: false, category: SlotCategory.Cosmetic, id: 10, itemsIdsAllowed: [19, 20] },
        { permanent: false, category: SlotCategory.Cosmetic, id: 11, itemsIdsAllowed: [21, 22] },
        { permanent: false, category: SlotCategory.Cosmetic, id: 12, itemsIdsAllowed: [23, 24] },
        { permanent: false, category: SlotCategory.Equippment, id: 13, itemsIdsAllowed: [25, 26] },
        { permanent: false, category: SlotCategory.Equippment, id: 14, itemsIdsAllowed: [27, 28] },
        { permanent: false, category: SlotCategory.Equippment, id: 15, itemsIdsAllowed: [29, 30] },
        { permanent: false, category: SlotCategory.Equippment, id: 16, itemsIdsAllowed: [31, 32] },
        { permanent: false, category: SlotCategory.Equippment, id: 17, itemsIdsAllowed: [33, 34] },
    ]
    const items: Item[] = Array.from({length: 34}, (v, i)=>({ erc721Contract: itemsContracts.itemsFacet.address, id: i + 1 }))

    const basicItemsIds: number[] = items.reduce((acc: number[], item)=>{
        if (item.id % 3 == 0) {
            acc.push(item.id);
        }
        return acc;
    }, [])
    
    await itemsContracts.itemsFacet.setBasicBatch(basicItemsIds, basicItemsIds.map(()=>true));

    return { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items, basicItemsIds };
}
