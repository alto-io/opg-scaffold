import '~helpers/hardhat-imports';
import { ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import hre from 'hardhat';
import MerkleGenerator from '~helpers/merkle-tree/merkleGenerator';
import path from "path";
import fs from "fs";
import deployArcadiansDiamond, { arcadiansDiamondName } from '../../deploy/hardhat-deploy/01.ArcadiansDiamond.deploy';
import deployItemsDiamond, { itemsDiamondInitName, itemsDiamondName, itemsFacetNames } from '../../deploy/hardhat-deploy/02.ItemsDiamond.deploy';
import initArcadiansDiamond from '../../deploy/hardhat-deploy/03.initArcadiansDiamond.deploy';
import initItemsDiamond from '../../deploy/hardhat-deploy/04.initItemsDiamond.deploy';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployArcadiansFixture } from './Arcadians.test';

export const TOKENS_PATH_ITEMS = path.join(__dirname, "../mocks/ownedItemsMock.json");

export async function deployItemsFixture() {
    const deploymentHardhatPath = path.join(__dirname, '../../generated/hardhat/deployments/hardhat');
    if (fs.existsSync(deploymentHardhatPath)) {
        fs.rmdirSync(deploymentHardhatPath, { recursive: true })
    }
    const deploymentLocalhostPath = path.join(__dirname, '../../generated/hardhat/deployments/localhost');
    if (fs.existsSync(deploymentLocalhostPath)) {
        fs.rmdirSync(deploymentLocalhostPath, { recursive: true })
    }

    const merkleGenerator = new MerkleGenerator(TOKENS_PATH_ITEMS);
    const baseTokenUri = "https://api.arcadians.io/";

    await deployArcadiansDiamond();
    await deployItemsDiamond();
    await initItemsDiamond();

    const namedAccounts = await hre.ethers.getNamedSigners();
    const namedAddresses = {
        deployer: (await namedAccounts.deployer.getAddress()),
        alice: (await namedAccounts.alice.getAddress()),
        bob: (await namedAccounts.bob.getAddress()),
    }
    const diamond = await hre.ethers.getContract(itemsDiamondName);
    const arcadiansDiamond = await hre.ethers.getContract(arcadiansDiamondName);
    const itemsInit = await hre.ethers.getContract(itemsDiamondInitName)
    const itemsFacet = await hre.ethers.getContractAt(itemsFacetNames.itemsFacet, diamond.address)
    
    const merkleFacet = await hre.ethers.getContractAt(itemsFacetNames.merkleFacet, diamond.address)
    const inventoryFacet = await hre.ethers.getContractAt(itemsFacetNames.inventoryFacet, diamond.address)
    const rolesFacet = await hre.ethers.getContractAt(itemsFacetNames.rolesFacet, diamond.address)

    let functionCall = itemsInit.interface.encodeFunctionData('init', [arcadiansDiamond.address, merkleGenerator.merkleRoot, baseTokenUri])
    let tx = await diamond.diamondCut([], itemsInit.address, functionCall)
    await tx.wait()

    return { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, rolesFacet, merkleGenerator, baseTokenUri };
}

export async function deployItemsFixtureWithItemsTypes() {
    const _deployItemsFixture = await loadFixture(deployItemsFixture);

    // add item types
    await _deployItemsFixture.itemsFacet.addNonEquippableItemType("nonEquippableItemType1");
    await _deployItemsFixture.itemsFacet.addEquippableItemType("equippableItemType1", false);
    await _deployItemsFixture.itemsFacet.addEquippableItemType("equippableItemType2Unequippable", true);

    // assign item type to token id
    await _deployItemsFixture.itemsFacet.setTokenIdType(0, 0);
    await _deployItemsFixture.itemsFacet.setTokenIdType(1, 1);
    await _deployItemsFixture.itemsFacet.setTokenIdType(2, 2);

    return {..._deployItemsFixture }
}

describe('Items Diamond Test', function () {
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const owner = await diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })
})

describe('Items Diamond Inventory Test', function () {
    it('should be able to equip an item in the arcadian', async () => {
        const { arcadiansFacet, mintPrice } = await loadFixture(deployArcadiansFixture);
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixtureWithItemsTypes);
        const arcadianTokenId = 0;
        const slot = 1;
        const itemTokenId = 1;
        const amount = 1;
        
        await arcadiansFacet.mint({value: mintPrice})
        await itemsFacet.mint(namedAddresses.deployer, itemTokenId, amount)
        await inventoryFacet.equip(arcadianTokenId, slot, itemTokenId, amount);
        const equippedItem = await inventoryFacet.equipped(arcadianTokenId, slot);
        expect(equippedItem.itemTokenId).to.be.equal(itemTokenId);
        expect(equippedItem.amount).to.be.equal(amount);
    })
})

describe('Items Diamond Mint Test', function () {
    it('should be able to update arcadians address', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const newArcadiansAddress = inventoryFacet.address;
        await inventoryFacet.setArcadiansAddress(newArcadiansAddress);
        expect(await inventoryFacet.getArcadiansAddress()).to.be.equal(newArcadiansAddress);
    })

    it('should be able to add non equippable item type', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const itemName = "nonEquippableItemType1";
        expect((await inventoryFacet.numSlots())).to.be.equal(0);
        expect(await itemsFacet.getItemTypeCount()).to.be.equal(0);
        await itemsFacet.addNonEquippableItemType(itemName);
        expect(await itemsFacet.getItemTypeCount()).to.be.equal(1);

        expect((await inventoryFacet.numSlots())).to.be.equal(0);
        const itemTypeId = 0;
        const itemType = await itemsFacet.getItemType(itemTypeId);
        expect(itemType.name).to.be.equal(itemName);
        expect((await itemsFacet.isItemTypeEquippable(itemTypeId))).to.be.false;
    })

    it('should be able to add equippable item type with slot that can be unequipped', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const itemName = "equippableItemType1";
        expect((await inventoryFacet.numSlots())).to.be.equal(0);
        expect(await itemsFacet.getItemTypeCount()).to.be.equal(0);
        await itemsFacet.addEquippableItemType(itemName, false);
        expect(await itemsFacet.getItemTypeCount()).to.be.equal(1);

        const numSlots = await inventoryFacet.numSlots();
        const itemTypeId = 0;
        const itemType = await itemsFacet.getItemType(itemTypeId);
        expect(itemType.name).to.be.equal(itemName);
        expect(itemType.slot).to.be.equal(numSlots);
        expect((await itemsFacet.isItemTypeEquippable(itemTypeId))).to.be.true;
        expect((await inventoryFacet.slotIsUnequippable(itemType.slot))).to.be.false;
        expect(numSlots).to.be.equal(1);
    })

    it('should be able to add equippable item type with slot that cannot be unequipped', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const itemName = "equippableItemType1Unequippable";
        expect((await inventoryFacet.numSlots())).to.be.equal(0);
        expect(await itemsFacet.getItemTypeCount()).to.be.equal(0);
        await itemsFacet.addEquippableItemType(itemName, true);
        expect(await itemsFacet.getItemTypeCount()).to.be.equal(1);
        const numSlots = await inventoryFacet.numSlots();
        
        const itemTypeId = 0;
        const itemType = await itemsFacet.getItemType(itemTypeId);
        expect(itemType.name).to.be.equal(itemName);
        expect(itemType.slot).to.be.equal(numSlots);
        expect((await itemsFacet.isItemTypeEquippable(itemTypeId))).to.be.true;
        expect((await inventoryFacet.slotIsUnequippable(itemType.slot))).to.be.true;
        expect(numSlots).to.be.equal(1);
    })

    it('should not be able set token type for inexistent item type', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        
        await expect(itemsFacet.setTokenIdType(0, 0)).to.be.revertedWith("Item type does not exist");
    })

    it('should be able set token type for existent item type', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const itemName = "itemType1";
        await itemsFacet.addNonEquippableItemType(itemName);
        await itemsFacet.setTokenIdType(0, 0);
        expect(await itemsFacet.getItemTypeCount()).to.be.equal(1);
    })

    it('should not be able to mint token without item type created', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const tokenId = 1;
        const amount = 10;
        await expect(itemsFacet.mint(namedAddresses.deployer, tokenId, amount)).to.be.revertedWith("Token does not have type assigned");
    })

    it('should not be able to mint token without type assigned', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const tokenId = 1;
        const amount = 10;
        await itemsFacet.addNonEquippableItemType("itemName");
        await expect(itemsFacet.mint(namedAddresses.deployer, tokenId, amount)).to.be.revertedWith("Token does not have type assigned");
    })

    it('should be able to mint', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixtureWithItemsTypes);
        const amount = 10;
        const tokenId = 1;
        await itemsFacet.mint(namedAddresses.deployer, tokenId, amount);
        const balanceToken = await itemsFacet.balanceOf(namedAddresses.deployer, tokenId);
        expect(balanceToken).to.be.equal(amount);
    })
})

describe('Items Diamond merkle Test', function () {

    it('should not be able to claim tokens if not elegible', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixtureWithItemsTypes);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);
        
        await expect(
            itemsFacet.connect(namedAccounts.alice).claimBatch(ids, amounts, proofs),
        ).to.be.revertedWith("Data not included in merkle");
    })

    it('should not be able to claim tokens if token data is wrong', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixtureWithItemsTypes);
        const ids = [1, 2];
        const badAmounts = [3, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);
        await expect(
            itemsFacet.connect(namedAccounts.deployer).claimBatch(ids, badAmounts, proofs),
        ).to.be.revertedWith("Data not included in merkle");
    })
    
    it('should be able to claim tokens if elegible', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixtureWithItemsTypes);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);

        await itemsFacet.connect(namedAccounts.deployer).claimBatch(ids, amounts, proofs);

        for (let i = 0; i < ids.length; i++) {
            const balance = await itemsFacet.balanceOf(namedAddresses.deployer, ids[i])
            expect(balance).to.be.equal(amounts[i])
        }
    })

    it('should not able to claim the same tokens twice', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixtureWithItemsTypes);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);
        await itemsFacet.claimBatch(ids, amounts, proofs)
        await expect(
            itemsFacet.claimBatch(ids, amounts, proofs)
        ).to.be.revertedWith("Already claimed");
    })

    it('should be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        await merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })
})