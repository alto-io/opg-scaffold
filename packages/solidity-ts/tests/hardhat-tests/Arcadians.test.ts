import '~helpers/hardhat-imports';
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import path from "path";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import deployAndInitContractsFixture, { ItemTest, convertItemsSC } from './fixtures/deployAndInitContractsFixture';
import { BigNumber, ethers } from 'ethers';
import { Item } from './Items.test';
import { SlotSC } from '~scripts/arcadia/utils/interfaces';

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
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items} = await loadFixture(deployAndInitContractsFixture);
        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            const allowedItems = items.filter((item: ItemTest) => slots[i].itemsIdsAllowed.includes((item.id)))
            const allowedItemsSC = convertItemsSC(allowedItems);
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].isBase, allowedItemsSC);
        }

        // mint items
        const basicItems = items.filter((item: ItemTest)=>item.isBasic)
        let itemsToEquip = convertItemsSC(basicItems)
        const itemsIdsToEquip = itemsToEquip.map(item=>item?.id);
        const itemAmount = 1;
        const itemsAmounts = itemsIdsToEquip.map(()=>itemAmount)

        await itemsContracts.itemsFacet.mintBatch(bob.address, itemsIdsToEquip, itemsAmounts);

        // mint balance
        const maxMintPerUser: BigNumber = await arcadiansContracts.arcadiansFacet.maxMintPerUser();
        let availableMints: BigNumber = await arcadiansContracts.arcadiansFacet.availableMints(bob.address);
        expect(availableMints).to.be.equal(maxMintPerUser);

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
        availableMints = await arcadiansContracts.arcadiansFacet.availableMints(bob.address);
        expect(availableMints).to.be.equal(maxMintPerUser.add(claimAmount));
        
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

        availableMints = await arcadiansContracts.arcadiansFacet.availableMints(bob.address);
        expect(availableMints).to.be.equal(maxMintPerUser);

        const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        for (let i = 0; i < equippedItems.length; i++) {
            expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as Item).id);
            expect(equippedItems[i].erc721Contract).to.be.equal((itemsToEquip[i] as Item).erc721Contract);
        }
    })

    it('should be able to mint in batch from the guaranteed pool', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items} = await loadFixture(deployAndInitContractsFixture);
        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            const allowedItems = items.filter((item: ItemTest) => slots[i].itemsIdsAllowed.includes((item.id)))
            const allowedItemsSC = convertItemsSC(allowedItems);
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].isBase, allowedItemsSC);
        }

        // mint items
        const basicItems = items.filter((item: ItemTest)=>item.isBasic)
        let itemsToEquip = convertItemsSC(basicItems)
        const itemsIdsToEquip = itemsToEquip.map(item=>item?.id);
        const itemAmount = 1;
        const itemsAmounts = itemsIdsToEquip.map(()=>itemAmount)

        const itemsToEquipAlice = convertItemsSC(slots.map(_slot=>items.findLast((_item)=>_item.slotId == _slot.id) as ItemTest));
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

        // for (let i = 0; i < claimers.length; i++) {
        //     expect(await arcadiansContracts.whitelistFacet.elegibleGuaranteedPool(claimers[i])).to.be.equal(claimAmounts[i]-1);
        //     expect(await arcadiansContracts.whitelistFacet.claimedGuaranteedPool(claimers[i])).to.be.equal(1);
        // }
        // const totalClaimed = claimers.length;
        // expect(await arcadiansContracts.whitelistFacet.totalElegibleGuaranteedPool()).to.be.equal(claimTotal-totalClaimed);
        // expect(await arcadiansContracts.whitelistFacet.totalClaimedGuaranteedPool()).to.be.equal(totalClaimed);

        // const balance = await arcadiansContracts.arcadiansFacet.balanceOf(bob.address)
        // const arcadianId = await arcadiansContracts.arcadiansFacet.tokenOfOwnerByIndex(bob.address, balance-1)
        // let equippedItems = await arcadiansContracts.inventoryFacet.equippedAll(arcadianId);
        // for (let i = 0; i < equippedItems.length; i++) {
        //     expect(equippedItems[i].itemId).to.be.equal((itemsToEquip[i] as Item).id);
        //     expect(equippedItems[i].erc721Contract).to.be.equal((itemsToEquip[i] as Item).erc721Contract);
        // }
    })

    it('should be able to mint from the restricted pool', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items} = await loadFixture(deployAndInitContractsFixture);
        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            const allowedItems = items.filter((item: ItemTest) => slots[i].id == item.slotId)
            const allowedItemsSC = convertItemsSC(allowedItems);
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].isBase, allowedItemsSC);
        }

        // mint items
        const basicItems = items.filter((item: ItemTest)=>item.isBasic)
        let itemsToEquip = convertItemsSC(basicItems)
        const itemsIdsToEquip = itemsToEquip.map(item=>item?.id);
        const itemAmount = 1;
        const itemsAmounts = itemsIdsToEquip.map(()=>itemAmount)

        await itemsContracts.itemsFacet.mintBatch(bob.address, itemsIdsToEquip, itemsAmounts);

        // add to whitelist
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice}))
            .to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_NotElegibleToMint")
        await arcadiansContracts.whitelistFacet.setClaimActiveRestrictedPool(true);
        expect(await arcadiansContracts.whitelistFacet.isClaimActiveRestrictedPool()).to.be.true;

        // mint balance
        const maxMintPerUser: BigNumber = await arcadiansContracts.arcadiansFacet.maxMintPerUser();
        let availableMints: BigNumber = await arcadiansContracts.arcadiansFacet.availableMints(bob.address);
        expect(availableMints).to.be.equal(maxMintPerUser);

        // increase elegible amount
        await expect(arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice}))
            .to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_NotElegibleToMint")
        const claimAmount = 1;
        
        await arcadiansContracts.whitelistFacet.increaseElegibleRestrictedPool(bob.address, claimAmount);
        expect(await arcadiansContracts.whitelistFacet.elegibleRestrictedPool(bob.address)).to.be.equal(claimAmount);
        expect(await arcadiansContracts.whitelistFacet.claimedRestrictedPool(bob.address)).to.be.equal(0);
        expect(await arcadiansContracts.whitelistFacet.totalElegibleRestrictedPool()).to.be.equal(claimAmount);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedRestrictedPool()).to.be.equal(0);

        availableMints = await arcadiansContracts.arcadiansFacet.availableMints(bob.address);
        expect(availableMints).to.be.equal(maxMintPerUser);

        // mint & equip arcadian
        await arcadiansContracts.arcadiansFacet.connect(bob).mintAndEquip(itemsToEquip, {value: arcadiansParams.mintPrice})

        availableMints = await arcadiansContracts.arcadiansFacet.availableMints(bob.address);
        expect(availableMints).to.be.equal(maxMintPerUser.sub(1));

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
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items} = await loadFixture(deployAndInitContractsFixture);
        const bob = namedAccounts.bob;

        // create slot
        for (let i = 0; i < slots.length; i++) {
            const allowedItems = items.filter((item: ItemTest) => slots[i].itemsIdsAllowed.includes((item.id)))
            const allowedItemsSC = convertItemsSC(allowedItems);
            await arcadiansContracts.inventoryFacet.createSlot(slots[i].permanent, slots[i].isBase, allowedItemsSC);
        }

        // mint items
        const basicItems = items.filter((item: ItemTest)=>item.isBasic)
        let itemsToEquip = convertItemsSC(basicItems)
        const itemsIdsToEquip = itemsToEquip.map(item=>item?.id);
        const itemAmount = 1;
        const itemsAmounts = itemsIdsToEquip.map(()=>itemAmount)

        const itemsToEquipAlice = convertItemsSC(slots.map(_slot=>items.findLast((_item)=>_item.slotId == _slot.id) as ItemTest));
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

describe('setup existent slots', function () {
    it('Should be able to switch the slot base and permanent properties', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items} = await loadFixture(deployAndInitContractsFixture);
        
        const slotId = slots[0].id;
        const allowedItems = convertItemsSC(items.filter((item: ItemTest) => slots[slotId].itemsIdsAllowed.includes((item.id))))
        await arcadiansContracts.inventoryFacet.createSlot(slots[slotId].permanent, slots[slotId].isBase, allowedItems);
        
        await arcadiansContracts.inventoryFacet.setSlotPermanent(slotId, false);
        await arcadiansContracts.inventoryFacet.setSlotBase(slotId, false);
        let slot: SlotSC = await arcadiansContracts.inventoryFacet.slot(slotId);
        expect(slot.isBase).to.be.false;
        expect(slot.permanent).to.be.false;

        await arcadiansContracts.inventoryFacet.setSlotPermanent(slotId, true);
        await arcadiansContracts.inventoryFacet.setSlotBase(slotId, true);
        slot = await arcadiansContracts.inventoryFacet.slot(slotId);
        expect(slot.isBase).to.be.true;
        expect(slot.permanent).to.be.true;
    })

    it('Should be able to allow and disallow items in slots', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, slots, items} = await loadFixture(deployAndInitContractsFixture);
        
        const slotId = slots[0].id;
        const slotId2 = slots[1].id;
        const allowedItems = convertItemsSC(items.filter((item: ItemTest) => slots[slotId].itemsIdsAllowed.includes((item.id))))
        await arcadiansContracts.inventoryFacet.createSlot(slots[slotId].permanent, slots[slotId].isBase, allowedItems);
        await arcadiansContracts.inventoryFacet.createSlot(slots[slotId].permanent, slots[slotId].isBase, []);
        for (let i = 0; i < allowedItems.length; i++) {
            let allowedSlotId: number = await arcadiansContracts.inventoryFacet.allowedSlot(allowedItems[i]);
            expect(allowedSlotId).to.be.equal(slotId)
        }

        await arcadiansContracts.inventoryFacet.disallowItems(allowedItems);
        for (let i = 0; i < allowedItems.length; i++) {
            let allowedSlotId: number = await arcadiansContracts.inventoryFacet.allowedSlot(allowedItems[i]);
            expect(allowedSlotId).to.be.equal(0)
        }

        await arcadiansContracts.inventoryFacet.allowItemsInSlot(slotId, allowedItems);
        for (let i = 0; i < allowedItems.length; i++) {
            let allowedSlotId: number = await arcadiansContracts.inventoryFacet.allowedSlot(allowedItems[i]);
            expect(allowedSlotId).to.be.equal(slotId)
        }

        await arcadiansContracts.inventoryFacet.allowItemsInSlot(slotId2, allowedItems);
        for (let i = 0; i < allowedItems.length; i++) {
            expect(await arcadiansContracts.inventoryFacet.allowedSlot(allowedItems[i])).to.be.equal(slotId2)
        }
    })
})

describe('mint restrictions', function () {
    it('Should be able to open and close public mint', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        
        await arcadiansContracts.arcadiansFacet.setPublicMintOpen(false);
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
        
        await arcadiansContracts.arcadiansFacet.setPublicMintOpen(true)
        await arcadiansContracts.arcadiansFacet.setMaxMintPerUser(0)
        
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.bob).mintAndEquip([], {value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_MaximumMintedArcadiansPerUserReached");
    })
})