// import { ethers } from "ethers";
import hre from "hardhat";
import { BigNumber } from "ethers";
import getDeployedContracts from "./utils/deployedContracts";
import { Item, ItemKeys, ItemSC, Slot, itemsPath, slotsPath } from "./utils/interfaces";
import fs from "fs";

const itemsAll: Item[] = JSON.parse(fs.readFileSync(itemsPath).toString());
let slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);
    
    const recipientAddress = await arcadiansSC.signer.getAddress();
    console.log("recipientAddress: ", recipientAddress);

    const itemsToEquip: ItemSC[] = [];
    for (const slot of slotsAll) {
        const item = itemsAll.find((item, i)=>item.slotId == slot.id)
        // const item = itemsAll.findLast((item, i)=>(item.slotId]  == slot.id)
        console.log("slot: ", slot.id, ", item: ", (item as any).id);
        
        itemsToEquip.push({erc1155Contract: itemsSC.address, id: (item as any).id as number});
    }

    const itemsToEquipIds = itemsToEquip.map((item)=>item.id)
    const itemsToEquipAmounts = itemsToEquip.map(()=>1)
    await itemsSC.mintBatch(recipientAddress, itemsToEquipIds, itemsToEquipAmounts)

    const isPublicMintOpen = await await arcadiansSC.publicMintOpen();
    if (!isPublicMintOpen) {
        let tx = await arcadiansSC.setPublicMintOpen(true);
        tx.wait()
    }

    const payAmount = await arcadiansSC.mintPrice()
    
    console.log("itemsToEquip: ", itemsToEquip);
    
    const isArcadianUnique = await inventorySC.isArcadianUnique(0, itemsToEquip);
    if (!isArcadianUnique) {
        console.log("Not minting arcadian because equipments is not unique");
        return;
    }
    
    let tx = await arcadiansSC.mintAndEquip(itemsToEquip, {value: payAmount});
    await tx.wait();
    
    const arcadiansOwner = await arcadiansSC.signer.getAddress();
    const balanceArcadians = await arcadiansSC.balanceOf(arcadiansOwner);
    console.log("balanceArcadians: ", balanceArcadians);
    
    for (let i = 0; i < balanceArcadians; i++) {
        const arcadianId: BigNumber = await arcadiansSC.tokenOfOwnerByIndex(arcadiansOwner, i);
        const equippedAll = await inventorySC.equippedAll(arcadianId);
        console.log("Arcadian ", arcadianId.toNumber(), " equipment: ", equippedAll);
    }

    
    // // Check uniqueness to see error cause
    // // 540, 441, 137, 125, 330, 432, 493, 95, 25
    // const itemsToEquip = [
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 540
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 441
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 125
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 330
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 432
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 493
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 493
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 95
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 25
    //     }
    // ]

    // const baseSlotsIds = slotsAll.filter((slot)=>slot.isBase).map((slot)=>slot.id)
    // console.log("baseSlotsIds: ", baseSlotsIds);
    

    // console.log("itemsToEquip: ", itemsToEquip);
    
    // const isArcadianUnique = await inventorySC.isArcadianUnique(0, itemsToEquip);
    // console.log("isArcadianUnique: ", isArcadianUnique);
    



    // Mint to see error cause
    // const itemsToEquip: ItemSC[] = [
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 538
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 453
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 163
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 133
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 325
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 70
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 70
    //     },
    //     {
    //         "erc1155Contract": "0x7d0364A3c1e0428d925Df4cB037E627c2B5A2e3a",
    //         "id": 19
    //     }
    // ]

    // const isArcadianUnique = await inventorySC.isArcadianUnique(0, itemsToEquip);
    // console.log("isArcadianUnique: ", isArcadianUnique);
    
    // if (!isArcadianUnique) {
    //     console.log("Not minting arcadian because equipments is not unique");
    //     return;
    // }
    
    // let tx = await arcadiansSC.mintAndEquip(itemsToEquip, {value: 0});
    // console.log("tx: ", tx);
    
    // tx = await tx.wait();
    // console.log("tx2: ", tx);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});
  