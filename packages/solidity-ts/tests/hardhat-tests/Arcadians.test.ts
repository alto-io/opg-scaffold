import '~helpers/hardhat-imports';
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import path from "path";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import deployAndInitContractsFixture from './fixtures/deployAndInitContractsFixture';
import { ethers } from 'ethers';
import { Item } from './Items.test';

export const TOKENS_PATH_ARCADIANS = path.join(__dirname, "../mocks/ownedArcadiansMock.json");

describe('Arcadians Diamond Test', function () {
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const owner = await arcadiansContracts.diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })
})

describe('Arcadians Diamond BaseUri Test', function () {
    it('should be able to set base URI', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const newBaseURI = "newbaseuri.io/";
        await arcadiansContracts.arcadiansFacet.setBaseURI(newBaseURI);
        expect(await arcadiansContracts.arcadiansFacet.baseURI()).to.be.equal(newBaseURI);
    })
})

describe('Arcadians Diamond whitelist', function () {
    it('should be able to mint from the guaranteed pool', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items, basicItemsIds } = await loadFixture(deployAndInitContractsFixture);
        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].category, items.filter((item)=> slots[i].itemsIdsAllowed?.includes(item.id)));
        }

        // mint items
        let slotsIdsToEquip = slots.map(slot=>slot.id);
        const itemsToEquip = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[0]));
        const itemsIdsToEquip = itemsToEquip.map(item=>item?.id);
        const itemAmount = 1;
        const itemsAmounts = itemsIdsToEquip.map(()=>itemAmount)

        await itemsContracts.itemsFacet.mintBatch(bob.address, itemsIdsToEquip, itemsAmounts);

        // add to whitelist
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice}))
            .to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_NotElegibleToMint")
        await arcadiansContracts.whitelistFacet.setClaimActiveGuaranteedPool(true);
        expect(await arcadiansContracts.whitelistFacet.isClaimActiveGuaranteedPool()).to.be.true;

        // increase elegible amount
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice}))
            .to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_NotElegibleToMint")
        const claimAmount = 1;
        await arcadiansContracts.whitelistFacet.increaseElegibleGuaranteedPool(bob.address, claimAmount);
        expect(await arcadiansContracts.whitelistFacet.elegibleGuaranteedPool(bob.address)).to.be.equal(claimAmount);
        expect(await arcadiansContracts.whitelistFacet.claimedGuaranteedPool(bob.address)).to.be.equal(0);
        expect(await arcadiansContracts.whitelistFacet.totalElegibleGuaranteedPool()).to.be.equal(claimAmount);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedGuaranteedPool()).to.be.equal(0);

        // mint & equip arcadian
        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})

        expect(await arcadiansContracts.whitelistFacet.elegibleGuaranteedPool(bob.address)).to.be.equal(claimAmount-1);
        expect(await arcadiansContracts.whitelistFacet.claimedGuaranteedPool(bob.address)).to.be.equal(claimAmount);
        expect(await arcadiansContracts.whitelistFacet.totalElegibleGuaranteedPool()).to.be.equal(claimAmount-1);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedGuaranteedPool()).to.be.equal(claimAmount);

        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as Item).id);
            expect(equippedItems[i].erc721Contract).to.be.equal((itemsToEquip[i] as Item).erc721Contract);
        }
    })

    it('should be able to mint in batch from the guaranteed pool', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items, basicItemsIds } = await loadFixture(deployAndInitContractsFixture);
        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].category, items.filter((item)=> slots[i].itemsIdsAllowed?.includes(item.id)));
        }

        // mint items
        let slotsIdsToEquip = slots.map(slot=>slot.id);
        const itemsToEquip = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[0]));
        const itemsIdsToEquip = itemsToEquip.map(item=>item?.id);
        const itemAmount = 1;
        const itemsAmounts = itemsIdsToEquip.map(()=>itemAmount)

        const itemsToEquipAlice = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[1]));
        const itemsIdsToEquipAlice = itemsToEquipAlice.map(item=>item?.id);
        const itemsAmountsAlice = itemsIdsToEquipAlice.map(()=>itemAmount)

        const claimers = [bob.address, namedAddresses.alice]
        const claimAmounts = [1, 2]
        
        await itemsContracts.itemsFacet.mintBatch(bob.address, itemsIdsToEquip, itemsAmounts);
        await itemsContracts.itemsFacet.mintBatch(namedAddresses.alice, itemsIdsToEquipAlice, itemsAmountsAlice);

        // add to whitelist
        await arcadiansContracts.whitelistFacet.setClaimActiveGuaranteedPool(true);

        // increase elegible amount
        await arcadiansContracts.whitelistFacet.increaseElegibleGuaranteedPoolBatch(claimers, claimAmounts);
        for (let i = 0; i < claimers.length; i++) {
            expect(await arcadiansContracts.whitelistFacet.elegibleGuaranteedPool(claimers[i])).to.be.equal(claimAmounts[i]);
            expect(await arcadiansContracts.whitelistFacet.claimedGuaranteedPool(claimers[i])).to.be.equal(0);
        }
        const claimTotal = claimAmounts.reduce((acc, amount)=> acc+amount, 0)
        expect(await arcadiansContracts.whitelistFacet.totalElegibleGuaranteedPool()).to.be.equal(claimTotal);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedGuaranteedPool()).to.be.equal(0);

        // mint & equip arcadian
        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})
        await arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).mintAndEquip(itemsToEquipAlice, {value: arcadiansParams.mintPrice})

        for (let i = 0; i < claimers.length; i++) {
            expect(await arcadiansContracts.whitelistFacet.elegibleGuaranteedPool(claimers[i])).to.be.equal(claimAmounts[i]-1);
            expect(await arcadiansContracts.whitelistFacet.claimedGuaranteedPool(claimers[i])).to.be.equal(1);
        }
        const totalClaimed = claimers.length;
        expect(await arcadiansContracts.whitelistFacet.totalElegibleGuaranteedPool()).to.be.equal(claimTotal-totalClaimed);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedGuaranteedPool()).to.be.equal(totalClaimed);

        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as Item).id);
            expect(equippedItems[i].erc721Contract).to.be.equal((itemsToEquip[i] as Item).erc721Contract);
        }
    })

    it('should be able to mint from the restricted pool', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items, basicItemsIds } = await loadFixture(deployAndInitContractsFixture);
        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].category, items.filter((item)=> slots[i].itemsIdsAllowed?.includes(item.id)));
        }

        // mint items
        let slotsIdsToEquip = slots.map(slot=>slot.id);
        const itemsToEquip = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[0]));
        const itemsIdsToEquip = itemsToEquip.map(item=>item?.id);
        const itemAmount = 1;
        const itemsAmounts = itemsIdsToEquip.map(()=>itemAmount)

        await itemsContracts.itemsFacet.mintBatch(bob.address, itemsIdsToEquip, itemsAmounts);

        // add to whitelist
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice}))
            .to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_NotElegibleToMint")
        await arcadiansContracts.whitelistFacet.setClaimActiveRestrictedPool(true);
        expect(await arcadiansContracts.whitelistFacet.isClaimActiveRestrictedPool()).to.be.true;

        // increase elegible amount
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice}))
            .to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_NotElegibleToMint")
        const claimAmount = 1;
        await arcadiansContracts.whitelistFacet.increaseElegibleRestrictedPool(bob.address, claimAmount);
        expect(await arcadiansContracts.whitelistFacet.elegibleRestrictedPool(bob.address)).to.be.equal(claimAmount);
        expect(await arcadiansContracts.whitelistFacet.claimedRestrictedPool(bob.address)).to.be.equal(0);
        expect(await arcadiansContracts.whitelistFacet.totalElegibleRestrictedPool()).to.be.equal(claimAmount);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedRestrictedPool()).to.be.equal(0);

        // mint & equip arcadian
        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})

        expect(await arcadiansContracts.whitelistFacet.elegibleRestrictedPool(bob.address)).to.be.equal(claimAmount-1);
        expect(await arcadiansContracts.whitelistFacet.claimedRestrictedPool(bob.address)).to.be.equal(claimAmount);
        expect(await arcadiansContracts.whitelistFacet.totalElegibleRestrictedPool()).to.be.equal(claimAmount-1);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedRestrictedPool()).to.be.equal(claimAmount);

        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as Item).id);
            expect(equippedItems[i].erc721Contract).to.be.equal((itemsToEquip[i] as Item).erc721Contract);
        }
    })

    it('should be able to mint in batch from the restricted pool', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items, basicItemsIds } = await loadFixture(deployAndInitContractsFixture);
        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].category, items.filter((item)=> slots[i].itemsIdsAllowed?.includes(item.id)));
        }

        // mint items
        let slotsIdsToEquip = slots.map(slot=>slot.id);
        const itemsToEquip = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[0]));
        const itemsIdsToEquip = itemsToEquip.map(item=>item?.id);
        const itemAmount = 1;
        const itemsAmounts = itemsIdsToEquip.map(()=>itemAmount)

        const itemsToEquipAlice = slots.map(_slot=>items.find((_item)=>_item.id == _slot.itemsIdsAllowed[1]));
        const itemsIdsToEquipAlice = itemsToEquipAlice.map(item=>item?.id);
        const itemsAmountsAlice = itemsIdsToEquipAlice.map(()=>itemAmount)

        const claimers = [bob.address, namedAddresses.alice]
        const claimAmounts = [1, 2]
        
        await itemsContracts.itemsFacet.mintBatch(bob.address, itemsIdsToEquip, itemsAmounts);
        await itemsContracts.itemsFacet.mintBatch(namedAddresses.alice, itemsIdsToEquipAlice, itemsAmountsAlice);

        // add to whitelist
        await arcadiansContracts.whitelistFacet.setClaimActiveRestrictedPool(true);

        // increase elegible amount
        await arcadiansContracts.whitelistFacet.increaseElegibleRestrictedPoolBatch(claimers, claimAmounts);
        for (let i = 0; i < claimers.length; i++) {
            expect(await arcadiansContracts.whitelistFacet.elegibleRestrictedPool(claimers[i])).to.be.equal(claimAmounts[i]);
            expect(await arcadiansContracts.whitelistFacet.claimedRestrictedPool(claimers[i])).to.be.equal(0);
        }
        const claimTotal = claimAmounts.reduce((acc, amount)=> acc+amount, 0)
        expect(await arcadiansContracts.whitelistFacet.totalElegibleRestrictedPool()).to.be.equal(claimTotal);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedRestrictedPool()).to.be.equal(0);

        // mint & equip arcadian
        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})
        await arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).mintAndEquip(itemsToEquipAlice, {value: arcadiansParams.mintPrice})

        for (let i = 0; i < claimers.length; i++) {
            expect(await arcadiansContracts.whitelistFacet.elegibleRestrictedPool(claimers[i])).to.be.equal(claimAmounts[i]-1);
            expect(await arcadiansContracts.whitelistFacet.claimedRestrictedPool(claimers[i])).to.be.equal(1);
        }
        const totalClaimed = claimers.length;
        expect(await arcadiansContracts.whitelistFacet.totalElegibleRestrictedPool()).to.be.equal(claimTotal-totalClaimed);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedRestrictedPool()).to.be.equal(totalClaimed);

        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as Item).id);
            expect(equippedItems[i].erc721Contract).to.be.equal((itemsToEquip[i] as Item).erc721Contract);
        }
    })
})

describe('mint restrictions', function () {
    it('Should be able to open and close public mint', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        
        await arcadiansContracts.arcadiansFacet.closePublicMint();
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).mintAndEquip([], {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_NotElegibleToMint")
    })

    it('Should be able to update mint price', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        
        const newMintPrice = arcadiansParams.mintPrice + 1;
        await arcadiansContracts.arcadiansFacet.setMintPrice(newMintPrice);
        expect(await arcadiansContracts.arcadiansFacet.mintPrice()).to.be.equal(newMintPrice);
    })

    // To run this test, the value MAX_SUPPLY should be updated in the 
    // contract to a smaller value (ie. 1)
    // it('Should be able to mint only until the max supply is reached ', async () => {
    //     const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
    //     const maxSupply = await arcadiansContracts.arcadiansFacet.maxSupply();
    //     console.log("maxSupply: ", maxSupply);
    //     await arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).mint({value: arcadiansParams.mintPrice});
    //     await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).mint({value: arcadiansParams.mintPrice})).to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_MaximumArcadiansSupplyReached")
    // })
})

describe('mint max limit per user', function () {
    
    it('Should be able to update max mint limit ', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const currentMaxLimit = await arcadiansContracts.arcadiansFacet.maxMintPerUser();
        const newMaxLimit = Number(currentMaxLimit) + 1;
        await arcadiansContracts.arcadiansFacet.setMaxMintPerUser(newMaxLimit)
        expect(await arcadiansContracts.arcadiansFacet.maxMintPerUser()).to.be.equal(newMaxLimit)
    })
    
    it('Should be able to mint before reaching max limit', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        
        await arcadiansContracts.arcadiansFacet.openPublicMint()
        await arcadiansContracts.arcadiansFacet.setMaxMintPerUser(0)
        
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.bob).mintAndEquip([], {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_MaximumMintedArcadiansPerUserReached");
    })
});