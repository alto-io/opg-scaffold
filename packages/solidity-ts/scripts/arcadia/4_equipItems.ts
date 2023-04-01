// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import { ethers } from "ethers";
import path from "path";
import getDeployedContracts from "./utils/deployedContracts";

enum SlotCategory { Base, Equippment, Cosmetic}
interface Slot {
    id?: number,
    permanent: boolean,
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

    const itemsList: Item[] = [
        { id: 0, contractAddress: itemsSC.address },
        { id: 1, contractAddress: itemsSC.address },
        { id: 2, contractAddress: itemsSC.address },
        { id: 3, contractAddress: itemsSC.address },
        { id: 4, contractAddress: itemsSC.address },
        { id: 5, contractAddress: itemsSC.address }
    ]

    const arcadianId = 0;
    const slotsAll = await inventorySC.slotsAll();

    const itemsToEquip = slotsAll.map((_slot: any)=> itemsList.find((item)=> item.id == _slot.allowedItems[0].id));
    const slotsIds = slotsAll.map((slot: Slot)=>slot.id);

    await itemsSC.setApprovalForAll(inventorySC.address, true);
    let tx = await inventorySC.equipBatch(arcadianId, slotsIds, itemsToEquip);
    await tx.wait();

    const equippedAll = await inventorySC.equippedAll(arcadianId);
    console.log("Items equipped in all slots: ", equippedAll);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  