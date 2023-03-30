// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import { BigNumber, ethers } from "ethers";
import path from "path";
import getDeployedContracts from "./utils/deployedContracts";

async function main() {

    const network = hre.network.name;
    const { itemsSC, inventorySC, arcadiansSC } = await getDeployedContracts(network);

    const payAmount = await arcadiansSC.mintPrice()
    let tx = await arcadiansSC.mint({value: payAmount});
    await tx.wait();
    const minterAddress = await arcadiansSC.signer.getAddress();
    
    console.log("minterAddress: ", minterAddress);
    const balance = await arcadiansSC.balanceOf(minterAddress);
    console.log("balance: ", balance);
    const ownedTokens = [];
    for (let i = 0; i < balance; i++) {
        const arcadianId: BigNumber = await arcadiansSC.tokenOfOwnerByIndex(minterAddress, i)
        ownedTokens.push(arcadianId.toNumber());
    }
    console.log("ownedTokens: ", ownedTokens);
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  