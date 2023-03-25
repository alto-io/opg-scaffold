import '~helpers/hardhat-imports';
import { ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';

import path from "path";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import deployAndInitContractsFixture from './fixtures/deployAndInitContractsFixture';

export const TOKENS_PATH_ITEMS = path.join(__dirname, "../mocks/ownedItemsMock.json");

describe('Items Diamond Test', function () {
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const owner = await itemsContracts.diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })

    it('should be able to claim tokens if whitelisted', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        const elegibleAmount = 10;
        const tokenId = 1;

        let balance = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, tokenId);
        expect(balance).to.be.equal(0);


        await expect(itemsContracts.itemsFacet.claimWhitelist([tokenId], [elegibleAmount])).
            to.be.revertedWith("WhitelistInternal._consumeWhitelist: amount exceeds elegible amount");

        await itemsContracts.whitelistFacet.addToWhitelist(namedAddresses.deployer, elegibleAmount);
        expect(await itemsContracts.whitelistFacet.getWhitelistClaimed(namedAddresses.deployer)).to.be.equal(0);
        expect(await itemsContracts.whitelistFacet.getWhitelistBalance(namedAddresses.deployer)).to.be.equal(elegibleAmount);

        await itemsContracts.itemsFacet.claimWhitelist([tokenId], [elegibleAmount]);
        
        expect(await itemsContracts.whitelistFacet.getWhitelistClaimed(namedAddresses.deployer)).to.be.equal(elegibleAmount);
        expect(await itemsContracts.whitelistFacet.getWhitelistBalance(namedAddresses.deployer)).to.be.equal(0);
        balance = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, tokenId);
        expect(balance).to.be.equal(elegibleAmount);
    })
})

describe('Items Diamond Mint, equip and unequip items flow', function () {

    it('should be able to equip and unequip an item from an arcadian', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        const itemsAddress = itemsContracts.itemsFacet.address;

        // create slot
        const slotInput = {
            capacity: 10,
            unequippable: false
        }
        const itemId = 1;
        await arcadiansContracts.inventoryFacet.createSlot(slotInput.capacity, slotInput.unequippable, itemsAddress, [itemId]);
        const numSlots = await arcadiansContracts.inventoryFacet.numSlots();
        expect(numSlots).to.be.equal(1);
        const slotId = numSlots;
        let slot = await arcadiansContracts.inventoryFacet.getSlot(slotId);
        expect(slot.isUnequippable).to.be.equal(slotInput.unequippable);

        // mint item
        const itemAmount = 10;
        await itemsContracts.itemsFacet.mint(namedAddresses.deployer, itemId, itemAmount);
        const balanceToken = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, itemId);
        expect(balanceToken).to.be.equal(itemAmount);

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice});
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer);
        const arcadianId = (await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1));
        const balanceItem = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, itemId);
        
        // equip item in slot
        const itemToEquip1 = [itemsAddress, itemId, itemAmount];
        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);
        await arcadiansContracts.inventoryFacet.equip(arcadianId, slotId, itemToEquip1);
        let equippedItem = await arcadiansContracts.inventoryFacet.equipped(arcadianId, slotId);
        expect(equippedItem.id).to.be.equal(itemId);
        expect(equippedItem.itemAddress).to.be.equal(itemsAddress);
        expect(equippedItem.amount).to.be.equal(itemAmount);
        expect(await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, itemId)).to.be.equal(balanceItem-itemAmount);

        let arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        let expectedUri = "https://api.arcadians.io/" + arcadianId; // + "/?tokenIds=" + itemId
        expect(arcadianUri).to.be.equal(expectedUri);
        
        // unequip item
        await arcadiansContracts.inventoryFacet.unequip(arcadianId, slotId);
        equippedItem = await arcadiansContracts.inventoryFacet.equipped(itemId, slotId);
        
        expect(equippedItem.amount).to.be.equal(0);
        expect(equippedItem.id).to.be.equal(0);
        expect(equippedItem.itemAddress).to.be.equal(ethers.constants.AddressZero);
        expect(await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, itemId)).to.be.equal(balanceItem);
    })

    // In order to avoid code duplication in tests setup, 
    // all error cases for a flow are grouped in one test.
    it('should not be able to equip and unequip an item from an arcadian', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        const itemsAddress = itemsContracts.itemsFacet.address;

        // create slot
        const slotInput = {
            capacity: 1,
            unequippable: false
        }
        const itemId = 1;
        const slotId = 1;
        await arcadiansContracts.inventoryFacet.createSlot(slotInput.capacity, slotInput.unequippable, itemsAddress, [itemId]);
        const slotInput2 = {
            capacity: 10,
            unequippable: true
        }
        const slot2Id = 2;
        await arcadiansContracts.inventoryFacet.createSlot(slotInput2.capacity, slotInput2.unequippable, itemsAddress, []);
        
        // Allow items in slot
        await expect(arcadiansContracts.inventoryFacet.allowItemsInSlot(0, itemsAddress, [itemId])).to.be.revertedWith("InventoryFacet: Slot id can't be zero");
        await expect(arcadiansContracts.inventoryFacet.allowItemsInSlot(1000, itemsAddress, [itemId])).to.be.revertedWith("InventoryFacet: Invalid slot");
        await arcadiansContracts.inventoryFacet.allowItemsInSlot(slot2Id, itemsAddress, [itemId]);

        // mint item
        const itemAmount = 10;
        await itemsContracts.itemsFacet.mint(namedAddresses.deployer, itemId, itemAmount);

        // mint arcadian
        const maxMintPerUser = await arcadiansContracts.arcadiansFacet.getMaxMintPerUser();
        for (let i = 0; i < maxMintPerUser; i++) {
            await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice})
        }
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)
        
        // approve tokens for the inventory contract
        const numSlots = (await arcadiansContracts.inventoryFacet.numSlots()).toString();
        const amountToEquip = slotInput.capacity;

        const itemToEquip1 = [itemsAddress, itemId, amountToEquip];
        const itemToEquip2 = [itemsAddress, slot2Id, amountToEquip];
        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, numSlots, itemToEquip1)).
            to.be.reverted;

        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);

        // equip item in slot
        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, [0], itemToEquip1)).
            to.be.revertedWith("InventoryFacet.equip: Item not elegible for slot");

        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, numSlots+1, itemToEquip1)).
            to.be.revertedWith("InventoryFacet.equip: Item not elegible for slot");

        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, slotId, itemToEquip2)).
            to.be.revertedWith("InventoryFacet.equip: Item not elegible for slot");

        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, slotId, [itemsAddress, itemId, amountToEquip+1])).
            to.be.revertedWith("InventoryFacet.equip: Item amount exceeds slot capacity");

        await arcadiansContracts.inventoryFacet.equip(arcadianId, slotId, itemToEquip1);
        await arcadiansContracts.inventoryFacet.equip(arcadianId, slot2Id, itemToEquip1);
        
        // unequip item
        let unequipAll = true;
        await expect(arcadiansContracts.inventoryFacet.connect(namedAccounts.alice).unequip(arcadianId, slotId)).
            to.be.revertedWith("InventoryFacet: Message sender is not owner of the arcadian");
        const unmintedArcadianId = 999;
        await expect(arcadiansContracts.inventoryFacet.unequip(unmintedArcadianId, slotId)).
            to.be.reverted;
        await expect(arcadiansContracts.inventoryFacet.unequip(arcadianId, slot2Id)).
            to.be.revertedWith("InventoryFacet._unequip: Slot is unequippable");
    })
    
    it('should be able to equip and unequip items from an arcadian in batch', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        const itemsAddress = itemsContracts.itemsFacet.address;

        // create slot
        const itemIds = [1, 2, 3]
        const itemAmounts = [1, 1, 10]

        const slotsIds = [1, 2, 3]
        const slotsCapacity = 10;
        const slotsUnequippable = false;
        for (let i = 0; i < itemIds.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slotsCapacity, slotsUnequippable, itemsAddress, itemIds);
        }

        // mint item
        for (let i = 0; i < itemIds.length; i++) {
            await itemsContracts.itemsFacet.mint(namedAddresses.deployer, itemIds[i], itemAmounts[i]);
        }

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice})
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)

        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);
        
        const itemsToEquip = itemIds.map((itemId, i)=>[itemsAddress, itemId, itemAmounts[i]]);
        await arcadiansContracts.inventoryFacet.equipBatch(arcadianId, slotsIds, itemsToEquip);
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].id).to.be.equal(itemIds[i]);
            expect(equippedItems[i].amount).to.be.equal(itemAmounts[i]);
            expect(equippedItems[i].itemAddress).to.be.equal(itemsAddress);
        }

        let arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        let expectedUri = "https://api.arcadians.io/" + arcadianId; // + "/?tokenIds=" + itemIds.toString()
        expect(arcadianUri).to.be.equal(expectedUri);
        
        await arcadiansContracts.inventoryFacet.unequipBatch(arcadianId, slotsIds);
        equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].amount).to.be.equal(0);
            expect(equippedItems[i].id).to.be.equal(0);
            expect(equippedItems[i].itemAddress).to.be.equal(ethers.constants.AddressZero);
        }

        arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        expectedUri = "https://api.arcadians.io/" + arcadianId; + "/?tokenIds=" + itemIds.map(id=>"0").toString()
        expect(arcadianUri).to.be.equal(expectedUri);
    })

    it('should unequip all items on arcadian transfer', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        const itemsAddress = itemsContracts.itemsFacet.address;

        // create slot
        const itemIds = [1, 2, 3]
        const itemAmounts = [1, 1, 10]

        const slotsIds = [1, 2, 3]
        const slotsCapacity = 10;
        const slotsUnequippable = false;
        for (let i = 0; i < itemIds.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slotsCapacity, slotsUnequippable, itemsAddress, itemIds);
        }

        // mint item
        for (let i = 0; i < itemIds.length; i++) {
            await itemsContracts.itemsFacet.mint(namedAddresses.deployer, itemIds[i], itemAmounts[i]);
        }

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice})
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)

        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);

        const itemsToEquip = itemIds.map((itemId, i)=>[itemsAddress, itemId, itemAmounts[i]]);
        await arcadiansContracts.inventoryFacet.equipBatch(arcadianId, slotsIds, itemsToEquip);
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].id).to.be.equal(itemIds[i]);
            expect(equippedItems[i].amount).to.be.equal(itemAmounts[i]);
            expect(equippedItems[i].itemAddress).to.be.equal(itemsAddress);
        }

        await arcadiansContracts.arcadiansFacet.transferFrom(namedAddresses.deployer, namedAddresses.alice, arcadianId);

        equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].amount).to.be.equal(0);
            expect(equippedItems[i].id).to.be.equal(0);
            expect(equippedItems[i].itemAddress).to.be.equal(ethers.constants.AddressZero);
            const balanceToken = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, itemIds[i]);
            expect(balanceToken).to.be.equal(itemAmounts[i]);
        }
    })

    it('should be able to unequip all items at once', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        const itemsAddress = itemsContracts.itemsFacet.address;

        // create slot
        const itemIds = [1, 2, 3]
        const itemAmounts = [1, 1, 10]

        const slotsIds = [1, 2, 3]
        const slotsCapacity = 10;
        const slotsUnequippable = false;
        for (let i = 0; i < itemIds.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slotsCapacity, slotsUnequippable, itemsAddress, itemIds);
        }

        // mint item
        for (let i = 0; i < itemIds.length; i++) {
            await itemsContracts.itemsFacet.mint(namedAddresses.deployer, itemIds[i], itemAmounts[i]);
        }

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice})
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)

        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);

        const itemsToEquip = itemIds.map((itemId, i)=>[itemsAddress, itemId, itemAmounts[i]])
        
        await arcadiansContracts.inventoryFacet.equipBatch(arcadianId, slotsIds, itemsToEquip);
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].id).to.be.equal(itemIds[i]);
            expect(equippedItems[i].amount).to.be.equal(itemAmounts[i]);
            expect(equippedItems[i].itemAddress).to.be.equal(itemsAddress);
        }

        await arcadiansContracts.inventoryFacet.unequipAll(arcadianId);

        equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].amount).to.be.equal(0);
            expect(equippedItems[i].id).to.be.equal(0);
            expect(equippedItems[i].itemAddress).to.be.equal(ethers.constants.AddressZero);
            const balanceToken = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, itemIds[i]);
            expect(balanceToken).to.be.equal(itemAmounts[i]);
        }
    })
})

describe('Items Diamond merkle Test', function () {

    it('should not be able to claim tokens if not elegible', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = itemsParams.merkleGenerator.generateProofs(namedAddresses.deployer);
        
        await expect(
            itemsContracts.itemsFacet.connect(namedAccounts.alice).claimMerkleBatch(ids, amounts, proofs),
        ).to.be.revertedWith("Data not included in merkle");
    })

    it('should not be able to claim tokens if token data is wrong', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const ids = [1, 2];
        const badAmounts = [3, 2];
        const proofs = itemsParams.merkleGenerator.generateProofs(namedAddresses.deployer);
        await expect(
            itemsContracts.itemsFacet.connect(namedAccounts.deployer).claimMerkleBatch(ids, badAmounts, proofs),
        ).to.be.revertedWith("Data not included in merkle");
    })

    it('should be able to claim tokens if elegible', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = itemsParams.merkleGenerator.generateProofs(namedAddresses.deployer);
        
        await itemsContracts.itemsFacet.connect(namedAccounts.deployer).claimMerkleBatch(ids, amounts, proofs);

        for (let i = 0; i < ids.length; i++) {
            const balance = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, ids[i]);
            expect(balance).to.be.equal(amounts[i]);
        }
    })

    it('should not able to claim the same tokens twice', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = itemsParams.merkleGenerator.generateProofs(namedAddresses.deployer);
        await itemsContracts.itemsFacet.claimMerkleBatch(ids, amounts, proofs)
        await expect(
            itemsContracts.itemsFacet.claimMerkleBatch(ids, amounts, proofs)
        ).to.be.revertedWith("ItemsInternal._claimMerkle: Already claimed");
    })

    it('should be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        await itemsContracts.merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await itemsContracts.merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })
})