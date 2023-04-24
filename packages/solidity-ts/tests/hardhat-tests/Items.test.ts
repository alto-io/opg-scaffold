import '~helpers/hardhat-imports';
import { BigNumber, ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';

import path from "path";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import deployAndInitContractsFixture from './fixtures/deployAndInitContractsFixture';
import { baseItemURI } from 'deploy/hardhat-deploy/04.initItemsDiamond.deploy';
import { baseArcadianURI } from 'deploy/hardhat-deploy/03.initArcadiansDiamond.deploy';
import { parseEther } from '@ethersproject/units';

export const TOKENS_PATH_ITEMS = path.join(__dirname, "../mocks/ownedItemsMock.json");

export interface Item {
    erc721Contract: string,
    id: number
}

export enum SlotCategory { Base, Equippment, Cosmetic }
export interface Slot {
    permanent: boolean,
    category: SlotCategory,
    id: number,
    itemsIdsAllowed: number[]
}

describe('Items Diamond Test', function () {
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const owner = await itemsContracts.diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })

    it('should be able to migrate to ipfs', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const tokenId = 1;
        await itemsContracts.itemsFacet.mint(namedAddresses.deployer, tokenId, 1);
        let uri = await itemsContracts.itemsFacet.uri(tokenId);
        expect(uri).to.be.equal(baseItemURI + tokenId);

        // migrate to ipfs
        const ipfsUri = "ipfsUri/";
        await itemsContracts.itemsFacet.migrateToIPFS(ipfsUri, true);
        uri = await itemsContracts.itemsFacet.uri(tokenId);
        expect(uri).to.be.equal(ipfsUri + tokenId + ".json");

        // migrate out of ipfs
        await itemsContracts.itemsFacet.migrateToIPFS(baseItemURI, false);
        uri = await itemsContracts.itemsFacet.uri(tokenId);
        expect(uri).to.be.equal(baseItemURI + tokenId);
    })

    it('should be able to claim items if whitelisted', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        const elegibleAmount = 10;
        const tokenId = 1;

        let balance = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, tokenId);
        expect(balance).to.be.equal(0);

        await expect(itemsContracts.itemsFacet.claimWhitelist([tokenId], [elegibleAmount])).
            to.be.revertedWithCustomError(arcadiansContracts.whitelistFacet, "Whitelist_ClaimInactive");
        await itemsContracts.whitelistFacet.setClaimActiveGuaranteedPool(true);
        await expect(itemsContracts.itemsFacet.claimWhitelist([tokenId], [elegibleAmount])).
            to.be.revertedWithCustomError(arcadiansContracts.whitelistFacet, "Whitelist_ExceedsElegibleAmount");

        await itemsContracts.whitelistFacet.increaseElegibleGuaranteedPool(namedAddresses.deployer, elegibleAmount);
        expect(await itemsContracts.whitelistFacet.claimedGuaranteedPool(namedAddresses.deployer)).to.be.equal(0);
        expect(await itemsContracts.whitelistFacet.elegibleGuaranteedPool(namedAddresses.deployer)).to.be.equal(elegibleAmount);
        expect(await itemsContracts.whitelistFacet.totalClaimedGuaranteedPool()).to.be.equal(0);
        expect(await itemsContracts.whitelistFacet.totalElegibleGuaranteedPool()).to.be.equal(elegibleAmount);

        await itemsContracts.itemsFacet.claimWhitelist([tokenId], [elegibleAmount]);
        
        expect(await itemsContracts.whitelistFacet.claimedGuaranteedPool(namedAddresses.deployer)).to.be.equal(elegibleAmount);
        expect(await itemsContracts.whitelistFacet.elegibleGuaranteedPool(namedAddresses.deployer)).to.be.equal(0);
        balance = await itemsContracts.itemsFacet.balanceOf(namedAddresses.deployer, tokenId);
        expect(balance).to.be.equal(elegibleAmount);
        expect(await itemsContracts.whitelistFacet.totalClaimedGuaranteedPool()).to.be.equal(elegibleAmount);
        expect(await itemsContracts.whitelistFacet.totalElegibleGuaranteedPool()).to.be.equal(0);
    })
})


describe('Items basic items tests', function () {
    it('non-deployer should be able to mint basic item', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, basicItemsIds } = await loadFixture(deployAndInitContractsFixture);

        const itemId = basicItemsIds[0];
        const amount = 2;
        await itemsContracts.itemsFacet.connect(namedAccounts.bob).mint(namedAddresses.bob, basicItemsIds[0], amount);
        expect(await itemsContracts.itemsFacet.balanceOf(namedAddresses.bob, itemId)).to.be.equal(amount);
    });

    it('non-deployer should be able to mint basic items in batch', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, basicItemsIds } = await loadFixture(deployAndInitContractsFixture);

        const basicItemAmounts = basicItemsIds.map((id, i)=>i % 2 + 1)

        await expect(itemsContracts.itemsFacet.setBasicBatch(basicItemsIds, basicItemsIds.map((id)=>true))).
            to.be.revertedWithCustomError(itemsContracts.itemsFacet, "Items_ItemsBasicStatusAlreadyUpdated");

        let basicItems = (await itemsContracts.itemsFacet.basicItems()).map((itemId: BigNumber)=> itemId.toNumber());
        expect(basicItems).to.be.eql(basicItemsIds);

        await itemsContracts.itemsFacet.connect(namedAccounts.bob).mintBatch(namedAddresses.bob, basicItemsIds, basicItemAmounts);
        const accounts = basicItemsIds.map(()=>namedAddresses.bob)
        const balanceBatch = (await itemsContracts.itemsFacet.balanceOfBatch(accounts, basicItemsIds)).map((itemId: BigNumber)=> itemId.toNumber());
        expect(balanceBatch).to.be.eql(basicItemAmounts);

        await itemsContracts.itemsFacet.setBasicBatch(basicItemsIds, basicItemsIds.map((id)=>false));
        basicItems = (await itemsContracts.itemsFacet.basicItems()).map((itemId: BigNumber)=> itemId.toNumber());
        expect(basicItems).to.be.eql([]);
    });
});

describe('Items Diamond Mint, equip and unequip items flow', function () {
    it('should be able to equip and unequip items from an arcadian', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items, basicItemsIds } = await loadFixture(deployAndInitContractsFixture);

        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].category, items.filter((item)=> slots[i].itemsIdsAllowed?.includes(item.id)));
        }

        // mint items
        const itemAmount = 1;
        const basicItems = items.filter((item)=>basicItemsIds.includes(item.id))
        const basicItemsAmounts = basicItemsIds.map(()=>itemAmount)
        const approvalEncoded = itemsContracts.itemsFacet.interface.encodeFunctionData("setApprovalForAll", [arcadiansContracts.inventoryFacet.address, true]);
        const mintEncoded = itemsContracts.itemsFacet.interface.encodeFunctionData("mintBatch", [bob.address, basicItemsIds, basicItemsAmounts]);
        await itemsContracts.itemsFacet.connect(bob).multicall([approvalEncoded, mintEncoded]);
        
        // mint arcadian
        let nonBasicItems = items.filter((item)=>!basicItemsIds.includes(item.id))
        let nonBasicItemsIds = nonBasicItems.map((item)=>item.id)
        let nonBasicItemsAmounts = nonBasicItemsIds.map(()=>itemAmount)
        
        await itemsContracts.itemsFacet.mintBatch(bob.address, nonBasicItemsIds, nonBasicItemsAmounts);
        
        let slotsIdsToEquip = slots.map(slot=>slot.id);
        let itemsToEquip = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[0]));

        await arcadiansContracts.arcadiansFacet.openPublicMint();

        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(0, itemsToEquip)).to.be.true;
        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)

        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as Item).id);
            expect(equippedItems[i].erc721Contract).to.be.equal((itemsToEquip[i] as Item).erc721Contract);
        }
        
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, itemsToEquip)).to.be.false;

        let arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        let expectedUri = baseArcadianURI + arcadianId;
        expect(arcadianUri).to.be.equal(expectedUri);
        
        const nonBaseSlotsIds = slots.reduce((acc: number[], slot: Slot)=>{
            if (slot.category != SlotCategory.Base) {
                acc.push(slot.id);
            }
            return acc;
        }, []);
        await arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, nonBaseSlotsIds);
        
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, itemsToEquip)).to.be.false;
        
        equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            const isBaseSlot = slots.find((slot)=>slot.id == equippedItems[i].slotId)?.category == SlotCategory.Base;
            const item = items.find((item)=>item.id == equippedItems[i].itemId);
            expect(equippedItems[i].itemId).to.be.equal(isBaseSlot ? item?.id : 0);
            expect(equippedItems[i].erc721Contract).to.be.equal(isBaseSlot ? item?.erc721Contract : ethers.constants.AddressZero);
        }

        arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        expectedUri = baseArcadianURI + arcadianId;
        expect(arcadianUri).to.be.equal(expectedUri);
        
        const slotsIdsToReequip = [];
        const itemsToReequip = [];
        for (let i = 0; i < slotsIdsToEquip.length; i++) {
            const slotId = slotsIdsToEquip[i];
            if (nonBaseSlotsIds.includes(slotId)) {
                slotsIdsToReequip.push(slotId);
                itemsToReequip.push(itemsToEquip[i])
            }
        }
        await arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, itemsToReequip);

        // modify base slots
        const baseSlots = slots.filter((slot)=>slot.category == SlotCategory.Base && !slot.permanent)
        const baseSlotsIds = baseSlots.map((slot)=>slot.id);
        const ticketsAmounts = baseSlots.map(()=>itemAmount);
        const itemsBaseSlots = baseSlots.map(slot=>items.find((item)=>item.id == slot.itemsIdsAllowed[1]));

        await arcadiansContracts.inventoryFacet.addBaseModifierTickets(bob.address, baseSlotsIds, ticketsAmounts);
        await arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, itemsBaseSlots);
    })

    it('should trigger errors when equipping and unequipping an arcadian', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items, basicItemsIds } = await loadFixture(deployAndInitContractsFixture);

        const bob = namedAccounts.bob;

        // create slot
        const badItem : Item = {erc721Contract: bob.address, id: 2}
        await expect(arcadiansContracts.inventoryFacet.createSlot(slots[0].permanent, slots[0].category, [badItem])).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_InvalidERC1155Contract");

        for (let i = 0; i < slots.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].category, items.filter((item)=> slots[i].itemsIdsAllowed?.includes(item.id)));
        }

        // mint items
        const itemAmount = 2;
        const basicItems = items.filter((item)=>basicItemsIds.includes(item.id))
        const basicItemsAmounts = basicItemsIds.map(()=>itemAmount)
        await itemsContracts.itemsFacet.connect(bob).setApprovalForAll(arcadiansContracts.inventoryFacet.address, true);
        const excessAmounts = basicItemsAmounts.map(()=>4)
        await expect(itemsContracts.itemsFacet.connect(bob).mintBatch(bob.address, basicItemsIds, excessAmounts)).
            to.be.revertedWithCustomError(itemsContracts.itemsFacet, "Items_MaximumItemMintsExceeded");
        const allItemsIds = items.map((item)=>item.id)
        await expect(itemsContracts.itemsFacet.connect(bob).mintBatch(bob.address, allItemsIds, basicItemsAmounts)).
            to.be.revertedWithCustomError(itemsContracts.itemsFacet, "Items_MintingNonBasicItem");
        await itemsContracts.itemsFacet.connect(bob).mintBatch(bob.address, basicItemsIds, basicItemsAmounts);

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.openPublicMint();
        let nonBasicItems = items.filter((item)=>!basicItemsIds.includes(item.id))
        
        let nonBasicItemsIds = nonBasicItems.map((item)=>item.id)
        let nonBasicItemsAmounts = nonBasicItemsIds.map(()=>itemAmount)
        
        await itemsContracts.itemsFacet.mintBatch(bob.address, nonBasicItemsIds, nonBasicItemsAmounts);
        
        let slotsIdsToEquip = slots.map(slot=>slot.id);
        let itemsToEquip = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[0]));

        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: 0})).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_InvalidPayAmount")
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip([], {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_ItemNotSpecified")
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip([itemsToEquip[0]], {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_NotAllBaseSlotsEquipped")
            await expect(arcadiansContracts.arcadiansFacet.mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_InsufficientItemBalance")
            await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip.slice(0, 1), {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_NotAllBaseSlotsEquipped")
            
        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_ArcadianNotUnique")

        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        
        const nonBaseSlotsIds = slots.filter((slot)=>slot.category != SlotCategory.Base).map((slot)=>slot.id)
        const permanentSlots = slots.filter((slot)=>slot.permanent)
        const permanentSlotsIds = permanentSlots.map((slot)=>slot.id)
        await expect(arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, [permanentSlots[0].id])).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_UnequippingPermanentSlot")
        const baseSlotsIds = slots.filter((slot)=>slot.category == SlotCategory.Base && !permanentSlotsIds.includes(slot.id)).map((slot)=>slot.id)
        const nonPermanentBaseSlotsIds = baseSlotsIds.filter((slotId)=>!permanentSlotsIds.includes(slotId))
        await expect(arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, nonPermanentBaseSlotsIds)).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_UnequippingBaseSlot")

        await arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, nonBaseSlotsIds);
        await expect(arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, nonBaseSlotsIds)).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_UnequippingEmptySlot")
        
        const itemsToReequip = [];
        for (let i = 0; i < slotsIdsToEquip.length; i++) {
            const slotId = slotsIdsToEquip[i];
            if (nonBaseSlotsIds.includes(slotId)) {
                itemsToReequip.push(itemsToEquip[i])
            }
        }

        await expect(arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, itemsToEquip)).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_TicketNeededToModifyBaseSlots")
            
        await arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, itemsToReequip.slice(0,1));
        
        await expect(arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, itemsToReequip.slice(0,1))).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_ItemAlreadyEquippedInSlot")
    })
})

describe('Items Diamond merkle Test', function () {

    it('should not be able to claim tokens if not elegible', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = itemsParams.merkleGenerator.generateProofs(namedAddresses.deployer);
        
        await expect(itemsContracts.itemsFacet.connect(namedAccounts.alice).claimMerkleBatch(ids, amounts, proofs)).
            to.be.revertedWithCustomError(itemsContracts.merkleFacet, "Merkle_NotIncludedInMerkleTree");
    })

    it('should not be able to claim tokens if token data is wrong', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const ids = [1, 2];
        const badAmounts = [3, 2];
        const proofs = itemsParams.merkleGenerator.generateProofs(namedAddresses.deployer);
        await expect(itemsContracts.itemsFacet.connect(namedAccounts.deployer).claimMerkleBatch(ids, badAmounts, proofs)).
            to.be.revertedWithCustomError(itemsContracts.merkleFacet, "Merkle_NotIncludedInMerkleTree");
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
            expect(await itemsContracts.itemsFacet.claimedAmount(namedAddresses.deployer, ids[i])).to.be.equal(amounts[i]);
        }
    })

    it('should not able to claim the same tokens twice', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = itemsParams.merkleGenerator.generateProofs(namedAddresses.deployer);
        await itemsContracts.itemsFacet.claimMerkleBatch(ids, amounts, proofs)
        await expect(itemsContracts.itemsFacet.claimMerkleBatch(ids, amounts, proofs)).
            to.be.revertedWithCustomError(itemsContracts.merkleFacet, "Merkle_AlreadyClaimed");
    })

    it('should be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        await itemsContracts.merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await itemsContracts.merkleFacet.merkleRoot()).to.be.equal(newMerkleRoot);
    })
})