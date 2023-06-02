import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";
import fs from "fs";
import { ClaimableItem, claimableItemsPath } from "./utils/interfaces";

// USE THIS OBJECT TO PUT THE ACCOUNTS TO AIRDROP ITEMS TO
const walletsToAirdrop = [
    "0xe6698e4C0882e9Fb0560DE2a83A753c147b9A2db",
    "0x0C9f7F75E222BD7F88e7dBDA0231D6eD48cCa7DA"
]

async function main() {

    const claimableItems: ClaimableItem[] = JSON.parse(fs.readFileSync(claimableItemsPath).toString());

    const network = hre.network.name;
    // const { itemsSC, whitelistArcadiansSC, mintPassFacetSC, arcadiansDiamondSC } = await getDeployedContracts(network);
    const { itemsSC, arcadiansDiamondSC } = await getDeployedContracts(network);

    const signerAddress = await arcadiansDiamondSC.signer.getAddress();
    console.log("signerAddress", signerAddress);

    // Creates the item (id, amount, owner) based on the OG item snapshot
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

    // Airdrop multiple random v2 items to the selected addresses
    const itemsPerOwner: ClaimableItem[][] = Object.values(claimableItemsObj);
    for (let i = 0; i < walletsToAirdrop.length; i++) {
        const claimer = walletsToAirdrop[i];
        console.log("claimer: ", claimer)
        const randomIndex = Math.floor(Math.random() * itemsPerOwner.length); 
        const items = itemsPerOwner[randomIndex];
        console.log("items to airdrop: ", items)

        const itemsIds = items.map((item)=>item.idV2);
        const itemsAmounts = items.map((item)=>item.amount);

        const tx = await itemsSC.mintBatch(claimer, itemsIds, itemsAmounts);
        await tx.wait();
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});
  