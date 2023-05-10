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
    
    for (let i = 0; i <= itemsAll.length; i += maxItemsPerTransaction) {

        let mintItemsTx: Item[] = itemsAll.slice(i, i + maxItemsPerTransaction)
        const itemsIds = mintItemsTx.map((item)=>item.id);
        const itemsAmounts = mintItemsTx.map((item)=>item.mintAmount);
        
        let tx = await itemsSC.mintBatch(recipientAddress, itemsIds, itemsAmounts);
        await tx.wait();
        console.log("-> minted items from ", mintItemsTx[0].id, " to ", mintItemsTx[mintItemsTx.length-1].id);
        
        // Set basic items
        const isBasicItem = mintItemsTx.map((item: Item)=>item.isBasic);
        
        tx = await itemsSC.setBasicBatch(itemsIds, isBasicItem);
        await tx.wait();

        const balance = await itemsSC.balanceOfBatch(itemsIds.map(()=>recipientAddress), itemsIds);
        console.log(`balance: `, balance.toString());
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  