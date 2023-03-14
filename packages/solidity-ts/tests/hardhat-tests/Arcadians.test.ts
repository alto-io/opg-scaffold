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
export const TOKENS_PATH_ARCADIANS = path.join(__dirname, "../mocks/ownedArcadiansMock.json");

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
        
        merkleGenerator = new MerkleGenerator(TOKENS_PATH_ARCADIANS);
        tokensData = merkleGenerator.getOwnedArcadians();
        claimAddresses = Object.keys(tokensData);
        claimAmounts = Object.values(tokensData);
        await merkleFacet.updateMerkleRoot(merkleGenerator.merkleRoot);
    })

    beforeEach(async () => {
    });

    it('should be able to claim tokens if elegible', async () => {
        const amountToClaim = 1;
        let proof = merkleGenerator.generateProof(deployerAddress);
        const txRequest = await arcadiansFacet.claim(amountToClaim, proof);
        const tx = await txRequest.wait();
        expect(tx.status).to.be.equal(1);

        const balance = await arcadiansFacet.balanceOf(deployerAddress)
        expect(balance).to.be.equal(amountToClaim)
    })

    it('should not able to claim the same tokens twice', async () => {
        const claimAmount = 1;
        let proof = merkleGenerator.generateProof(deployerAddress);
        await expect(
            arcadiansFacet.claim(claimAmount, proof),
        ).to.be.revertedWith("All tokens claimed");
    })
    
    it('should not be able to claim a different amount of tokens', async () => {
        const badClaimAmount = 2;
        let proof = merkleGenerator.generateProof(deployerAddress);
        await expect(
            arcadiansFacet.claim(badClaimAmount, proof),
        ).to.be.revertedWith("Data not included in merkle");
    })

    it('should be able to update merkle root', async () => {
        const newMerkleRoot = ethers.constants.HashZero;
        await merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })
})

describe('mint max limit per user', function () {
    this.timeout(180000);

    // contracts
    let diamond: Contract;
    let arcadiansInit: Contract;
    let arcadiansFacet: Contract;
    let merkleFacet: Contract;
    let rolesFacet: Contract;

    // accounts
    let deployer: ethers.Signer
    let deployerAddress: string;
    let alice: ethers.Signer
    let bob: ethers.Signer
    let bobAddress: string;

    // roles
    let defaultAdminRole: string;
    let managerRole: string;
    let minterRole: string;

    // merkle
    let merkleGenerator: MerkleGenerator;
    let tokensData: any;
    let claimAddresses: string[];
    let claimAmounts: number[];

    // mint 
    let mintPrice: number;

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
        bob = namedAccounts.bob
        bobAddress = await bob.getAddress();

        diamond = await hre.ethers.getContract('ArcadiansDiamond');
        console.log("diamond.owner: ", await diamond.owner());
        
        arcadiansInit = await hre.ethers.getContract('ArcadiansInit')
        arcadiansFacet = await hre.ethers.getContractAt('ArcadiansFacet', diamond.address)
        merkleFacet = await hre.ethers.getContractAt('MerkleFacet', diamond.address)
        rolesFacet = await hre.ethers.getContractAt('RolesFacet', diamond.address)

        defaultAdminRole = await rolesFacet.getDefaultAdminRole();
        managerRole = await rolesFacet.getManagerRole();
        minterRole = await rolesFacet.getMinterRole();

        mintPrice = await arcadiansFacet.getMintPrice();
        
        merkleGenerator = new MerkleGenerator(TOKENS_PATH_ARCADIANS);
        tokensData = merkleGenerator.getOwnedArcadians();
        claimAddresses = Object.keys(tokensData);
        claimAmounts = Object.values(tokensData);
        await merkleFacet.updateMerkleRoot(merkleGenerator.merkleRoot);
    });

    it('Should be able to update mint price', async () => {
        const mintPrice = await arcadiansFacet.getMintPrice();
        console.log("mintPrice: ", mintPrice);
        
        const newMintPrice = mintPrice + 1;
        await arcadiansFacet.setMintPrice(newMintPrice);
        expect(await arcadiansFacet.getMintPrice()).to.be.equal(newMintPrice);
    })
    
    it('Should be able to mint by paying the right amount ', async () => {
        const aliceAddress = await alice.getAddress()
        const previousBalance: BigInt = await arcadiansFacet.balanceOf(aliceAddress);
        await arcadiansFacet.connect(alice).mint({value: mintPrice})
        const newBalance = await arcadiansFacet.balanceOf(aliceAddress);
        expect(newBalance).to.be.equal(Number(previousBalance) + 1)
    })

    it('Should not be able to mint without sending ether ', async () => {
        await expect(arcadiansFacet.connect(bob).mint()).to.be.revertedWith("Invalid pay amount")
    })

    it('Should not be able to mint paying a wrong amount ', async () => {
        const wrongMintPrice = mintPrice - 1;
        await expect(arcadiansFacet.connect(bob).mint({value: wrongMintPrice})).to.be.revertedWith("Invalid pay amount")
    })



    describe('mint max limit per user', function () {
        this.timeout(180000);
    
        // contracts
        let diamond: Contract;
        let arcadiansInit: Contract;
        let arcadiansFacet: Contract;
        let merkleFacet: Contract;
        let rolesFacet: Contract;
    
        // accounts
        let deployer: ethers.Signer
        let deployerAddress: string;
        let alice: ethers.Signer
        let bob: ethers.Signer
        let bobAddress: string;
    
        // roles
        let defaultAdminRole: string;
        let managerRole: string;
        let minterRole: string;
    
        // merkle
        let merkleGenerator: MerkleGenerator;
        let tokensData: any;
        let claimAddresses: string[];
        let claimAmounts: number[];
    
        // mint 
        let mintPrice: number;
    
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
            bob = namedAccounts.bob
            bobAddress = await bob.getAddress();
    
            diamond = await hre.ethers.getContract('ArcadiansDiamond');
            console.log("diamond.owner: ", await diamond.owner());
            
            arcadiansInit = await hre.ethers.getContract('ArcadiansInit')
            arcadiansFacet = await hre.ethers.getContractAt('ArcadiansFacet', diamond.address)
            merkleFacet = await hre.ethers.getContractAt('MerkleFacet', diamond.address)
            rolesFacet = await hre.ethers.getContractAt('RolesFacet', diamond.address)
    
            defaultAdminRole = await rolesFacet.getDefaultAdminRole();
            managerRole = await rolesFacet.getManagerRole();
            minterRole = await rolesFacet.getMinterRole();
    
            mintPrice = await arcadiansFacet.getMintPrice();
            
            merkleGenerator = new MerkleGenerator(TOKENS_PATH_ARCADIANS);
            tokensData = merkleGenerator.getOwnedArcadians();
            claimAddresses = Object.keys(tokensData);
            claimAmounts = Object.values(tokensData);
            await merkleFacet.updateMerkleRoot(merkleGenerator.merkleRoot);
        });
        
        it('Should be able to update max mint limit ', async () => {
            const currentMaxLimit = await arcadiansFacet.getMaxMintPerUser();
            const newMaxLimit = Number(currentMaxLimit) + 1;
            await arcadiansFacet.setMaxMintPerUser(newMaxLimit)
            expect(await arcadiansFacet.getMaxMintPerUser()).to.be.equal(newMaxLimit)
        })
        
        it('Should be able to mint before reaching max limit ', async () => {
            const maxLimit = await arcadiansFacet.getMaxMintPerUser();
            const currentBalance = await arcadiansFacet.balanceOf(bobAddress);
            const claimedAmount = await arcadiansFacet.getClaimedAmount(bobAddress);
            console.log("maxLimit: ", maxLimit);
            console.log("claimedAmount: ", claimedAmount);
            console.log("currentBalance: ", currentBalance);
            console.log("should mint: ", currentBalance - claimedAmount);
            
            let canMint = maxLimit - (currentBalance - claimedAmount);
            
            for (let i = 0; i < canMint; i++) {
                await arcadiansFacet.connect(bob).mint({value: mintPrice});
            }
            expect(await arcadiansFacet.balanceOf(bobAddress)).to.be.equal(Number(maxLimit) + Number(claimedAmount));
            await expect(arcadiansFacet.connect(bob).mint({value: mintPrice})).to.be.revertedWith("Max mint reached");
        })
    });
});