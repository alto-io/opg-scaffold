// import { ethers } from "ethers";
import hre, { getNamedAccounts } from "hardhat";
import fs from "fs";
import { BigNumber, ethers } from "ethers";
import path from "path";
import getDeployedContracts from "./utils/deployedContracts";

interface ItemSC {
    id: BigNumber,
    contractAddress: string
}
interface SlotSC {
    id: BigNumber,
    unequippable: boolean,
    category: BigNumber,
    allowedItems: ItemSC[]
}
interface ItemInSlotSC {
    slotId: BigNumber,
    itemId: BigNumber,
    contractAddress: string
}

const dataSCPath = path.join(__dirname, "output/dataSC.json");

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    const accounts = await getNamedAccounts();
    const arcadianId = 0;

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

    let slotsAllSC: SlotSC[] = await inventorySC.slotsAll();
    const slotsAll = slotsAllSC.map((slot: SlotSC)=>{
        return {
            id: slot.id.toNumber(),
            unequippable: slot.unequippable,
            category: slot.category,
            allowedItems: slot.allowedItems.map((item)=>{return {contractAddress: item.contractAddress, id: item.id.toNumber()}})
        }
    })
    const equippedAllSC: ItemInSlotSC[] = await inventorySC.equippedAll(arcadianId);
    const equippedAll = equippedAllSC.map((itemInSlot) => {return {
        slotSc: itemInSlot.slotId.toNumber(),
        contractAddress: itemInSlot.contractAddress,
        itemId: itemInSlot.itemId.toNumber(),
    }})

    const dataSC = {
        network,
        itemsSC: itemsSC.address,
        inventorySC: inventorySC.address,
        arcadiansSC: arcadiansSC.address,
        arcadiansOwner,
        ownedArcadians,
        itemsOwner: accounts.deployer,
        ownedItems,
        inventorySlots: slotsAll,
        equippedAll
    };
    fs.writeFileSync(dataSCPath, JSON.stringify(dataSC));
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  