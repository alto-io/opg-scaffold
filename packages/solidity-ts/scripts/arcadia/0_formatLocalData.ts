// import { ethers } from "ethers";
import fs from "fs";
import path from "path";

export interface Slot {
    id: number,
    name: string,
    permanent: boolean,
    isBase: boolean,
    allowedItems: number[]
}
export interface SlotSC {
    id: number,
    permanent: boolean,
    isBase: boolean,
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

export interface ClaimableItems {
    owner: string,
    nameV1: string,
    nameV2: string,
    idV2: number,
    amount: number,
    slot: string
}
export interface ClaimableItemsObj {
    [owner: string]: ClaimableItems[]
}

export const claimableItemsPath = path.join(__dirname, "dataV2/claimableItems.json");
const claimableItemsObj: ClaimableItemsObj = JSON.parse(fs.readFileSync(claimableItemsPath).toString());
export const itemsPath = path.join(__dirname, "dataV2/items.json");
const itemsAll: Item[] = JSON.parse(fs.readFileSync(itemsPath).toString());
export const slotsPath = path.join(__dirname, "dataV2/slots.json");
let slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());
export const itemsMerklePath = path.join(__dirname, "dataV2/itemsMerkle.json");

async function main() {
    
    // Add slot id field to each item
    let modified = false;
    for (let i = 0; i < itemsAll.length; i++) {
        const slot = slotsAll.find((s)=>s.name == itemsAll[i].slotName);
        if (slot && itemsAll[i].slotId != slot.id) {
            itemsAll[i].slotId = slot.id;
        }
    }
    if (modified) {
        console.log("##SAVE Add slot id field to each item to ", itemsPath);
        fs.writeFileSync(itemsPath, JSON.stringify(itemsAll));
    }

    // Add items v2 id
    const owners = Object.keys(claimableItemsObj);
    modified = false;
    for (let i = 0; i < owners.length; i++) {
        const claimableItems = claimableItemsObj[owners[i]];
        for (let j = 0; j < claimableItems.length; j++) {
            if (!claimableItems[j].nameV2 || claimableItems[j].nameV2 == "#N/A") {
                continue;
            }

            const item = itemsAll.find((_item)=>_item.name == claimableItems[j].nameV2)
            if (!item || !item.id) {
                // console.log("item ", claimableItems[j].nameV2, " has no correspondence");
                continue;
            }
            const slot = slotsAll.find((slot)=>slot.id == item?.slotId) as Slot
            if (!slot) {
                continue;
            }

            if (slot.isBase) {
                continue;
            }

            if (claimableItemsObj[owners[i]][j].idV2 != item.id) {
                claimableItemsObj[owners[i]][j].idV2 = item.id;
                modified = true;
            }
        }
    }
    if (modified) {
        console.log("##SAVE Add items v2 id to ", claimableItemsPath);
        fs.writeFileSync(claimableItemsPath, JSON.stringify(claimableItemsObj));
    }

    // Create items v2 merkle input
    // type: [[address, itemId, amount], ...]
    let itemsMerkle: any[] = [];
    for (let i = 0; i < owners.length; i++) {
        const claimableItems = claimableItemsObj[owners[i]];
        for (let j = 0; j < claimableItems.length; j++) {
            const claimItem = claimableItemsObj[owners[i]][j];

            if (claimItem && !isNaN(claimItem.idV2)) {
                const itemMerkle = [claimItem.owner, claimItem.idV2, claimItem.amount]
                itemsMerkle.push(itemMerkle);
            }
        }
    }
    console.log("##SAVE Create items v2 merkle input ", itemsMerklePath);
    fs.writeFileSync(itemsMerklePath, JSON.stringify(itemsMerkle));

    // setup allowed items for each slot
    modified = false;
    for (let i = 0; i < itemsAll.length; i++) {
        const slotIndex = slotsAll.findIndex((slot)=>slot.id == itemsAll[i].slotId)
        if (!slotsAll[slotIndex].allowedItems.includes(itemsAll[i].id)) {
            slotsAll[slotIndex].allowedItems.push(itemsAll[i].id);
            modified = true;
        }
    }
    if (modified) {
        console.log("##SAVE setup allowed items for each slot to ", slotsPath);
        fs.writeFileSync(slotsPath, JSON.stringify(slotsAll));
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  