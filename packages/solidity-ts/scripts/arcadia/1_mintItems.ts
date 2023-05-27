import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";
import fs from "fs";
import path from "path";
import { Item, ItemKeys, Slot, itemsPath, slotsPath } from "./utils/interfaces";

const itemsAll: Item[] = JSON.parse(fs.readFileSync(itemsPath).toString());
const slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());

async function main() {
    const network = hre.network.name;
    const { itemsSC } = await getDeployedContracts(network);
    const accounts = await hre.getNamedAccounts();

    const recipientAddress = await itemsSC.signer.getAddress();
    console.log("Items recipient address: ", recipientAddress);
    const maxItemsPerTransaction = 100;

    let nonBasicItems = itemsAll.filter((item, i)=>{
        const itemSlot = slotsAll.find((slot)=>slot.id==item.slotId)
        return !item.isBasic && itemSlot && !itemSlot.isBase && !itemSlot.permanent
    })

    // Mint items
    for (let i = 0; i <= nonBasicItems.length; i += maxItemsPerTransaction) {

        let mintItemsTx: Item[] = nonBasicItems.slice(i, i + maxItemsPerTransaction)
        const itemsIds = mintItemsTx.map((item)=>item.id);
        const itemsAmounts = mintItemsTx.map((item)=>1);
        
        let tx = await itemsSC.mintBatch(recipientAddress, itemsIds, itemsAmounts);
        await tx.wait();
        console.log("-> minted items from ", mintItemsTx[0].id, " to ", mintItemsTx[mintItemsTx.length-1].id);

        const balance = await itemsSC.balanceOfBatch(itemsIds.map(()=>recipientAddress), itemsIds);
        console.log(`balance: `, balance.toString());
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  