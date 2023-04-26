// import { ethers } from "ethers";
import hre from "hardhat";
import { BigNumber } from "ethers";
import getDeployedContracts from "./utils/deployedContracts";

export interface ClaimableToken {
    claimer: string,
    amount: number
}

async function main() {

    const OG : ClaimableToken[] = [{claimer: "0xad733b7055ecaebfb3b38626f0148c5d12158f03", amount: 1}]
    const AL : ClaimableToken[] = [{claimer: "0xad733b7055ecaebfb3b38626f0148c5d12158f03", amount: 1}]
    const WL : ClaimableToken[] = [{claimer: "0xad733b7055ecaebfb3b38626f0148c5d12158f03", amount: 1}]

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC, whitelistArcadiansSC } = await getDeployedContracts(network);

    for (const token of OG) {
        console.log("adding guaranteed [OG] amount ", token.amount, " to ", token.claimer);
        let tx = await whitelistArcadiansSC.increaseElegibleGuaranteedPool(token.claimer, token.amount);
        tx.wait();
    }

    for (const token of AL) {
        console.log("adding restricted [AL] amount ", token.amount, " to ", token.claimer);
        let tx = await whitelistArcadiansSC.increaseElegibleRestrictedPool(token.claimer, token.amount);
        tx.wait()
    }
    
    for (const token of WL) {
        const current: BigNumber = await whitelistArcadiansSC.elegibleRestrictedPool(token.claimer)
        console.log("adding restricted [WL] amount ", current, " to ", token.claimer);
        let tx = await whitelistArcadiansSC.increaseElegibleRestrictedPool(token.claimer, current);
        tx.wait()
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});
  