// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import getDeployedContracts from "./utils/deployedContracts";
import util from 'util'
import { ItemSC, Slot, SlotSC, slotsPath } from "./0_formatLocalData";

let slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    let slotsSC: SlotSC[] = await getAllSlots(inventorySC);
    console.log("allSlots before: ", slotsSC.map((slot)=>{
        (slot.allowedItems as any) = slot.allowedItems.map((item: ItemSC)=>item.id)
        return slot;
    }));
    
    for (let i = 0; i < slotsAll.length; i++) {
        const slot = slotsAll[i];
        const matchingSlot = slotsSC.find((slot)=>slot.id == slot.id);
        if (!matchingSlot) {
            const allowedItems = slot.allowedItems.map((itemId):ItemSC=>({erc721Contract: itemsSC.address, id:itemId}))
            console.log("create slot: ", slot);
            let tx = await inventorySC.createSlot(slot.permanent, slot.category, allowedItems);
            await tx.wait();
        } else {
            const allowedItemsMissing = matchingSlot.allowedItems.filter((item: ItemSC)=>{
                return !slotsSC[i].allowedItems.some((item: ItemSC)=> {
                    return item.erc721Contract == item.erc721Contract && item.id == item.id
                })
            })
            console.log("slot " + slot.id + " is updated");
            if (allowedItemsMissing.length == 0) continue; 

            console.log("slot " + slot.id + " allowedItemsMissing: ", allowedItemsMissing);
            let tx = await inventorySC.allowItemsInSlot(slot.id, allowedItemsMissing);
            await tx.wait();
        }
    }
    slotsSC = await getAllSlots(inventorySC);
    console.log("allSlots after: ", slotsSC.map((slot)=>{
        (slot.allowedItems as any) = slot.allowedItems.map((item: ItemSC)=>item.id)
        return slot;
    }));
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
            category: slotSC.category,
            permanent: slotSC.category,
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
  