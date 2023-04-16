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

    const arcadianId = 1;
    const slotsAll: Slot[] = await inventorySC.slotsAll();
    
    const itemsToEquip: Item[] = [];
    const slotsIds: number[] = [];
    for (const slot of slotsAll) {
        const numAllowedItems: BigNumber = await inventorySC.numAllowedItems(slot.id)
        
        if (numAllowedItems.gt(0)) {
            const itemToEquip: Item = await inventorySC.allowedItem(slot.id, numAllowedItems.sub(1))
            itemsToEquip.push(itemToEquip);

            slotsIds.push((slot.id as any).toNumber())
        }
    }
    await itemsSC.setApprovalForAll(inventorySC.address, true);
    
    console.log("signer address: ", await inventorySC.signer.getAddress());
    const itemsIds = itemsToEquip.map((item)=> item.id.toString())
    console.log("itemsIds: ", itemsIds)
    let tx = await inventorySC.equipBatch(arcadianId, slotsIds, itemsToEquip);
    await tx.wait();

    const equippedAll = await inventorySC.equippedAll(arcadianId);
    console.log("Items equipped in all slots: ", equippedAll);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  