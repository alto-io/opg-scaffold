import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";
import fs from "fs";
import path from "path";
import { Item, ItemKeys, ItemSC, Slot, itemsPath, slotsPath } from "./utils/interfaces";



const itemsAll = JSON.parse(fs.readFileSync(itemsPath).toString());
let slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());

async function main() {
    const network = hre.network.name;
    const { itemsSC, arcadiansSC, inventorySC } = await getDeployedContracts(network);
    const accounts = await hre.getNamedAccounts();

    const recipientAddress = await arcadiansSC.signer.getAddress();
    console.log("Items recipient address: ", recipientAddress);
    const maxItemsPerTransaction = 100;
    
    // Set basic items
    for (let i = 0; i <= itemsAll.length; i += maxItemsPerTransaction) {

        let partialItems: Item[] = itemsAll.slice(i, i + maxItemsPerTransaction).filter((item:Item)=>!!item.slotId)

        // Set basic items
        const itemsTransferRequired = partialItems.map((item: Item) => {
            const itemSlot = slotsAll.find((slot: Slot)=> slot.id == item.slotId) as Slot
            return !item.isBasic && !itemSlot.permanent && !itemSlot.isBase
        });
        
        console.log("-> setting items transfer required from ", partialItems[0].id, " to ", partialItems[partialItems.length-1].id);
        const items: ItemSC[] = partialItems.map((item): ItemSC => ({erc721Contract: itemsSC.address, id: item.id}));
        items.map((item, index)=>console.log(item.id, " needs transfer: ", itemsTransferRequired[index]))
        
        const tx = await inventorySC.setItemsTransferRequired(items, itemsTransferRequired);
        await tx.wait();
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  