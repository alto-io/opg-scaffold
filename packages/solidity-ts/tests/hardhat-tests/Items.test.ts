import '~helpers/hardhat-imports';
import { BigNumber, ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';

import path from "path";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

import deployAndInitContractsFixture, { ItemTest, convertItemsSC } from './fixtures/deployAndInitContractsFixture';
import { baseItemURI } from 'deploy/hardhat-deploy/04.initItemsDiamond.deploy';
import { baseArcadianURI } from 'deploy/hardhat-deploy/03.initArcadiansDiamond.deploy';

export const TOKENS_PATH_ITEMS = path.join(__dirname, "../mocks/ownedItemsMock.json");

export interface Item {
    erc1155Contract: string,
    id: number
}

export interface Slot {
    permanent: boolean,
    isBase: boolean,
    id: number,
    itemsIdsAllowed: number[]
}

describe('Items Diamond Test', function () {
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const owner = await itemsContracts.diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })

    it('should be able to update inventory address', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        await itemsContracts.itemsFacet.setInventoryAddress(namedAddresses.deployer);
        const inventoryAddress = await itemsContracts.itemsFacet.getInventoryAddress();
        expect(inventoryAddress).to.be.equal(namedAddresses.deployer);
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

describe('Items Diamond Mint, equip and unequip items flow', function () {
    it('should be able to equip and unequip items from an arcadian', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items } = await loadFixture(deployAndInitContractsFixture);

        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            const allowedItems = items.filter((item: ItemTest) => slots[i].itemsIdsAllowed.includes((item.id)))
            const allowedItemsSC = convertItemsSC(allowedItems);
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].isBase, allowedItemsSC);
        }

        // mint arcadian
        const basicItems = items.filter((item: ItemTest)=>item.isBasic)
        let nonBasicItems = items.filter((item: ItemTest)=>!item.isBasic)
        let itemsToEquip = convertItemsSC(basicItems)

        await arcadiansContracts.arcadiansFacet.setPublicMintOpen(true);

        // mint balance
        const maxMintPerUser: BigNumber = await arcadiansContracts.arcadiansFacet.maxMintPerUser();
        let availableMints: BigNumber = await arcadiansContracts.arcadiansFacet.availableMints(bob.address);
        expect(availableMints).to.be.equal(maxMintPerUser);
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(0, itemsToEquip)).to.be.true;

        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})
        
        availableMints = await arcadiansContracts.arcadiansFacet.availableMints(bob.address);
        expect(availableMints).to.be.equal(maxMintPerUser.sub(1));
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as Item).id);
            expect(equippedItems[i].erc1155Contract).to.be.equal((itemsToEquip[i] as Item).erc1155Contract);
        }
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, itemsToEquip)).to.be.false;
        let arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        let expectedUri = baseArcadianURI + arcadianId;
        expect(arcadianUri).to.be.equal(expectedUri);
        const nonBaseSlotsIds = slots.filter((slot: Slot)=> !slot.isBase && !slot.permanent).map((slot: Slot)=>slot.id)
        
        await arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, nonBaseSlotsIds);
        
        expect(await arcadiansContracts.inventoryFacet.isArcadianUnique(arcadianId, itemsToEquip)).to.be.false;
        equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            const slot = slots.find((slot)=>slot.id == equippedItems[i].slotId);
            const isBaseOrPermanent = slot?.isBase || slot?.permanent;
            const item = items.find((item)=>item.id == equippedItems[i].itemId);
            expect(equippedItems[i].itemId).to.be.equal(isBaseOrPermanent ? item?.id : 0);
            expect(equippedItems[i].erc1155Contract).to.be.equal(isBaseOrPermanent ? item?.address : ethers.constants.AddressZero);
        }
        arcadianUri = await arcadiansContracts.arcadiansFacet.tokenURI(arcadianId)
        expectedUri = baseArcadianURI + arcadianId;
        expect(arcadianUri).to.be.equal(expectedUri);

        // re-equip base slots
        const itemsToReequip = basicItems.filter((item: ItemTest) => {
            const itemSlot = slots.find((slot:Slot)=>item.slotId == slot.id)
            return !itemSlot?.isBase && !itemSlot?.permanent
        });
        await arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, convertItemsSC(itemsToReequip));


        // re-equip non-base slots with non basic items
        const reequipSlots = slots.filter((slot)=>!slot.permanent);
        const baseSlots = reequipSlots.filter((slot)=>slot.isBase);
        const baseSlotsIds = baseSlots.map((slot)=>slot.id);
        const couponsAmounts = baseSlotsIds.map(()=>1);
        const itemsReequip: ItemTest[] = reequipSlots.map((slot)=> nonBasicItems.find((item)=>item.slotId == slot.id) as ItemTest);
        
        await arcadiansContracts.inventoryFacet.addBaseModifierCoupons(bob.address, baseSlotsIds, couponsAmounts);
        for (let i = 0; i < baseSlotsIds.length; i++) {
            expect(await arcadiansContracts.inventoryFacet.getBaseModifierCoupon(bob.address, baseSlotsIds[i])).
                to.be.equal(couponsAmounts[i])
        }
        
        const itemsToMint = itemsReequip.filter((item: ItemTest) => {
            const itemSlot = slots.find((slot:Slot)=>item.slotId == slot.id) as Slot
            return !itemSlot.isBase && !itemSlot.permanent
        });
        const itemsToMintIds = itemsToMint.map((item: ItemTest) => item.id)
        const itemsToMintAmount = itemsToMintIds.map(() => 1)
        await itemsContracts.itemsFacet.mintBatch(bob.address, itemsToMintIds, itemsToMintAmount);
        await arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, convertItemsSC(itemsReequip));

        for (let i = 0; i < baseSlotsIds.length; i++) {
            expect(await arcadiansContracts.inventoryFacet.getBaseModifierCoupon(bob.address, baseSlotsIds[i])).
                to.be.equal(couponsAmounts[i]-1)
        }
    })

    it('should trigger errors when equipping and unequipping an arcadian', async () => {
        
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items } = await loadFixture(deployAndInitContractsFixture);

        const bob = namedAccounts.bob;

        // create slot
        const badItem : Item = {erc1155Contract: bob.address, id: 2}
        await expect(arcadiansContracts.inventoryFacet.createSlot(slots[0].permanent, slots[0].isBase, [badItem])).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_InvalidERC1155Contract");

        for (let i = 0; i < slots.length; i++) {
            const allowedItems = items.filter((item: ItemTest) => slots[i].itemsIdsAllowed.includes((item.id)))
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].isBase, convertItemsSC(allowedItems));
        }

        // mint items
        await expect(itemsContracts.itemsFacet.safeTransferFrom(namedAddresses.alice, namedAddresses.bob, 1, 1, "0x00")).
            to.be.revertedWithCustomError(itemsContracts.itemsFacet, "ERC1155Base__NotOwnerOrApproved");
        
        const allItemsIds = items.map((item)=>item.id)
        await expect(itemsContracts.itemsFacet.connect(bob).mintBatch(bob.address, [], [])).
            to.be.revertedWithCustomError(itemsContracts.itemsFacet, "Roles_MissingManagerRole");

        // mint arcadian
        await arcadiansContracts.arcadiansFacet.setPublicMintOpen(true);

        const itemAmount = 2;
        const basicItems = items.filter((item: ItemTest)=>item.isBasic)
        const basicItemsIds = basicItems.map((item: ItemTest)=>item.id)
        const basicItemsAmounts = basicItemsIds.map(()=>itemAmount)
        let nonBasicItems = items.filter((item: ItemTest)=>!item.isBasic)
        let nonBasicItemsIds = nonBasicItems.map((item)=>item.id)
        const nonBasicItemsAmounts = nonBasicItemsIds.map(()=>itemAmount)
        let basicItemsSC = convertItemsSC(basicItems)
        let nonBasicItemsSC = convertItemsSC(nonBasicItems)

        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(basicItemsSC, {value: 0})).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_InvalidPayAmount")
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip([], {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_ItemNotSpecified")
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip([basicItemsSC[0]], {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_NotAllBaseSlotsEquipped")
            
        const itemsWithoutPermanent = basicItems.filter((item)=> {
            const slot = slots.find((slot)=>slot.id == item.slotId) as Slot;
            return !slot.permanent || slot.isBase;
        });
        
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(convertItemsSC(itemsWithoutPermanent), {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_NotAllBaseSlotsEquipped")
        await expect(arcadiansContracts.arcadiansFacet.mintAndEquip(nonBasicItemsSC, {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_InsufficientItemBalance")

        await itemsContracts.itemsFacet.mintBatch(bob.address, nonBasicItemsIds, nonBasicItemsAmounts);
            
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(nonBasicItemsSC.filter((v, i)=>i != 3), {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_NotAllBaseSlotsEquipped")
        await expect(arcadiansContracts.inventoryFacet.isArcadianUnique(0, basicItemsSC.filter((v, i)=>i != 3))).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_NotAllBaseSlotsEquipped")
            
        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(basicItemsSC, {value: arcadiansParams.mintPrice})
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(basicItemsSC, {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_ArcadianNotUnique")

            
        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        
        const slotsToUnequip = slots.filter((slot)=>!slot.isBase && !slot.permanent).map((slot)=>slot.id)
        const permanentSlots = slots.filter((slot)=>slot.permanent)
        const permanentSlotsIds = permanentSlots.map((slot)=>slot.id)
        await expect(arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, [permanentSlots[0].id])).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_UnequippingPermanentSlot")

        const nonPermanentBaseSlots = slots.filter((slot)=> !slot.permanent && slot.isBase)
        const nonPermanentBaseSlotsIds = nonPermanentBaseSlots.map((slot)=> slot.id)
        await expect(arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, nonPermanentBaseSlotsIds)).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_UnequippingBaseSlot")

        await arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, slotsToUnequip);
        await expect(arcadiansContracts.inventoryFacet.connect(bob).unequip(arcadianId, slotsToUnequip)).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_UnequippingEmptySlot")

        await expect(arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, basicItemsSC)).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_CouponNeededToModifyBaseSlots")

        const baseSlots = slots.filter((slot)=> slot.isBase)
        const baseSlotsIds = baseSlots.map((slot)=> slot.id)
        await expect(arcadiansContracts.inventoryFacet.addBaseModifierCoupons(bob.address, permanentSlotsIds, permanentSlotsIds.map(()=>1))).
            to.be.revertedWithCustomError(arcadiansContracts.inventoryFacet, "Inventory_NonBaseSlot")

        const couponsAmounts = nonPermanentBaseSlotsIds.map(()=>1);
        await arcadiansContracts.inventoryFacet.addBaseModifierCoupons(bob.address, nonPermanentBaseSlotsIds, couponsAmounts);
        
        await expect(arcadiansContracts.inventoryFacet.connect(bob).equip(arcadianId, [basicItemsSC[3]])).
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

    // TODO: IMPORTANT: ON PRODUCTION REVERT CHANGED ON ITEMS MERKLE CLAIM, TO AVOID INFINITE CLAIM
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