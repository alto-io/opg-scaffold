// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { BigNumber, ethers } from "ethers";
import getDeployedContracts from "./utils/deployedContracts";
import util from 'util'
import { Item, ItemSC, Slot, SlotSC, itemsPath, slotsPath } from "./utils/interfaces";

let slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());
const itemsAll: Item[] = JSON.parse(fs.readFileSync(itemsPath).toString());

const MAKE_TRANSACTION = false;
console.log("MAKE_TRANSACTION: ", MAKE_TRANSACTION);

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    let slotsSC: SlotSC[] = await getAllSlots(inventorySC, itemsSC);
    // console.log("slotsSC: ", slotsSC);
    
    // console.log("allSlots before: ", slotsSC.map((slot)=>{
    //     (slot.allowedItems as any) = slot.allowedItems.map((item: ItemSC)=>item.id)
    //     return slot;
    // }));

    // const itemsToDisallow = await getItemsToDisallow(inventorySC, itemsSC);
    // console.log("disallowItems: ", itemsToDisallow.map((item)=>item.id));
    // if (MAKE_TRANSACTION && itemsToDisallow.length > 0) {
    //     let tx = await inventorySC.disallowItems(itemsToDisallow);
    //     await tx.wait();
    // }
    
    for (let i = 0; i < slotsAll.length; i++) {
        const slot = slotsAll[i];
        const slotSC = slotsSC.find((slotSC)=>slotSC.id == slot.id);
        if (!slotSC) {
            const allowedItems = slot.allowedItems.map((itemId):ItemSC=>({erc1155Contract: itemsSC.address, id:itemId}))
            console.log("create slot: ", slot);
            if (MAKE_TRANSACTION) {
                let tx = await inventorySC.createSlot(slot.permanent, slot.isBase, allowedItems);
                await tx.wait();
            }
        } else {
            // setup missing allowed item ids
            const allowedItemsIdsMissing = slot.allowedItems
                .filter((itemId: number)=> !slotSC.allowedItems.some((itemSC: ItemSC)=>itemSC.id == itemId))

            const allowedItemsMissing: ItemSC[] = allowedItemsIdsMissing.map((itemId: number)=>({erc1155Contract: itemsSC.address, id: itemId}));

            if (allowedItemsMissing.length > 0) {
                console.log("-> slot " + slot.id + " allowedItemsMissing: ", allowedItemsMissing);
                if (MAKE_TRANSACTION) {
                    let tx = await inventorySC.allowItemsInSlot(slot.id, allowedItemsMissing);
                    await tx.wait();
                }
            } else {
                console.log("slot " + slot.id + " allowed slots is updated");
            }

            const allowedItemsIdsExtra = slotSC.allowedItems
                .filter((itemSC: ItemSC)=> !slot.allowedItems.some((itemId: number)=>itemSC.id == itemId))

            if (allowedItemsIdsExtra.length > 0) {
                console.log("-> slot " + slot.id + " allowedItemsIdsExtra: ", allowedItemsIdsExtra);
                if (MAKE_TRANSACTION) {
                    let tx = await inventorySC.disallowItems(allowedItemsIdsExtra);
                    await tx.wait();
                }
            }

            // Setup slot 'permanent' property
            if (slotSC.permanent != slot.permanent) {
                console.log("-> slot " + slot.id + " updating 'permanent' to ", slot.permanent);
                if (MAKE_TRANSACTION) {
                    let tx = await inventorySC.setSlotPermanent(slot.id, slot.permanent);
                    await tx.wait();
                }
        }

            // Setup slot 'isBase' property
            if (slotSC.isBase != slot.isBase) {
                
                console.log("-> slot " + slot.id + " updating 'isBase' to ", slot.isBase);
                if (MAKE_TRANSACTION) {
                    let tx = await inventorySC.setSlotBase(slot.id, slot.isBase);
                    await tx.wait();
                }
            }
        }
    }
    let baseSlotsIds = await inventorySC.getBaseSlotsIds();
    console.log("baseSlotsIds", baseSlotsIds)

    console.log("MAKE_TRANSACTION: ", MAKE_TRANSACTION);

    await checkAllowedSlotsIntegrity(inventorySC, itemsSC)
    // slotsSC = await getAllSlots(inventorySC, itemsSC);
    // console.log("allSlots after: ", slotsSC.map((slot)=>{
    //     (slot.allowedItems as any) = slot.allowedItems.map((item: ItemSC)=>item.id)
    //     return slot;
    // }));
}

async function getItemsToDisallow(inventorySC: ethers.Contract, itemsSC: ethers.Contract) {
    const itemsToDisallow: ItemSC[] = [];
    for (let i = 0; i < itemsAll.length; i++) {
        if (!itemsAll[i].slotId) {
            const itemSC = {erc1155Contract: itemsSC.address, id: itemsAll[i].id};
            const allowedSlot = (await inventorySC.allowedSlot(itemSC)).toNumber();
            if (allowedSlot > 0) {
                itemsToDisallow.push(itemSC);
            }
        }
    }
    return itemsToDisallow;
}

async function checkAllowedSlotsIntegrity(inventorySC: ethers.Contract, itemsSC: ethers.Contract) {
    for (let i = 0; i < itemsAll.length; i++) {
        const itemSC: ItemSC = {erc1155Contract: itemsSC.address, id: itemsAll[i].id}
        const allowedSlot = (await inventorySC.allowedSlot(itemSC)).toNumber();
        if (allowedSlot != itemsAll[i].slotId) {
            console.log("INCONSISTENT SLOT: item ", itemSC.id, " has slots id local ", itemsAll[i].slotId, " and SC ", allowedSlot);
        }
    }
}

async function getAllSlots(inventorySC: ethers.Contract, itemsSC: ethers.Contract) {
    let slotsSC: SlotSC[] = [];

    const numSlots = await inventorySC.numSlots();
    if (numSlots == 0) {
        return slotsSC;
    }

    // Initialize
    for (let i = 0; i < slotsAll.length; i++) {
        const slotId = slotsAll[i].id;
        let slotSC = await inventorySC.slot(slotId);
        console.log("slotSC: ", slotSC);
        
        
        let slot: SlotSC = {
            id: slotSC.id,
            isBase: slotSC.isBase,
            permanent: slotSC.permanent,
            allowedItems: []
        };
        slotsSC.push(slot);
    }

    // Get slot for each item
    const itemsToRemove: number[] = [];
    for (let i = 0; i < itemsAll.length; i++) {
        if (!itemsAll[i].slotId) {
            itemsToRemove.push(itemsAll[i].id);
        }
        const itemSC: ItemSC = {erc1155Contract: itemsSC.address, id: itemsAll[i].id}
        const allowedSlot = (await inventorySC.allowedSlot(itemSC)).toNumber();
        slotsSC = slotsSC.map((slot: SlotSC)=> {
            if (slot.id === allowedSlot) {
                slot.allowedItems.push(itemSC);
            }
            return slot;
        })
    }
    
    return slotsSC;
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  