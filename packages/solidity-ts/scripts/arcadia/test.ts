import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";

async function main() {

    const network = hre.network.name;
    const { itemsSC, whitelistArcadiansSC, mintPassFacetSC, arcadiansDiamondSC } = await getDeployedContracts(network);

    const signerAddress = await arcadiansDiamondSC.signer.getAddress();
    console.log("signerAddress", signerAddress);


    let tx = await whitelistArcadiansSC.setClaimActiveGuaranteedPool(true);
    await tx.wait();

    let isOpen = await whitelistArcadiansSC.isClaimActiveGuaranteedPool();
    console.log("isClaimActiveGuaranteedPool", isOpen)

    tx = await mintPassFacetSC.setClaimActiveMintPass(false);
    await tx.wait();

    isOpen = await whitelistArcadiansSC.isClaimActiveGuaranteedPool();
    console.log("isClaimActiveGuaranteedPool", isOpen)
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
});
  