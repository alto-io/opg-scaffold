// import { ethers } from "ethers";
import hre from "hardhat";
import fs from "fs";
import path from "path";

export default async function getDeployedContracts(network: string) {
    const deployedItemDiamondPath = path.join(__dirname, `../../../generated/hardhat/deployments/${network}/ItemsDiamond.json`);
    const deployedItemFacetPath = path.join(__dirname, `../../../generated/hardhat/deployments/${network}/ItemsFacet.json`);
    const deployedInventoryFacetPath = path.join(__dirname, `../../../generated/hardhat/deployments/${network}/InventoryFacet.json`);
    const deployedArcadiansDiamondPath = path.join(__dirname, `../../../generated/hardhat/deployments/${network}/ArcadiansDiamond.json`);
    const deployedArcadiansFacetPath = path.join(__dirname, `../../../generated/hardhat/deployments/${network}/ArcadiansFacet.json`);

    const itemsDiamond = JSON.parse(fs.readFileSync(deployedItemDiamondPath).toString());
    const itemsFacet = JSON.parse(fs.readFileSync(deployedItemFacetPath).toString());
    const inventoryFacet = JSON.parse(fs.readFileSync(deployedInventoryFacetPath).toString());
    const arcadiansDiamond = JSON.parse(fs.readFileSync(deployedArcadiansDiamondPath).toString());
    const arcadiansFacet = JSON.parse(fs.readFileSync(deployedArcadiansFacetPath).toString());

    const itemsSC = await hre.ethers.getContractAt(itemsFacet.abi, itemsDiamond.address);
    const inventorySC = await hre.ethers.getContractAt(inventoryFacet.abi, arcadiansDiamond.address);
    const arcadiansSC = await hre.ethers.getContractAt(arcadiansFacet.abi, arcadiansDiamond.address);
    
    return { itemsSC, inventorySC, arcadiansSC }
}