import '~helpers/hardhat-imports';
import { Contract, ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import hre from 'hardhat';
import MerkleGenerator from '~helpers/merkle-tree/merkleGenerator';
import path from "path";
import fs from "fs";

const deployDiamond = require('../../deploy/hardhat-deploy/02.ArcadiansDiamond.deploy')
const TOKENS_PATH = path.join(__dirname, "../mocks/ownedArcadiansMock.json");

describe('Arcadians Diamond Test', function () {
    this.timeout(180000);

    // contracts
    let diamond: Contract;
    let arcadiansInit: Contract;
    let arcadiansFacet: Contract;
    let merkleFacet: Contract;

    // accounts
    let deployer: ethers.Signer
    let deployerAddress: string;
    let alice: ethers.Signer

    beforeEach(async () => {
        const deploymentHardhatPath = path.join(__dirname, '../../generated/hardhat/deployments/hardhat');
        if (fs.existsSync(deploymentHardhatPath)) {
            fs.rmdirSync(deploymentHardhatPath, { recursive: true })
        }
        await deployDiamond.func()
        
        const namedAccounts = await hre.ethers.getNamedSigners();
        
        deployer = namedAccounts.deployer
        deployerAddress = await deployer.getAddress();
        alice = namedAccounts.alice

        diamond = await hre.ethers.getContract('ArcadiansDiamond');
        console.log("diamond.owner: ", await diamond.owner());
    });
    
    it('should deployer be owner', async () => {
        const owner = await diamond.owner();
        expect(owner).to.be.equal(deployerAddress);
    })
})

describe('Arcadians Diamond merkle', function () {
    this.timeout(180000);

    // contracts
    let diamond: Contract;
    let arcadiansInit: Contract;
    let arcadiansFacet: Contract;
    let merkleFacet: Contract;

    // accounts
    let deployer: ethers.Signer
    let deployerAddress: string;
    let alice: ethers.Signer

    // merkle
    let merkleGenerator: MerkleGenerator;
    let tokensData: any;
    let claimAddresses: string[];
    let claimAmounts: number[];

    before(async function () {
    })

    beforeEach(async () => {
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

        diamond = await hre.ethers.getContract('ArcadiansDiamond');
        console.log("diamond.owner: ", await diamond.owner());
        
        arcadiansInit = await hre.ethers.getContract('ArcadiansInit')
        arcadiansFacet = await hre.ethers.getContractAt('ArcadiansFacet', diamond.address)
        merkleFacet = await hre.ethers.getContractAt('MerkleFacet', diamond.address)
        
        merkleGenerator = new MerkleGenerator(TOKENS_PATH);
        tokensData = merkleGenerator.getOwnedArcadians();
        claimAddresses = Object.keys(tokensData);
        claimAmounts = Object.values(tokensData);
        await merkleFacet.updateMerkleRoot(merkleGenerator.merkleRoot);
    });

    it('should be able to claim tokens if elegible', async () => {
        for (let i = 0; i < claimAddresses.length; i++) {
            let proof = merkleGenerator.generateProof(claimAddresses[i]);
            const txRequest = await arcadiansFacet.claim(claimAddresses[i], claimAmounts[i], proof);
            const tx = await txRequest.wait();
            expect(tx.status).to.be.equal(1);
    
            const balance = await arcadiansFacet.balanceOf(claimAddresses[i])
            expect(balance).to.be.equal(claimAmounts[i])
        }
    })

    it('should not able to claim the same tokens twice', async () => {
        const claimAmount = tokensData[deployerAddress];
        for (let i = 0; i < claimAddresses.length; i++) {
            let proof = merkleGenerator.generateProof(claimAddresses[i]);
            await expect(
                arcadiansFacet.claim(deployerAddress, claimAmount, proof),
            ).to.be.revertedWith("All tokens claimed");
        }
    })
    
    it('should not be able to claim a different amount of tokens', async () => {
        for (let i = 0; i < claimAddresses.length; i++) {
            let proof = merkleGenerator.generateProof(claimAddresses[i]);
            const badClaimAmount = claimAmounts[i] + 1;
            await expect(
                arcadiansFacet.claim(deployerAddress, badClaimAmount, proof),
            ).to.be.revertedWith("Not elegible to claim");
        }
    })

    it('owner should be able to update merkle root', async () => {
        const newMerkleRoot = ethers.constants.HashZero;
        await merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })

    it('should not be able to update merkle root if not the owner', async () => {
        const newMerkleRoot = ethers.constants.HashZero;
        await expect(
            merkleFacet.connect(alice).updateMerkleRoot(newMerkleRoot),
        ).to.be.revertedWith("Not owner");
    })
})