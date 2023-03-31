import hre from "hardhat";
import getDeployedContracts from "./utils/deployedContracts";

interface MintItem {
    id: number,
    amount: number
}
const mintItemsList: MintItem[] = [
    { id: 0, amount: 10 },
    { id: 1, amount: 10 },
    { id: 2, amount: 10 },
    { id: 3, amount: 20 },
    { id: 4, amount: 20 },
    { id: 5, amount: 30 },
];

async function main() {
    const network = hre.network.name;
    const { itemsSC } = await getDeployedContracts(network);
    const accounts = await hre.getNamedAccounts();

    const recipientAddress = accounts.deployer;
    console.log("Items recipient address: ", recipientAddress);
    
    let tx = await itemsSC.mintBatch(recipientAddress, mintItemsList.map((item)=>item.id), mintItemsList.map((item)=>item.amount));
    await tx.wait();
    for (let i = 0; i < mintItemsList.length; i++) {
        const balance = await itemsSC.balanceOf(recipientAddress, mintItemsList[i].id);
        console.log(`- item id ${mintItemsList[i].id} balance: `, balance.toString());
    }
}

main().catch((error) => {
    console.error("error: ", error);
    process.exitCode = 1;
  });
  