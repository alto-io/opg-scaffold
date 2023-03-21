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

describe('Items Diamond Test', function () {
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const owner = await diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })
})

describe('Items Diamond Mint, equip and unequip items flow', function () {
    it('should be able to update arcadians address', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const newArcadiansAddress = inventoryFacet.address;
        await inventoryFacet.setArcadiansAddress(newArcadiansAddress);
        expect(await inventoryFacet.getArcadiansAddress()).to.be.equal(newArcadiansAddress);
    })

    it('should be able to equip and unequip an item from an arcadian', async () => {
        const { arcadiansFacet, mintPrice } = await loadFixture(deployArcadiansFixture);
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);

        // create slot
        const slotInput = {
            name: "slot1",
            capacity: 10,
            unequippable: true
        }
        await inventoryFacet.createSlot(slotInput.name, slotInput.capacity, slotInput.unequippable);
        const numSlots = await inventoryFacet.numSlots();
        expect(numSlots).to.be.equal(1);
        const slotId = numSlots;
        let slot = await inventoryFacet.getSlot(slotId);
        expect(slot.name).to.be.equal(slotInput.name);
        expect(slot.isUnequippable).to.be.equal(slotInput.unequippable);

        // Allow items in slot
        const itemId = 1;
        await itemsFacet.allowItemInSlot(itemId, slotId);

        // mint item
        const itemAmount = 10;
        await itemsFacet.mint(namedAddresses.deployer, itemId, itemAmount);
        const balanceToken = await itemsFacet.balanceOf(namedAddresses.deployer, itemId);
        expect(balanceToken).to.be.equal(itemAmount);

        // mint arcadian
        await arcadiansFacet.mint({value: mintPrice})
        const balance = await arcadiansFacet.balanceOf(namedAddresses.deployer)
        const arcadianId = await arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)
        
        // equip item in slot
        await inventoryFacet.equip(arcadianId, slotId, itemId, itemAmount);
        let equippedItem = await inventoryFacet.equipped(arcadianId, slotId);
        expect(equippedItem.id).to.be.equal(itemId);
        expect(equippedItem.amount).to.be.equal(itemAmount);

        let arcadianUri = await arcadiansFacet.tokenURI(arcadianId)
        console.log("arcadianUri: ", arcadianUri);
        let expectedUri = "https://api.arcadians.io/" + arcadianId + "/?tokenIds=" + itemId
        expect(arcadianUri).to.be.equal(expectedUri);

        // allow to unequip slot
        expect(slot.isUnequippable).to.be.true;
        await inventoryFacet.allowSlotUnequip(slotId);
        slot = await inventoryFacet.getSlot(slotId);
        expect(slot.isUnequippable).to.be.false;
        
        // unequip item
        const unequipAll = true;
        await inventoryFacet.unequip(arcadianId, slotId, unequipAll, 0);
        equippedItem = await inventoryFacet.equipped(itemId, slotId);
        expect(equippedItem.amount).to.be.equal(0);
        expect(equippedItem.id).to.be.equal(0);
    })

    // In order to avoid code duplication in tests setup, 
    // all error cases for a flow are grouped in one test.
    it('should not be able to equip and unequip an item from an arcadian', async () => {
        const { arcadiansFacet, mintPrice } = await loadFixture(deployArcadiansFixture);
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);

        // create slot
        const slotInput = {
            name: "slot1",
            capacity: 1,
            unequippable: true
        }
        await inventoryFacet.createSlot(slotInput.name, slotInput.capacity, slotInput.unequippable);
        const slotInput2 = {
            name: "slot2",
            capacity: 10,
            unequippable: false
        }
        await inventoryFacet.createSlot(slotInput2.name, slotInput2.capacity, slotInput2.unequippable);
        
        // Allow items in slot
        const numSlots = await inventoryFacet.numSlots();
        const slotId = 1;
        const itemId = 1;
        await expect(itemsFacet.allowItemInSlot(0, slotId)).to.be.revertedWith("Item id can't be zero");
        await expect(itemsFacet.allowItemInSlot(itemId, 0)).to.be.revertedWith("Slot id can't be zero");
        await expect(itemsFacet.allowItemInSlot(itemId, 1000)).to.be.revertedWith("Inexistent slot id");
        await itemsFacet.allowItemInSlot(itemId, slotId);
        const itemIdWithoutSlot = 2;

        // mint item
        const itemAmount = 10;
        await expect(itemsFacet.mint(namedAddresses.deployer, 0, itemAmount)).
            to.be.revertedWith("Item id can't be zero");
        await expect(itemsFacet.mint(namedAddresses.deployer, 100, itemAmount)).
            to.be.revertedWith("Item does not have any slot where it can be equipped");
        await itemsFacet.mint(namedAddresses.deployer, itemId, itemAmount);

        // mint arcadian
        await expect(arcadiansFacet.mint({value: 0})).
            to.be.revertedWith("Invalid pay amount");
        await expect(arcadiansFacet.mint({value: mintPrice + 1})).
            to.be.revertedWith("Invalid pay amount");
        const maxMintPerUser = await arcadiansFacet.getMaxMintPerUser();
        for (let i = 0; i < maxMintPerUser; i++) {
            await arcadiansFacet.mint({value: mintPrice})
        }
        await expect(arcadiansFacet.mint({value: mintPrice})).
            to.be.revertedWith("User maximum minted tokens reached");
        const balance = await arcadiansFacet.balanceOf(namedAddresses.deployer)
        
        const arcadianId = await arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)
        
        // equip item in slot
        await expect(inventoryFacet.equip(arcadianId, 0, itemId, slotInput.capacity)).
            to.be.revertedWith("Slot id can't be zero");
        await expect(inventoryFacet.equip(arcadianId, numSlots+1, itemId, slotInput.capacity)).
            to.be.revertedWith("Inexistent slot id");
            await expect(inventoryFacet.equip(arcadianId, slotId, itemIdWithoutSlot, slotInput.capacity)).
                to.be.revertedWith("Item needs to be assigned to at least 1 slot");
        await expect(inventoryFacet.equip(arcadianId, slotId, itemId, slotInput.capacity+1)).
            to.be.revertedWith("Amount exceeds slot capacity");
        await inventoryFacet.equip(arcadianId, slotId, itemId, slotInput.capacity);
        
        // unequip item
        let unequipAll = true;
        const unequipAmount = 1;
        await expect(inventoryFacet.connect(namedAccounts.alice).unequip(arcadianId, slotId, unequipAll, unequipAmount)).
            to.be.revertedWith("InventoryFacet.equip: Message sender is not owner of the arcadian");
        const unmintedArcadianId = 999;
        await expect(inventoryFacet.unequip(unmintedArcadianId, slotId, unequipAll, unequipAmount)).
            to.be.reverted;
        await expect(inventoryFacet.unequip(arcadianId, slotId, unequipAll, unequipAmount)).
            to.be.revertedWith("InventoryFacet._unequip: That slot is not unequippable");
        
        await inventoryFacet.allowSlotUnequip(slotId);
        await expect(inventoryFacet.allowSlotUnequip(slotId)).to.be.revertedWith("Slot already unquippable");

        await expect(inventoryFacet.unequip(arcadianId, slotId, false, unequipAmount+1)).
            to.be.revertedWith("InventoryFacet._unequip: Attempting to unequip too many items from the slot");
    })
    
    it('should be able to equip and unequip items from an arcadian in batch', async () => {
        const { arcadiansFacet, mintPrice } = await loadFixture(deployArcadiansFixture);
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);

        // create slot
        const slotsInput = [{
            name: "slot1",
            capacity: 1,
            unequippable: false
        }, {
            name: "slot2",
            capacity: 1,
            unequippable: false
        }, {
            name: "slot3",
            capacity: 10,
            unequippable: false
        }]
        for (let i = 0; i < slotsInput.length; i++) {
            await inventoryFacet.createSlot(slotsInput[i].name, slotsInput[i].capacity, slotsInput[i].unequippable);
        }

        // Allow items in slot
        const items = [
            {id: 1, amount: 1, slots: [1]}, 
            {id: 2, amount: 1, slots: [1, 2]},
            {id: 3, amount: 1, slots: [2]}, 
            {id: 4, amount: 10, slots: [2]}, 
            {id: 5, amount: 10, slots: [1, 2, 3]}, 
            {id: 6, amount: 10, slots: [3]}
        ];
        for (let i = 0; i < items.length; i++) {
            await itemsFacet.allowItemInSlotsBatch(items[i].id, items[i].slots);
        }

        // mint item
        for (let i = 0; i < items.length; i++) {
            await itemsFacet.mint(namedAddresses.deployer, items[i].id, items[i].amount);
        }

        // mint arcadian
        await arcadiansFacet.mint({value: mintPrice})
        const balance = await arcadiansFacet.balanceOf(namedAddresses.deployer)
        const arcadianId = await arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)
        
        // equip items in slots
        const slotsIds = [1, 2, 3];
        const itemsIds = [1, 2, 6];
        const amounts = [1, 1, 5];

        await inventoryFacet.equipBatch(arcadianId, slotsIds, itemsIds, amounts);
        let equippedItem = await inventoryFacet.equippedBatch(arcadianId);
        for (let i = 0; i < equippedItem.length; i++) {
            expect(equippedItem[i].id).to.be.equal(itemsIds[i]);
            expect(equippedItem[i].amount).to.be.equal(amounts[i]);
        }

        let arcadianUri = await arcadiansFacet.tokenURI(arcadianId)
        let expectedUri = "https://api.arcadians.io/" + arcadianId + "/?tokenIds=" + itemsIds.toString()
        expect(arcadianUri).to.be.equal(expectedUri);
        
        // unequip items
        await inventoryFacet.unequipBatch(arcadianId);
        const equippedItems = await inventoryFacet.equippedBatch(arcadianId);
        
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].amount).to.be.equal(0);
            expect(equippedItems[i].id).to.be.equal(0);
        }

        arcadianUri = await arcadiansFacet.tokenURI(arcadianId)
        expectedUri = "https://api.arcadians.io/" + arcadianId + "/?tokenIds=" + itemsIds.map(id=>"0").toString()
        expect(arcadianUri).to.be.equal(expectedUri);
    })
})

describe('Items Diamond merkle Test', function () {

    it('should not be able to claim tokens if not elegible', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);
        
        await expect(
            itemsFacet.connect(namedAccounts.alice).claimBatch(ids, amounts, proofs),
        ).to.be.revertedWith("Data not included in merkle");
    })

    it('should not be able to claim tokens if token data is wrong', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const ids = [1, 2];
        const badAmounts = [3, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);
        await expect(
            itemsFacet.connect(namedAccounts.deployer).claimBatch(ids, badAmounts, proofs),
        ).to.be.revertedWith("Data not included in merkle");
    })
    
    it('should be able to claim tokens if elegible', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
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
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
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