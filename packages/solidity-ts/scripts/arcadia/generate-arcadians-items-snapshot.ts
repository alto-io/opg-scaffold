import fs from "fs";
import path from "path";

const plannedSupply = [120,120,60,6,60,6,60,60,60,30,120,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,120,120,30,300,120,300,0,300,120,600,120,300,6,30,120,30,120,120,30,120,120,120,120,0,120,120,120,120,120,120,6,30,300,120,120,120,6,120,120,120,6,120,300,0,30,0,120,30,120,120,120,0,120,300,120,120,120,300,120,300,120,120,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,120,120,120,30,60,60,30,6,60,60,30,120,60,120,120,30,120,120,300,300,120,120,120,30,6,6,60,120,120,120,6,60,120,6,120,120,60,120,60,120,30,30,6,120,120,6,120,30,60,120,30,120,30,60,60,60,60,60,120,6,60,120,120,60,120,30,30,60,30,120,120,120,30,60,30,30,120,120,120,120,60,120,60,60,120,300,30,60,300,30,60,300,60,60,30,120,60,60,120,300,120,30,6,120,60,120,300,60,30,120,120,60,60,60,60,120,120,60,6,60,60,120,120,300,6,30,120,30,60,60,6,120,6,6,120,0,0,0,30,60,60,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,6,120,300,30,30,300,120,30,120,60,60,300,6,6,120,120,60,60,120,30,120,300,6,120,60,60,30,30,60,120,120,120,60,6,120,120,6,300,60,60,300,120,60,60,60,120,120,30,60,120,120,120,300,120,120,120,60,6,60,120,60,60,30,120,6,30,120,60,300,60,120,60,6,300,60,120,60,300,6,30,120,30,30,300,60,120,6,60,120,0,0,0,60,300,60,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,30,6,300,120,120,120,30,120,120,120,120,60,6,300,300,30,30,30,60,120,30,120,300,120,120,300,120,30,120,120,120,0,0,0,0,0,6,120,300,120,120,120,120,120,120,30,120,30,120,120,300,300,30,6,6,120,120,30,120,120,120,120,120,60,60,60,60,60,0,0,120,120,120,300,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,6,6,0,6,6,6];

async function main() {
    const snapshotPath = path.join(__dirname, "./dataV2/ArcadiansItemsSnapshot.json");
    const itemsSnapshot = JSON.parse(fs.readFileSync(snapshotPath).toString());

    let snapshots: any = [];
    
    itemsSnapshot.items.forEach((snapshot: any) => {
        const formattedData: any = {};

        const metadata = JSON.parse(snapshot.metadata);

        formattedData.displayName = metadata.name;
        formattedData.tokenId = Number(snapshot.token_id);
        formattedData.plannedSupply = plannedSupply[Number(snapshot.token_id) - 1];
        formattedData.totalSupply = Number(snapshot.amount);
        formattedData.excessSupply = formattedData.totalSupply - formattedData.plannedSupply;
        formattedData.isExcessSupplyExists = formattedData.excessSupply > 0;

        snapshots.push(formattedData);
    });

    const formattedItemsData = { ...itemsSnapshot };
    formattedItemsData.snapshot = snapshots;

    fs.writeFileSync(snapshotPath, JSON.stringify(formattedItemsData));
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});