import '~helpers/hardhat-imports';
import { BigNumber, ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';

import path from "path";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import deployAndInitContractsFixture from './fixtures/deployAndInitContractsFixture';
import { formatUnits } from '@ethersproject/units';

export const TOKENS_PATH_ITEMS = path.join(__dirname, "../mocks/ownedItemsMock.json");

export interface ItemSC {
    contractAddress: string,
    id: number
}

export interface Slot {
    unequippable: boolean,
    category: number,
    id: number,
    itemsIdsAllowed: number[]
}

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
        expect(await itemsContracts.whitelistFacet.whitelistClaimed(namedAddresses.deployer)).to.be.equal(0);
        expect(await itemsContracts.whitelistFacet.whitelistBalance(namedAddresses.deployer)).to.be.equal(elegibleAmount);

        await itemsContracts.itemsFacet.claimWhitelist([tokenId], [elegibleAmount]);
        
        expect(await itemsContracts.whitelistFacet.whitelistClaimed(namedAddresses.deployer)).to.be.equal(elegibleAmount);
        expect(await itemsContracts.whitelistFacet.whitelistBalance(namedAddresses.deployer)).to.be.equal(0);
        balance = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, tokenId);
        expect(balance).to.be.equal(elegibleAmount);
    })
})

describe('Items Diamond Mint, equip and unequip items flow', function () {
    it('should be able to equip and unequip an item from an arcadian', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        // create slot
        const slot: Slot = {
            id: 0,
            unequippable: false,
            category: 0,
            itemsIdsAllowed: [0, 1] 
        }
        const item: ItemSC = {
            contractAddress: itemsContracts.itemsFacet.address,
            id: 0
        }
        
        await arcadiansContracts.inventoryFacet.createSlot(slot.unequippable, slot.category, [item]);
        slot.id = await arcadiansContracts.inventoryFacet.numSlots();
        expect(slot.id).to.be.equal(1);

        // Remove and set item slot
        expect(await arcadiansContracts.inventoryFacet.allowedSlot(item)).to.be.equal(slot.id);
        expect(await arcadiansContracts.inventoryFacet.allowedItems(slot.id)).to.be.eql([[item.contractAddress, BigNumber.from(item.id)]]);

        await arcadiansContracts.inventoryFacet.disallowItemsInSlot(slot.id, [item]);
        expect(await arcadiansContracts.inventoryFacet.allowedSlot(item)).to.be.equal(0);
        expect(await arcadiansContracts.inventoryFacet.allowedItems(slot.id)).to.be.eql([]);

        await arcadiansContracts.inventoryFacet.allowItemsInSlot(slot.id, [item]);
        expect(await arcadiansContracts.inventoryFacet.allowedSlot(item)).to.be.equal(slot.id);
        expect(await arcadiansContracts.inventoryFacet.allowedItems(slot.id)).to.be.eql([[item.contractAddress, BigNumber.from(item.id)]]);
        
        const slotSC = await arcadiansContracts.inventoryFacet.slot(slot.id);
        expect(slotSC.category).to.be.equal(slot.category);
        expect(slotSC.unequippable).to.be.equal(slot.unequippable);
        expect(await arcadiansContracts.inventoryFacet.allowedSlot(item)).to.be.equal(slot.id);

        // mint item
        const tokenAmount = 10;
        await itemsContracts.itemsFacet.mint(namedAddresses.deployer, item.id, tokenAmount);
        const balanceToken = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, item.id);
        expect(balanceToken).to.be.equal(tokenAmount);

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice});
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer);
        const arcadianId = (await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1));
        const balanceItem = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, item.id);
        
        // equip item in slot
        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);
        
        await arcadiansContracts.inventoryFacet.equip(arcadianId, slot.id, item);
        let equippedItem = await arcadiansContracts.inventoryFacet.equipped(arcadianId, slot.id);
        expect(equippedItem.itemId).to.be.equal(item.id);
        expect(equippedItem.slotId).to.be.equal(slot.id);
        expect(equippedItem.contractAddress).to.be.equal(item.contractAddress);
        expect(await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, item.id)).to.be.equal(balanceItem-1);

        let arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        let expectedUri = "https://api.arcadians.io/" + arcadianId;
        expect(arcadianUri).to.be.equal(expectedUri);
        
        // unequip item
        await arcadiansContracts.inventoryFacet.unequip(arcadianId, slot.id);
        equippedItem = await arcadiansContracts.inventoryFacet.equipped(item.id, slot.id);
        
        expect(equippedItem.itemId).to.be.equal(0);
        expect(equippedItem.contractAddress).to.be.equal(ethers.constants.AddressZero);
        expect(await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, item.id)).to.be.equal(balanceItem);
    })

    // In order to avoid code duplication in tests setup, 
    // all error cases for a flow are grouped in one test.
    it('should not be able to equip and unequip an item from an arcadian', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        // create slot
        const slot: Slot = {
            id: 0,
            unequippable: false,
            category: 0,
            itemsIdsAllowed: [0, 1] 
        }
        const item: ItemSC = {
            contractAddress: itemsContracts.itemsFacet.address,
            id: 0
        }
        await arcadiansContracts.inventoryFacet.createSlot(slot.unequippable, slot.category, [item]);

        slot.id = await arcadiansContracts.inventoryFacet.numSlots();

        const slot2: Slot = {
            id: 0,
            unequippable: true,
            category: 1,
            itemsIdsAllowed: [0, 1] 
        }
        
        await arcadiansContracts.inventoryFacet.createSlot(slot2.unequippable, slot2.category, []);
        slot2.id = await arcadiansContracts.inventoryFacet.numSlots();
        
        // Allow items in slot
        await expect(arcadiansContracts.inventoryFacet.allowItemsInSlot(0, [item])).to.be.revertedWith("InventoryFacet: Slot id can't be zero");
        await expect(arcadiansContracts.inventoryFacet.allowItemsInSlot(1000, [item])).to.be.revertedWith("InventoryFacet: Invalid slot");

        // mint item
        const tokenAmount = 10;
        await itemsContracts.itemsFacet.mint(namedAddresses.deployer, item.id, tokenAmount);

        // mint arcadian
        const maxMintPerUser = await arcadiansContracts.arcadiansFacet.maxMintPerUser();
        for (let i = 0; i < maxMintPerUser; i++) {
            await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice})
        }
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)
        
        // approve tokens for the inventory contract
        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, slot.id, item)).
            to.be.reverted;

        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);

        // equip item in slot
        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, 0, item)).
            to.be.revertedWith("InventoryFacet: Slot id can't be zero");

        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, 999, item)).
            to.be.revertedWith("InventoryFacet: Invalid slot");

        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, slot.id, [item.contractAddress, 999])).
            to.be.revertedWith("InventoryFacet.equip: Item not elegible for slot");

        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, slot2.id, item)).
            to.be.revertedWith("InventoryFacet.equip: Item not elegible for slot");
        
        await arcadiansContracts.inventoryFacet.equip(arcadianId, slot.id, item);
        await expect(arcadiansContracts.inventoryFacet.equip(arcadianId, slot.id, item)).
            to.be.revertedWith("InventoryFacet._equip: Base items are not unique");
        
        // unequip item
        await expect(arcadiansContracts.inventoryFacet.connect(namedAccounts.alice).unequip(arcadianId, slot.id)).
            to.be.revertedWith("InventoryFacet: Message sender is not owner of the arcadian");
        const unmintedArcadianId = 999;
        await expect(arcadiansContracts.inventoryFacet.unequip(unmintedArcadianId, slot.id)).
            to.be.reverted;
        await expect(arcadiansContracts.inventoryFacet.unequip(arcadianId, slot2.id)).
            to.be.revertedWith("InventoryFacet._unequip: Slot is unequippable");
    })
    
    it('should be able to equip and unequip items from an arcadian in batch', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        // create slot
        const slots: Slot[] = [
            { unequippable: false, category: 0, id: 1, itemsIdsAllowed: [0, 1] },
            { unequippable: false, category: 0, id: 2, itemsIdsAllowed: [2, 3] },
            { unequippable: false, category: 0, id: 3, itemsIdsAllowed: [4, 5] },
            { unequippable: false, category: 1, id: 4, itemsIdsAllowed: [5, 7] },
            { unequippable: false, category: 1, id: 5, itemsIdsAllowed: [8, 9] },
            { unequippable: false, category: 1, id: 6, itemsIdsAllowed: [10, 11] },
            { unequippable: false, category: 1, id: 7, itemsIdsAllowed: [12, 13] },
            { unequippable: false, category: 2, id: 8, itemsIdsAllowed: [14, 15] },
            { unequippable: false, category: 2, id: 9, itemsIdsAllowed: [16, 17] },
            { unequippable: false, category: 2, id: 10, itemsIdsAllowed: [18, 19] },
        ]
        const items: ItemSC[] = [
            { contractAddress: itemsContracts.itemsFacet.address, id: 0 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 1 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 2 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 3 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 4 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 5 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 6 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 7 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 8 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 9 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 10 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 11 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 12 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 13 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 14 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 15 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 16 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 17 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 18 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 19 },
        ]

        for (let i = 0; i < slots.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].unequippable, slots[i].category, items.filter((item)=> slots[i].itemsIdsAllowed?.includes(item.id)));
        }

        const mintItemsAmount = 100;
        // mint item
        for (let i = 0; i < items.length; i++) {
            await itemsContracts.itemsFacet.mint(namedAddresses.deployer, items[i].id, mintItemsAmount);
        }

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice})
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)

        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);
        
        const slotsIdsToEquip = slots.map(slot=>slot.id);
        const itemsToEquip = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[0]));

        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, slotsIdsToEquip, itemsToEquip)).to.be.true;
        
        await arcadiansContracts.inventoryFacet.equipBatch(arcadianId, slotsIdsToEquip, itemsToEquip);

        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as ItemSC).id);
            expect(equippedItems[i].contractAddress).to.be.equal((itemsToEquip[i] as ItemSC).contractAddress);
        }
        
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, slotsIdsToEquip, itemsToEquip)).to.be.false;

        let arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        let expectedUri = "https://api.arcadians.io/" + arcadianId;
        expect(arcadianUri).to.be.equal(expectedUri);
        
        await arcadiansContracts.inventoryFacet.unequipBatch(arcadianId, slotsIdsToEquip);
        
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, slotsIdsToEquip, itemsToEquip)).to.be.true;
        
        equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal(0);
            expect(equippedItems[i].contractAddress).to.be.equal(ethers.constants.AddressZero);
        }

        arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        expectedUri = "https://api.arcadians.io/" + arcadianId;
        expect(arcadianUri).to.be.equal(expectedUri);
    })

    it('should unequip all items on arcadian transfer', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        
        // create slot
        const slots: Slot[] = [
            { unequippable: false, category: 0, id: 1, itemsIdsAllowed: [0, 1] },
            { unequippable: false, category: 0, id: 2, itemsIdsAllowed: [2, 3] },
            { unequippable: false, category: 0, id: 3, itemsIdsAllowed: [4, 5] },
            { unequippable: false, category: 1, id: 4, itemsIdsAllowed: [5, 7] },
            { unequippable: false, category: 1, id: 5, itemsIdsAllowed: [8, 9] },
            { unequippable: false, category: 1, id: 6, itemsIdsAllowed: [10, 11] },
            { unequippable: false, category: 1, id: 7, itemsIdsAllowed: [12, 13] },
            { unequippable: false, category: 2, id: 8, itemsIdsAllowed: [14, 15] },
            { unequippable: false, category: 2, id: 9, itemsIdsAllowed: [16, 17] },
            { unequippable: false, category: 2, id: 10, itemsIdsAllowed: [18, 19] },
        ]
        const items: ItemSC[] = [
            { contractAddress: itemsContracts.itemsFacet.address, id: 0 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 1 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 2 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 3 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 4 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 5 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 6 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 7 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 8 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 9 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 10 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 11 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 12 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 13 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 14 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 15 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 16 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 17 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 18 },
            { contractAddress: itemsContracts.itemsFacet.address, id: 19 },
        ]

        for (let i = 0; i < slots.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].unequippable, slots[i].category, items.filter((item)=> slots[i].itemsIdsAllowed?.includes(item.id)));
        }

        const mintItemsAmount = 100;
        // mint item
        for (let i = 0; i < items.length; i++) {
            await itemsContracts.itemsFacet.mint(namedAddresses.deployer, items[i].id, mintItemsAmount);
        }

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.mint({value: arcadiansParams.mintPrice})
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(namedAddresses.deployer, balance-1)

        await itemsContracts.itemsFacet.setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);
        
        const slotsIdsToEquip = slots.map(slot=>slot.id);
        const itemsToEquip = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[0]));

        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, slotsIdsToEquip, itemsToEquip)).to.be.true;
        
        await arcadiansContracts.inventoryFacet.equipBatch(arcadianId, slotsIdsToEquip, itemsToEquip);
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as ItemSC).id);
            expect(equippedItems[i].contractAddress).to.be.equal((itemsToEquip[i] as ItemSC).contractAddress);
            expect(await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, itemsToEquip[i]?.id)).to.be.equal(mintItemsAmount-1);
        }
        
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, slotsIdsToEquip, itemsToEquip)).to.be.false;

        await arcadiansContracts.arcadiansFacet.transferFrom(namedAddresses.deployer, namedAddresses.alice, arcadianId);
        
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, slotsIdsToEquip, itemsToEquip)).to.be.true;

        equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal(0);
            expect(equippedItems[i].contractAddress).to.be.equal(ethers.constants.AddressZero);
            expect(await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, itemsToEquip[i]?.id)).to.be.equal(mintItemsAmount);
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
        expect(await itemsContracts.merkleFacet.merkleRoot()).to.be.equal(newMerkleRoot);
    })
})