// import { ethers } from "ethers";
import hre, { getNamedAccounts } from "hardhat";
import fs from "fs";
import { BigNumber, ethers } from "ethers";
import path from "path";
import getDeployedContracts from "./utils/deployedContracts";
import { Item, ItemSC, Slot, SlotSC } from "./utils/interfaces";

export interface ItemInSlot {
    slotId: any,
    itemId: any,
    erc721Contract: string
}

const dataSCPath = path.join(__dirname, "output/dataSC.json");

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    const accounts = await getNamedAccounts();

    const arcadiansOwner = await arcadiansSC.signer.getAddress();
    const balanceArcadians = await arcadiansSC.balanceOf(arcadiansOwner);
    const ownedArcadians = [];
    for (let i = 0; i < balanceArcadians; i++) {
        const arcadianId: BigNumber = await arcadiansSC.tokenOfOwnerByIndex(arcadiansOwner, i);
        ownedArcadians.push(arcadianId.toNumber());
    }

    const itemsOwner = await arcadiansSC.signer.getAddress();
    const tokensByAccount: BigNumber[] = await itemsSC.tokensByAccount(itemsOwner);
    const ownedItems: any[] = [];
    for (let i = 0; i < tokensByAccount.length; i++) {
        const balance: BigNumber = await itemsSC.balanceOf(itemsOwner, tokensByAccount[i]);
        ownedItems.push({itemId: tokensByAccount[i].toNumber(), balance: balance.toNumber()});
    }

    let slotsAll: SlotSC[] = await inventorySC.slotsAll();
    const slots: Slot[] = [];
    for (const slot of slotsAll) {
        const allowedItems: ItemSC[] = [];
        const numAllowedItems: BigNumber = await inventorySC.numAllowedItems(slot.id)
        for (let i = 0; i < numAllowedItems.toNumber(); i++) {
            let allowedItem: ItemSC = await inventorySC.allowedItem(slot.id, i)
            allowedItems.push({erc721Contract: allowedItem.erc721Contract, id: (allowedItem.id as any).toNumber() });
        }
        
        slots.push({
            id: (slot.id as any).toNumber(),
            permanent: slot.permanent,
            isBase: slot.isBase,
            allowedItems: allowedItems.map((item)=>item.id)
        })
    }

    const equippedArcadians: any = {};
    for (const arcadianId of ownedArcadians) {
        const equippedAllSC: ItemInSlot[] = await inventorySC.equippedAll(arcadianId);
        const equippedAll = equippedAllSC.map((itemInSlot) => {
            return {
                slotSc: itemInSlot.slotId.toNumber(),
                erc721Contract: itemInSlot.erc721Contract,
                itemId: itemInSlot.itemId.toNumber(),
            }
        })
        equippedArcadians[arcadianId] = equippedAll;
    }

    const dataSC = {
        network,
        itemsSC: itemsSC.address,
        inventorySC: inventorySC.address,
        arcadiansSC: arcadiansSC.address,
        arcadiansOwner,
        ownedArcadians,
        itemsOwner: accounts.deployer,
        ownedItems,
        inventorySlots: slots,
        equippedArcadians
    };
    fs.writeFileSync(dataSCPath, JSON.stringify(dataSC));
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  