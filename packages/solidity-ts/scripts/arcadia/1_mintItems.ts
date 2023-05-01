import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";
import fs from "fs";
import path from "path";

export interface MintItem {
    id: number,
    slot: string,
    name: string,
    isBasic: boolean,
    amount: number
}

export const itemsAll = JSON.parse(fs.readFileSync(path.join(__dirname, "dataV2/items.json")).toString());

export const basicItems = itemsAll.filter((item: MintItem)=>item.isBasic);

const maxItemsPerTransaction = 100;

async function main() {
    const network = hre.network.name;
    const { itemsSC, arcadiansSC } = await getDeployedContracts(network);
    const accounts = await hre.getNamedAccounts();

    const recipientAddress = await arcadiansSC.signer.getAddress();
    console.log("Items recipient address: ", recipientAddress);
    
    for (let i = 0; i <= itemsAll.length; i += maxItemsPerTransaction) {

        let mintItemsTx: MintItem[] = itemsAll.slice(i, i + maxItemsPerTransaction)
        const itemsIds = mintItemsTx.map((item)=>item.id);
        const itemsAmounts = mintItemsTx.map((item)=>item.amount);
        
        let tx = await itemsSC.mintBatch(recipientAddress, itemsIds, itemsAmounts);
        await tx.wait();
        console.log("-> minted items from ", mintItemsTx[0].id, " to ", mintItemsTx[mintItemsTx.length-1].id);
        
        const isBasicItem = mintItemsTx.map((item: MintItem)=>item.isBasic);
        
        tx = await itemsSC.setBasicBatch(itemsIds, isBasicItem);
        await tx.wait();

        const balance = await itemsSC.balanceOfBatch(itemsIds.map(()=>recipientAddress), itemsIds);
        console.log(`- balance: `, balance.toString());
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  