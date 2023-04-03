// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import { BigNumber, ethers } from "ethers";
import path from "path";
import getDeployedContracts from "./utils/deployedContracts";

enum SlotCategory { Base, Equippment, Cosmetic}
interface Slot {
    id?: number,
    permanent: boolean,
    category: SlotCategory
}

interface Item {
    erc721Contract: string,
    id: number
}

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    const itemsList: Item[] = [
        { id: 0, erc721Contract: itemsSC.address },
        { id: 1, erc721Contract: itemsSC.address },
        { id: 2, erc721Contract: itemsSC.address },
        { id: 3, erc721Contract: itemsSC.address },
        { id: 4, erc721Contract: itemsSC.address },
        { id: 5, erc721Contract: itemsSC.address }
    ]

    const arcadianId = 0;
    const slotsAll: Slot[] = await inventorySC.slotsAll();
    
    const itemsToEquip: Item[] = [];
    for (const slot of slotsAll) {
        const numAllowedItems: BigNumber = await inventorySC.numAllowedItems(slot.id)
        const itemToEquip: Item = await inventorySC.allowedItem(slot.id, numAllowedItems.sub(1))
        itemsToEquip.push(itemToEquip);
    }
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
  