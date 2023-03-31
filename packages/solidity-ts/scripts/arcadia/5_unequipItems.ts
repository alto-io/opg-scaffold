// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import { ethers } from "ethers";
import path from "path";
import getDeployedContracts from "./utils/deployedContracts";
import { ItemInSlotSC } from "./6_fetchDataSC";

enum SlotCategory { Base, Equippment, Cosmetic}
interface Slot {
    id?: number,
    unequippable: boolean,
    category: SlotCategory,
    allowedItems: number[]
}

interface Item {
    contractAddress: string,
    id: number
}

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    const arcadianId = 0;
    let equippedAll: ItemInSlotSC[] = await inventorySC.equippedAll(arcadianId);
    const slotsIds = equippedAll.map((item: ItemInSlotSC)=>item.slotId)
    
    let tx = await inventorySC.unequipBatch(arcadianId, slotsIds);
    await tx.wait();

    equippedAll = await inventorySC.equippedAll(arcadianId);
    console.log("Items equipped in all slots: ", equippedAll);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  