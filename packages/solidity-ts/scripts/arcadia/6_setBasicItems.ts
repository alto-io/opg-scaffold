import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";
import fs from "fs";
import path from "path";
import { Item, ItemKeys, itemsPath } from "./utils/interfaces";



export const itemsAll = JSON.parse(fs.readFileSync(itemsPath).toString());

async function main() {
    const network = hre.network.name;
    const { itemsSC, arcadiansSC } = await getDeployedContracts(network);
    const accounts = await hre.getNamedAccounts();

    const recipientAddress = await arcadiansSC.signer.getAddress();
    console.log("Items recipient address: ", recipientAddress);
    const maxItemsPerTransaction = 100;
    
    // Set basic items
    for (let i = 0; i <= itemsAll.length; i += maxItemsPerTransaction) {

        let partialItems: Item[] = itemsAll.slice(i, i + maxItemsPerTransaction)
        const itemsIds = partialItems.map((item)=>item.id);

        // Set basic items
        const isBasicItems = partialItems.map((item: Item)=>item.isBasic);
        
        console.log("-> setting basic items from ", partialItems[0].id, " to ", partialItems[partialItems.length-1].id);
        
        const tx = await itemsSC.setBasicBatch(itemsIds, isBasicItems);
        await tx.wait();
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  