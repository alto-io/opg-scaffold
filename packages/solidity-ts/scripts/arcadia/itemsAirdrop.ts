import hre from "hardhat";
import { BigNumber } from "ethers";
import getDeployedContracts from "./utils/deployedContracts";
import fs from "fs";
import { ClaimableItem, claimableItemsPath } from "./utils/interfaces";

async function main() {

    const claimableItems: ClaimableItem[] = JSON.parse(fs.readFileSync(claimableItemsPath).toString());

    const network = hre.network.name;
    const { itemsSC } = await getDeployedContracts(network);

    const maxItemsPerTransaction = 100;

    const recipientAddress = await itemsSC.signer.getAddress();
    console.log("recipientAddress", recipientAddress)
    
    const initialBalance: BigNumber = (await itemsSC.signer.getBalance());
    console.log("initialBalance", initialBalance)

    const claimableItemsObj = {};
    for (let i = 0; i < claimableItems.length; i++) {
        const claimableItem = claimableItems[i];
        let itemsPerOwner: ClaimableItem[] = (claimableItemsObj as any)[claimableItem.owner as string]
        if (itemsPerOwner) {
            delete claimableItem.nameV1;
            delete claimableItem.nameV2;
            delete claimableItem.slotId;
            delete claimableItem.slot;
            itemsPerOwner.push(claimableItem);
        } else {
            delete claimableItem.nameV1;
            delete claimableItem.nameV2;
            delete claimableItem.slotId;
            delete claimableItem.slot;
            itemsPerOwner = [claimableItem];
        }
        (claimableItemsObj as any)[claimableItem.owner as string] = itemsPerOwner;
    }
    // console.log("claimableItemsObj: ", claimableItemsObj);
    
    const claimees: string[] = Object.keys(claimableItemsObj);
    const itemsPerOwner: ClaimableItem[][] = Object.values(claimableItemsObj);

    for (let i = 0; i < claimees.length; i++) {

        const claimer = claimees[i]; 
        const items = itemsPerOwner[i]; 
        console.log("- [", claimer, "]. iteration nr: ", i);

        for (let j = 0; j < items.length; j += maxItemsPerTransaction) {
            let itemsToMint: ClaimableItem[] = items.slice(j, j + maxItemsPerTransaction);
            
            let mintOwners = itemsToMint.map((item)=>item.owner);
            let mintItemsIds = itemsToMint.map((item)=>item.idV2);
            let mintAmounts = itemsToMint.map((item)=>item.amount as number);

            const balances: number[] = (await itemsSC.balanceOfBatch(mintOwners, mintItemsIds)).map((v:BigNumber)=>v.toNumber())
            const amountsLeft =  balances.map((balance, ind)=> mintAmounts[ind] - balance);

            itemsToMint = itemsToMint.filter((item, ind)=> amountsLeft[ind] > 0);
            
            if (itemsToMint.length > 0) {
                mintItemsIds = itemsToMint.map((item)=>item.idV2);
                console.log("mintItemsIds", mintItemsIds)
                mintAmounts = itemsToMint.map((item)=>item.amount as number);
                console.log("mintAmounts", mintAmounts)
                let tx = await itemsSC.mintBatch(claimer, mintItemsIds, mintAmounts);
                await tx.wait();
                itemsToMint = [];
            } else {
                console.log("Tokens already minted");
            }
        }
    }

    const finalBalance: BigNumber = (await itemsSC.signer.getBalance());
    console.log("finalBalance", finalBalance)
    console.log("cost", initialBalance.sub(finalBalance))
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});
  