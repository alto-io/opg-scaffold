// import { ethers } from "ethers";
import hre from "hardhat";
import { BigNumber } from "ethers";
import getDeployedContracts from "./utils/deployedContracts";

enum SlotCategory { Base, Equippment, Cosmetic}
interface Slot {
    id?: number,
    permanent: boolean,
    category: SlotCategory
}

interface Item {
    erc721Contract: string,
    id: number
}

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);


    const arcadianId = 1;
    const slotsAll: Slot[] = await inventorySC.slotsAll();
    
    const itemsToEquip: Item[] = [];
    for (const slot of slotsAll) {
        const numAllowedItems: BigNumber = await inventorySC.numAllowedItems(slot.id)
        
        if (numAllowedItems.gt(0)) {
            const itemToEquip: Item = await inventorySC.allowedItem(slot.id, numAllowedItems.sub(1))
            itemsToEquip.push(itemToEquip);
        }
    }
    await itemsSC.setApprovalForAll(inventorySC.address, true);

    const isPublicMintOpen = await await arcadiansSC.publicMintOpen();
    if (!isPublicMintOpen) {
        let tx = await arcadiansSC.openPublicMint();
        tx.wait()
    }

    const equippedAll = await inventorySC.equippedAll(arcadianId);
    console.log("Items equipped in all slots: ", equippedAll);
    

    const payAmount = await arcadiansSC.mintPrice()
    const mintAmount = 1;
    for (let i = 0; i < mintAmount; i++) {
        let tx = await arcadiansSC.mintAndEquip(itemsToEquip, {value: payAmount});
        await tx.wait();
    }
    const minterAddress = await arcadiansSC.signer.getAddress();
    
    console.log("minterAddress: ", minterAddress);
    const balance = await arcadiansSC.balanceOf(minterAddress);
    console.log("balance arcadians: ", balance);
    const ownedTokens = [];
    for (let i = 0; i < balance; i++) {
        const arcadianId: BigNumber = await arcadiansSC.tokenOfOwnerByIndex(minterAddress, i);
        ownedTokens.push(arcadianId.toNumber());
    }
    console.log("owned arcadians: ", ownedTokens);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});
  