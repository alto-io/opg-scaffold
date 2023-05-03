// import { ethers } from "ethers";
import fs from "fs";
import path from "path";

export enum SlotCategory { Base, Equippment, Cosmetic}
export interface Slot {
    id: number,
    name: string,
    permanent: boolean,
    category: SlotCategory,
    allowedItems: number[]
}
export interface SlotSC {
    id: number,
    permanent: boolean,
    category: SlotCategory,
    allowedItems: ItemSC[]
}
export interface Item {
    id: number,
    name: string,
    slotId: number,
    slotName: string,
    isBasic: boolean,
    amount: number
}
export interface ItemSC {
    erc721Contract: string,
    id: number
}

export const itemsPath = path.join(__dirname, "dataV2/items.json");
const itemsAll: Item[] = JSON.parse(fs.readFileSync(itemsPath).toString());
export const slotsPath = path.join(__dirname, "dataV2/slots.json");
let slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());

async function main() {

    // Add slot id field to each item
    for (let i = 0; i < itemsAll.length; i++) {
        const slot = slotsAll.find((s)=>s.name == itemsAll[i].slotName);
        if (slot) {
            itemsAll[i].slotId = slot.id;
        }
    }
    
    fs.writeFileSync(itemsPath, JSON.stringify(itemsAll));

    // setup allowed items for each slot
    let modified;
    for (let i = 0; i < itemsAll.length; i++) {
        const slotIndex = slotsAll.findIndex((slot)=>slot.id == itemsAll[i].slotId)
        if (!slotsAll[slotIndex].allowedItems.includes(itemsAll[i].id)) {
            slotsAll[slotIndex].allowedItems.push(itemsAll[i].id);
            modified = true;
        }
    }
    if (modified) {
        fs.writeFileSync(slotsPath, JSON.stringify(slotsAll));
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  