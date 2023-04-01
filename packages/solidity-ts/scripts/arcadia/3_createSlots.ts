// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import { ethers } from "ethers";
import path from "path";
import getDeployedContracts from "./utils/deployedContracts";

enum SlotCategory { Base, Equippment, Cosmetic}
interface Slot {
    permanent: boolean,
    category: SlotCategory,
    allowedItems: number[]
}

interface Item {
    contractAddress: string,
    id: number
}
let slotsList: Slot[] = [
    { permanent: false, category: SlotCategory.Base, allowedItems: [0, 1]},
    { permanent: false, category: SlotCategory.Cosmetic, allowedItems: [2, 3]},
    { permanent: false, category: SlotCategory.Equippment, allowedItems: [4, 5]}
]

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    const itemsList: Item[] = [
        { id: 0, contractAddress: itemsSC.address },
        { id: 1, contractAddress: itemsSC.address },
        { id: 2, contractAddress: itemsSC.address },
        { id: 3, contractAddress: itemsSC.address },
        { id: 4, contractAddress: itemsSC.address },
        { id: 5, contractAddress: itemsSC.address }
    ]
    
    for (let i = 0; i < slotsList.length; i++) {
        const slotAllowedItems = itemsList.filter((_item)=>slotsList[i].allowedItems.includes(_item.id));
        let tx = await inventorySC.createSlot(slotsList[i].permanent, slotsList[i].category, slotAllowedItems);
        await tx.wait();
    }
    const slotsSC: Slot[] = [];
    const numSlots = await inventorySC.numSlots();
    console.log("numSlots: ", numSlots);
    
    for (let i = 0; i < numSlots; i++) {
        const slotId = i+1;
        slotsSC.push(await inventorySC.slot(slotId));
    }
    console.log("All slots SC: ", slotsSC);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  