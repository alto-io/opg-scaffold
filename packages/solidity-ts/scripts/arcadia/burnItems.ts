import fs from "fs";
import path from 'path';
import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";

async function main() {
    const network = hre.network.name;
    const { itemsSC } = await getDeployedContracts(network);
    const burnItemsPath = path.join(__dirname, "dataV2/burnArcadiaItems.json");
     
    const items = JSON.parse(fs.readFileSync(burnItemsPath).toString());

    let burnItems = items.filter((item: any) => item.IsBurnPossible === 'Yes')
    .map((item: any) => ({ tokenId: item.id, totalsupply: item.totalSupply, extraSupply: item.extraSupply, isBurnPossible: item.IsBurnPossible }));

    burnItems = burnItems.sort((itemA: any, itemB: any) =>  itemA.tokenId - itemB.tokenId);

    const tokenIds: any = [];
    const amounts: any = [];

    burnItems.forEach((item: any) => {
        if (item.extraSupply <= 0) return;
        tokenIds.push(item.tokenId);
        amounts.push(item.extraSupply);
    });

    if (tokenIds.length !== amounts.length) {
        throw new Error("Length Mismatch");
    }
    let count = 0;
    while(true) {
        const batchTokenIds = tokenIds.slice(count, count + 10);
        const batchAmounts = amounts.slice(count, count + 10);

        if (batchAmounts.length === 0 && batchTokenIds.length === 0) {
            break;
        }

        let tx = await itemsSC.burnBatch(batchTokenIds, batchAmounts);
        await tx.wait();

        console.log(`Token Burn Batch from ${count} to ${count + 10} is completed:`, batchTokenIds, batchAmounts);

        count += 10;
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });