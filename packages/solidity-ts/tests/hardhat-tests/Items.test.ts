import '~helpers/hardhat-imports';
import { Contract, ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import hre from 'hardhat';
import MerkleGenerator from '~helpers/merkle-tree/merkleGenerator';
import path from "path";
import fs from "fs";

export const TOKENS_PATH_ITEMS = path.join(__dirname, "../mocks/ownedItemsMock.json");
const deployDiamond = require('../../deploy/hardhat-deploy/03.ItemsDiamond.deploy')

describe('Items Diamond Test', function () {
    this.timeout(180000);

    // contracts
    let diamond: Contract;
    let itemsInit: Contract;
    let itemsFacet: Contract;
    let merkleFacet: Contract;

    // accounts
    let deployer: ethers.Signer
    let deployerAddress: string;
    let alice: ethers.Signer

    before(async () => {
        const deploymentHardhatPath = path.join(__dirname, '../../generated/hardhat/deployments/hardhat');
        if (fs.existsSync(deploymentHardhatPath)) {
            fs.rmdirSync(deploymentHardhatPath, { recursive: true })
        }
        await deployDiamond.func()
        
        const namedAccounts = await hre.ethers.getNamedSigners();
        
        deployer = namedAccounts.deployer
        deployerAddress = await deployer.getAddress();
        alice = namedAccounts.alice

        diamond = await hre.ethers.getContract('ItemsDiamond');
        console.log("diamond.owner: ", await diamond.owner());
    });

    beforeEach(async () => {
    });
    
    it('should deployer be owner', async () => {
        const owner = await diamond.owner();
        expect(owner).to.be.equal(deployerAddress);
    })
})

describe('Items Diamond merkle Test', function () {
    this.timeout(180000);

    // contracts
    let diamond: Contract;
    let itemsInit: Contract;
    let itemsFacet: Contract;
    let merkleFacet: Contract;

    // accounts
    let deployer: ethers.Signer
    let deployerAddress: string;
    let alice: ethers.Signer
    let bob: ethers.Signer
    let bobAddress: string;

    // merkle
    let merkleGenerator: MerkleGenerator;
    let tokensData: any;
    let claimAddresses: string[];
    let claimValues: {ids: number[], amounts: number[]}[];

    before(async function () {
        // use deploy script to deploy diamond
        const deploymentHardhatPath = path.join(__dirname, '../../generated/hardhat/deployments/hardhat');
        if (fs.existsSync(deploymentHardhatPath)) {
            fs.rmdirSync(deploymentHardhatPath, { recursive: true })
        }
        await deployDiamond.func()
        
        const namedAccounts = await hre.ethers.getNamedSigners();
        
        deployer = namedAccounts.deployer
        deployerAddress = await deployer.getAddress();
        alice = namedAccounts.alice
        bob = namedAccounts.bob
        bobAddress = await bob.getAddress();

        diamond = await hre.ethers.getContract('ItemsDiamond');
        console.log("diamond.owner: ", await diamond.owner());
        
        itemsInit = await hre.ethers.getContract('ItemsInit')
        itemsFacet = await hre.ethers.getContractAt('ItemsFacet', diamond.address)
        merkleFacet = await hre.ethers.getContractAt('MerkleFacet', diamond.address)
        
        merkleGenerator = new MerkleGenerator(TOKENS_PATH_ITEMS);
        await merkleFacet.updateMerkleRoot(merkleGenerator.merkleRoot);

        tokensData = merkleGenerator.getOwnedItems();
        claimAddresses = Object.keys(tokensData);
        claimValues = Object.values(tokensData);
    })

    beforeEach(async () => {
    });

    it('should not be able to claim tokens if not elegible', async () => {
        for (let i = 0; i < claimAddresses.length; i++) {
            const address = claimAddresses[i];
            const ids = claimValues[i].ids;
            const badAmounts = claimValues[i].amounts.map((amount) => ++amount);
            const proofs = merkleGenerator.generateProofs(address);
            await expect(
                itemsFacet.claimBatch(deployerAddress, ids, badAmounts, proofs),
            ).to.be.revertedWith("Data not included in merkle");
        }
    })
    
    it('should be able to claim tokens if elegible', async () => {
        for (let i = 0; i < claimAddresses.length; i++) {
            const address = claimAddresses[i];
            const ids = claimValues[i].ids;
            const amounts = claimValues[i].amounts;
            const proofs = merkleGenerator.generateProofs(address);
            
            const txRequest = await itemsFacet.claimBatch(address, ids, amounts, proofs);
            const tx = await txRequest.wait();
            expect(tx.status).to.be.equal(1);
    
            for (let i = 0; i < ids.length; i++) {
                const balance = await itemsFacet.balanceOf(address, ids[i])
                expect(balance).to.be.equal(amounts[i])
            }
        }
    })

    it('should not able to claim the same tokens twice', async () => {
        for (let i = 0; i < claimAddresses.length; i++) {
            const address = claimAddresses[i];
            const ids = claimValues[i].ids;
            const amounts = claimValues[i].amounts;
            const proofs = merkleGenerator.generateProofs(address);
            await expect(
                itemsFacet.claimBatch(deployerAddress, ids, amounts, proofs),
            ).to.be.revertedWith("Already claimed");
        }
    })

    it('should be able to update merkle root', async () => {
        const newMerkleRoot = ethers.constants.HashZero;
        await merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })
})