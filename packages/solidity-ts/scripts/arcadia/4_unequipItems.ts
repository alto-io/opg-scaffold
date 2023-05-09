// import { ethers } from "ethers";
import hre, { ethers } from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";
import { ItemInSlot } from "./6_fetchDataSC";
import { Slot } from "./utils/interfaces";

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    const arcadianId = 1;
    let equippedAll: ItemInSlot[] = await inventorySC.equippedAll(arcadianId);
    let slotsAll: Slot[] = await inventorySC.slotsAll();
    
    const slotsIds = equippedAll.filter((item: ItemInSlot)=>item.erc721Contract != ethers.constants.AddressZero).map((item: ItemInSlot)=>item.slotId);
    
    const slotsIdsToUnequip: number[] = [];
    for (let i = 0; i < slotsIds.length; i++) {
        const slotId = slotsIds[i];
        const slot = slotsAll.find((s)=> Number(s.id) == Number(slotId));
        
        if (slot && !slot.permanent && !slot.isBase) {
            slotsIdsToUnequip.push(Number(slot.id));
        }
    }
    console.log("slots Ids to unequip: ", slotsIdsToUnequip);
    
    let tx = await inventorySC.unequip(arcadianId, slotsIdsToUnequip);
    await tx.wait();

    equippedAll = await inventorySC.equippedAll(arcadianId);
    console.log("Items equipped in all slots: ", equippedAll);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  