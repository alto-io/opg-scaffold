// import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { ClaimableItem, ClaimableItemsObj, Item, Slot, claimableItemsPath, itemsClaimConverterPath, itemsMerklePath, itemsPath, slotsPath } from "./utils/interfaces";

const itemsClaimConverterPathObj: ClaimableItemsObj = JSON.parse(fs.readFileSync(itemsClaimConverterPath).toString());
const itemsAll: Item[] = JSON.parse(fs.readFileSync(itemsPath).toString());
let slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());

async function main() {
    
    // Add slot id field to each item
    let modified = false;
    for (let i = 0; i < itemsAll.length; i++) {
        const slot = slotsAll.find((s)=>s.name == itemsAll[i].slotName);
        if (slot) {
            if (itemsAll[i].slotId != slot.id) {
                itemsAll[i].slotId = slot.id;
                modified = true;
            }
        } else {
            throw new Error("No slot found: " + itemsAll[i].slotName);
        }
    }
    if (modified) {
        console.log("$ Add slot id to items item. Path: ", itemsPath);
        fs.writeFileSync(itemsPath, JSON.stringify(itemsAll));
    }

    // Add items v2 id
    const claimableSlots = ["Headgear", "Left Hand", "Right Hand", "Bottom", "Top", "Accessory"]
    const owners = Object.keys(itemsClaimConverterPathObj);
    modified = false;
    const claimableItemsList: ClaimableItem[] = [];
    for (let i = 0; i < owners.length; i++) {
        const claimableItems = itemsClaimConverterPathObj[owners[i]];
        for (let j = 0; j < claimableItems.length; j++) {
            for (let k = 0; k < claimableItems[j].namesV2.length; k++) {
                const itemConverter = claimableItems[j];
                const itemNameV2 = itemConverter.namesV2[k];
                if (!itemNameV2 || itemNameV2 == "#N/A") {
                    continue;
                }
                const itemV2 = itemsAll.find((_item)=>_item.displayName == itemNameV2);
                if (itemV2 == undefined || !itemV2.id) {
                    console.log("item", itemNameV2, " has no correspondence. k: ", k);
                    continue;
                }

                const slot = slotsAll.find((slot)=>slot.id == itemV2?.slotId) as Slot // v2 slot
                if (!slot) {
                    continue;
                }
    
                if (!claimableSlots.includes(slot.name as string) ) {
                    continue;
                }

                let claimableItem: ClaimableItem = {
                    amount: itemConverter.amount,
                    idV2: itemV2.id,
                    nameV1: itemConverter.nameV1,
                    nameV2: itemNameV2,
                    owner: itemConverter.owner,
                    slot: slot.name as string,
                    slotId: slot.id
                };

                claimableItemsList.push(claimableItem);
            }
        }
    }
    console.log("$ Set claimable v2 items. Path: ", claimableItemsPath);
    fs.writeFileSync(claimableItemsPath, JSON.stringify(claimableItemsList));


    // Create items v2 merkle input
    // type: [[address, itemId, amount], ...]
    let itemsMerkle: any[] = [];
    for (let i = 0; i < claimableItemsList.length; i++) {
        const claimableItem = claimableItemsList[i];

        if (claimableItem && !isNaN(claimableItem.idV2)) {
            const itemMerkle = [claimableItem.owner, claimableItem.idV2, claimableItem.amount]
            itemsMerkle.push(itemMerkle);
        }
    }
    console.log("$ Create items v2 merkle input. Path: ", itemsMerklePath);
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
        console.log("$ Setup allowed items for each slot. Path: ", slotsPath);
        fs.writeFileSync(slotsPath, JSON.stringify(slotsAll));
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  