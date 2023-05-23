// import { ethers } from "ethers";
import hre, { getNamedAccounts } from "hardhat";
import fs from "fs";
import { BigNumber, ethers } from "ethers";
import path from "path";
import getDeployedContracts from "./utils/deployedContracts";
import { Item, ItemSC, Slot, SlotSC, itemsPath, slotsPath } from "./utils/interfaces";

export interface ItemInSlot {
    slotId: any,
    itemId: any,
    erc1155Contract: string
}

const dataSCPath = path.join(__dirname, "output/dataSC.json");

const itemsAll: Item[] = JSON.parse(fs.readFileSync(itemsPath).toString());
const slotsAll: Slot[] = JSON.parse(fs.readFileSync(slotsPath).toString());

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    const accounts = await getNamedAccounts();

    const arcadiansOwner = await arcadiansSC.signer.getAddress();
    
    // const balanceArcadians = await arcadiansSC.balanceOf(arcadiansOwner);
    // const ownedArcadians = [];
    // for (let i = 0; i < balanceArcadians; i++) {
    //     const arcadianId: BigNumber = await arcadiansSC.tokenOfOwnerByIndex(arcadiansOwner, i);
    //     ownedArcadians.push(arcadianId.toNumber());
    // }

    // const itemsOwner = await arcadiansSC.signer.getAddress();
    // const tokensByAccount: BigNumber[] = await itemsSC.tokensByAccount(itemsOwner);
    // const ownedItems: any[] = [];
    // for (let i = 0; i < tokensByAccount.length; i++) {
    //     const balance: BigNumber = await itemsSC.balanceOf(itemsOwner, tokensByAccount[i]);
    //     ownedItems.push({itemId: tokensByAccount[i].toNumber(), balance: balance.toNumber()});
    // }

    let slots: SlotSC[] = await getAllSlots(inventorySC, itemsSC);

    // const equippedArcadians: any = {};
    // for (const arcadianId of ownedArcadians) {
    //     const equippedAllSC: ItemInSlot[] = await inventorySC.equippedAll(arcadianId);
    //     const equippedAll = equippedAllSC.map((itemInSlot) => {
    //         return {
    //             slotSc: itemInSlot.slotId.toNumber(),
    //             erc1155Contract: itemInSlot.erc1155Contract,
    //             itemId: itemInSlot.itemId.toNumber(),
    //         }
    //     })
    //     equippedArcadians[arcadianId] = equippedAll;
    // }

    const dataSC = {
        network,
        itemsSC: itemsSC.address,
        inventorySC: inventorySC.address,
        arcadiansSC: arcadiansSC.address,
        arcadiansOwner,
        // ownedArcadians,
        itemsOwner: accounts.deployer,
        // ownedItems,
        inventorySlots: slots,
        // equippedArcadians
    };
    fs.writeFileSync(dataSCPath, JSON.stringify(dataSC));
}

async function getAllSlots(inventorySC: ethers.Contract, itemsSC: ethers.Contract) {
    let slotsSC: SlotSC[] = [];

    const numSlots = await inventorySC.numSlots();
    if (numSlots == 0) {
        return slotsSC;
    }

    // Initialize
    for (let i = 0; i < slotsAll.length; i++) {
        const slotId = slotsAll[i].id;
        let slotSC = await inventorySC.slot(slotId);
        
        let slot: SlotSC = {
            id: slotSC.id.toNumber(),
            isBase: slotSC.isBase,
            permanent: slotSC.permanent,
            allowedItems: []
        };
        slotsSC.push(slot);
    }

    // Get slot for each item
    for (let i = 0; i < itemsAll.length; i++) {
        const itemSC: ItemSC = {erc1155Contract: itemsSC.address, id: itemsAll[i].id}
        const allowedSlot = (await inventorySC.allowedSlot(itemSC)).toNumber();
        slotsSC = slotsSC.map((slot: SlotSC)=> {
            if (slot.id === allowedSlot) {
                slot.allowedItems.push(itemSC);
            }
            return slot;
        })
        
    }
    return slotsSC;
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  