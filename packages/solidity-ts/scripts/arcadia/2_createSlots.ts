// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import getDeployedContracts from "./utils/deployedContracts";
import util from 'util'
import { ItemSC, Slot, SlotSC, slotsPath } from "./utils/interfaces";

let slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    let slotsSC: SlotSC[] = await getAllSlots(inventorySC);
    // console.log("allSlots before: ", slotsSC.map((slot)=>{
    //     (slot.allowedItems as any) = slot.allowedItems.map((item: ItemSC)=>item.id)
    //     return slot;
    // }));
    
    for (let i = 0; i < slotsAll.length; i++) {
        const slot = slotsAll[i];
        const slotSC = slotsSC.find((slotSC)=>slotSC.id == slot.id);
        if (!slotSC) {
            const allowedItems = slot.allowedItems.map((itemId):ItemSC=>({erc721Contract: itemsSC.address, id:itemId}))
            console.log("create slot: ", slot);
            let tx = await inventorySC.createSlot(slot.permanent, slot.isBase, allowedItems);
            await tx.wait();
        } else {
            // setup missing allowed item ids
            
            const allowedItemsIdsMissing = slot.allowedItems
                .filter((itemId: number)=> !slotSC.allowedItems.some((itemSC: ItemSC)=>itemSC.id == itemId))

            const allowedItemsMissing: ItemSC[] = allowedItemsIdsMissing.map((itemId: number)=>({erc721Contract: itemsSC.address, id: itemId}));

            if (allowedItemsMissing.length > 0) {
                console.log("-> slot " + slot.id + " allowedItemsMissing: ", allowedItemsMissing);
                let tx = await inventorySC.allowItemsInSlot(slot.id, allowedItemsMissing);
                await tx.wait();
            } else {
                console.log("slot " + slot.id + " allowed slots is updated");
            }

            const allowedItemsIdsExtra = slotSC.allowedItems
                .filter((itemSC: ItemSC)=> !slot.allowedItems.some((itemId: number)=>itemSC.id == itemId))

            if (allowedItemsIdsExtra.length > 0) {
                console.log("-> slot " + slot.id + " allowedItemsIdsExtra: ", allowedItemsIdsExtra);
                let tx = await inventorySC.disallowItemsInSlot(slot.id, allowedItemsIdsExtra);
                await tx.wait();
            }

            // Setup slot 'permanent' property
            if (slotSC.permanent != slot.permanent) {
                console.log("-> slot " + slot.id + " updating 'permanent' to ", slot.permanent);
                let tx = await inventorySC.setSlotPermanent(slot.id, slot.permanent);
                await tx.wait();
            }

            // Setup slot 'isBase' property
            if (slotSC.isBase != slot.isBase) {
                
                console.log("-> slot " + slot.id + " updating 'isBase' to ", slot.isBase);
                let tx = await inventorySC.setSlotBase(slot.id, slot.isBase);
                await tx.wait();
            }
        }
    }
    // slotsSC = await getAllSlots(inventorySC);
    // console.log("allSlots after: ", slotsSC.map((slot)=>{
    //     (slot.allowedItems as any) = slot.allowedItems.map((item: ItemSC)=>item.id)
    //     return slot;
    // }));
}
async function getAllSlots(inventorySC: ethers.Contract) {
    const slotsSC: SlotSC[] = [];
    const numSlots = await inventorySC.numSlots();
    
    for (let i = 0; i < numSlots; i++) {
        const slotId = i+1;
        let slotSC = await inventorySC.slot(slotId);
        const numAllowedItems = await inventorySC.numAllowedItems(slotId);
        const allowedItems: ItemSC[] = [];
        for (let j = 0; j < numAllowedItems; j++) {
            const allowedItemSC = await inventorySC.allowedItem(slotId, j);
            const allowedItem : ItemSC = { erc721Contract: allowedItemSC.erc721Contract, id: allowedItemSC.id.toNumber() }
            allowedItems.push(allowedItem);
        }
        
        let slot: SlotSC = {
            id: slotSC.id.toNumber(),
            isBase: slotSC.isBase,
            permanent: slotSC.permanent,
            allowedItems: allowedItems
        };
        slotsSC.push(slot);
    }
    return slotsSC;
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  