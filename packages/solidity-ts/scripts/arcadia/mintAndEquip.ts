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

    // const itemsToEquip: ItemSC[] = [];
    // for (const slot of slotsAll) {
    //     const item = itemsAll.find((item, i)=>item.slotId == slot.id)
    //     // const item = itemsAll.findLast((item, i)=>(item.slotId]  == slot.id)
    //     console.log("slot: ", slot.id, ", item: ", (item as any).id);
        
    //     itemsToEquip.push({erc1155Contract: itemsSC.address, id: (item as any).id as number});
    // }

    // const itemsToEquipIds = itemsToEquip.map((item)=>item.id)
    // const itemsToEquipAmounts = itemsToEquip.map(()=>1)
    // await itemsSC.mintBatch(recipientAddress, itemsToEquipIds, itemsToEquipAmounts)

    // const isPublicMintOpen = await await arcadiansSC.publicMintOpen();
    // if (!isPublicMintOpen) {
    //     let tx = await arcadiansSC.setPublicMintOpen(true);
    //     tx.wait()
    // }

    // const payAmount = await arcadiansSC.mintPrice()
    
    // console.log("itemsToEquip: ", itemsToEquip);
    
    // const isArcadianUnique = await inventorySC.isArcadianUnique(0, itemsToEquip);
    // if (!isArcadianUnique) {
    //     console.log("Not minting arcadian because equipments is not unique");
    //     return;
    // }
    
    // let tx = await arcadiansSC.mintAndEquip(itemsToEquip, {value: payAmount});
    // await tx.wait();
    
    // const arcadiansOwner = await arcadiansSC.signer.getAddress();
    // const balanceArcadians = await arcadiansSC.balanceOf(arcadiansOwner);
    // console.log("balanceArcadians: ", balanceArcadians);
    
    // for (let i = 0; i < balanceArcadians; i++) {
    //     const arcadianId: BigNumber = await arcadiansSC.tokenOfOwnerByIndex(arcadiansOwner, i);
    //     const equippedAll = await inventorySC.equippedAll(arcadianId);
    //     console.log("Arcadian ", arcadianId.toNumber(), " equipment: ", equippedAll);
    // }

    
    // // Check uniqueness to see error cause
    // // 540, 441, 137, 125, 330, 432, 493, 95, 25
    const itemsToEquip = [
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 527
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 436
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 133
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 110
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 321
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 421
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 482
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 87
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 533
        },
        {
            "erc1155Contract": "0x700148f174D5879255AF7CE86Fd21Dc0D9Bb84FD",
            "id": 525
        }
    ]

    // const baseSlotsIds = slotsAll.filter((slot)=>slot.isBase).map((slot)=>slot.id)
    // console.log("baseSlotsIds: ", baseSlotsIds);
    

    // console.log("itemsToEquip: ", itemsToEquip);
    
    // const isArcadianUnique = await inventorySC.isArcadianUnique(16, itemsToEquip);
    // console.log("isArcadianUnique: ", isArcadianUnique);

    for (let i = 0; i < itemsToEquip.length; i++) {
        const itemSC: ItemSC = itemsToEquip[i]
        const allowedSlot = (await inventorySC.allowedSlot(itemSC)).toNumber();
        console.log("itemId ", itemSC.id, " -> ", allowedSlot);
    }

    const arcadianId = 0;
    const isArcadianUnique = await inventorySC.isArcadianUnique(arcadianId, itemsToEquip);
    console.log("isArcadianUnique: ", isArcadianUnique);

    if (!isArcadianUnique) {
        console.log("Not minting arcadian because equipments is not unique");
        return;
    }
    
    let tx = await arcadiansSC.mintAndEquip(itemsToEquip, {value: 0});
    console.log("tx: ", tx);
    
    // tx = await tx.wait();
    // console.log("tx2: ", tx);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});
  