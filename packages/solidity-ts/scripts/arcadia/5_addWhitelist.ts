import hre from "hardhat";
import { BigNumber } from "ethers";
import getDeployedContracts from "./utils/deployedContracts";

import fs from "fs";
import path from "path";

export interface ClaimableToken {
    elegibleAddress: string,
    amount: number
}

async function main() {

    const OG : ClaimableToken[] = JSON.parse(fs.readFileSync(path.join(__dirname, "data/claimersOG.json")).toString()).slice(0,1);
    const AL : ClaimableToken[] = JSON.parse(fs.readFileSync(path.join(__dirname, "data/claimersAL.json")).toString());
    const WL : ClaimableToken[] = JSON.parse(fs.readFileSync(path.join(__dirname, "data/claimersWL.json")).toString()).slice(0,1);

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC, whitelistArcadiansSC } = await getDeployedContracts(network);

    // Original holders (OG)
    for (const token of OG) {
        console.log("[", token.elegibleAddress, "] adding guaranteed [OG] amount ", token.amount, " to ", token.elegibleAddress);
        let tx = await whitelistArcadiansSC.increaseElegibleGuaranteedPool(token.elegibleAddress, token.amount);
        await tx.wait();
        const finalAmount: BigNumber = await whitelistArcadiansSC.elegibleGuaranteedPool(token.elegibleAddress)
        console.log("-> [", token.elegibleAddress, "] final guaranteed [OG] amount ", finalAmount.toNumber());
    }

    // // Allowlist (AL)
    // for (const token of AL) {
    //     console.log("[", token.elegibleAddress, "] adding guaranteed [AL] amount ", token.amount, " to ", token.elegibleAddress);
    //     let tx = await whitelistArcadiansSC.increaseElegibleGuaranteedPool(token.elegibleAddress, token.amount);
    //     await tx.wait()
    //     const finalAmount: BigNumber = await whitelistArcadiansSC.elegibleGuaranteedPool(token.elegibleAddress)
    //     console.log("-> [", token.elegibleAddress, "] final guaranteed [AL] amount ", finalAmount.toNumber());
    // }
    
    // // Whitelist (WL)
    // for (const token of WL) {
    //     console.log("[", token.elegibleAddress, "] adding restricted [WL] amount ", token.amount, " to ", token.elegibleAddress);
    //     let tx = await whitelistArcadiansSC.increaseElegibleRestrictedPool(token.elegibleAddress, token.amount);
    //     await tx.wait();
    //     const elegibleRestrictedPool: BigNumber = await whitelistArcadiansSC.elegibleRestrictedPool(token.elegibleAddress)
    //     console.log("-> [", token.elegibleAddress, "] final restricted [WL] amount ", elegibleRestrictedPool.toNumber());
    // }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});
  