import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";

interface MintItem {
    id: number,
    amount: number
}

const maxItemsPerTransaction = 100;
const numberOfItems = 450;
const amountPerItem = 5;
const mintItemsList: MintItem[][] = [];
const numTransactionsNeeded = Math.round(numberOfItems / maxItemsPerTransaction)
console.log("numTransactionsNeeded: ", numTransactionsNeeded);
let itemsPerTransaction = [];
for (let i = 1; i <= numberOfItems; i++) {
    itemsPerTransaction.push({ id: i, amount: amountPerItem })
    if (itemsPerTransaction.length == maxItemsPerTransaction || i == numberOfItems) {
        mintItemsList.push(itemsPerTransaction);
        itemsPerTransaction = [];
    }
}

async function main() {
    const network = hre.network.name;
    const { itemsSC } = await getDeployedContracts(network);
    const accounts = await hre.getNamedAccounts();

    const recipientAddress = accounts.deployer;
    console.log("Items recipient address: ", recipientAddress);
    
    console.log("recipientAddress: ", recipientAddress);

    for (let i = 0; i < mintItemsList.length; i++) {
        const mintItemsListTransaction = mintItemsList[i];
        const itemsIds = mintItemsListTransaction.map((item)=>item.id);
        const itemsAmounts = mintItemsListTransaction.map((item)=>item.amount);
        
        let tx = await itemsSC.mintBatch(recipientAddress, itemsIds, itemsAmounts);
        console.log("mintBatch tx " + i + " : ", tx);
        
        await tx.wait();
    }
    

    for (const mintItemsListTransaction of mintItemsList) {
        for (let j = 0; j < mintItemsListTransaction.length; j++) {
            const balance = await itemsSC.balanceOf(recipientAddress, mintItemsListTransaction[j].id);
            console.log(`- item id ${mintItemsListTransaction[j].id} balance: `, balance.toString());
        }
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  