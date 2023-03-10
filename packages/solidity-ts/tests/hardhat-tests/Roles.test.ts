import '~helpers/hardhat-imports';
import { Contract, ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import hre from 'hardhat';
import path from "path";
import fs from "fs";
import MerkleGenerator from '~helpers/merkle-tree/merkleGenerator';
import { TOKENS_PATH } from './Items.test';

const deployDiamond = require('../../deploy/hardhat-deploy/02.ArcadiansDiamond.deploy')

describe('Roles setup', function () {
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
    let aliceAddress: string;
    let bob: ethers.Signer
    let bobAddress: string;

    // roles
    let defaultAdminRole: string;
    let managerRole: string;
    let minterRole: string;

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
        aliceAddress = await alice.getAddress();
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
    })

    beforeEach(async () => {
    });
    
    it('deployer should have all roles', async () => {
        const defaultAdminRole = await rolesFacet.getDefaultAdminRole();
        expect(await rolesFacet.hasRole(defaultAdminRole, deployerAddress)).to.be.true;
        const managerRole = await rolesFacet.getManagerRole();
        expect(await rolesFacet.hasRole(managerRole, deployerAddress)).to.be.true;
        const minterRole = await rolesFacet.getMinterRole();
        expect(await rolesFacet.hasRole(minterRole, deployerAddress)).to.be.true;
    })
    
    it('non deployer should not have roles by default', async () => {
        const aliceAddress = await alice.getAddress()
        expect(await rolesFacet.hasRole(defaultAdminRole, aliceAddress)).to.be.false;
        expect(await rolesFacet.hasRole(managerRole, aliceAddress)).to.be.false;
        expect(await rolesFacet.hasRole(minterRole, aliceAddress)).to.be.false;
    })
    
    it('default admin should be able to add role to account', async () => {
        expect(await rolesFacet.hasRole(managerRole, aliceAddress)).to.be.false;
        await rolesFacet.grantRole(managerRole, aliceAddress);
        expect(await rolesFacet.hasRole(managerRole, aliceAddress)).to.be.true;
    })
});

describe('Arcadians roles', function () {
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
    let aliceAddress: string;

    // roles
    let defaultAdminRole: string;
    let managerRole: string;
    let minterRole: string;

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
        aliceAddress = await alice.getAddress();

        diamond = await hre.ethers.getContract('ArcadiansDiamond');
        console.log("diamond.owner: ", await diamond.owner());
        
        arcadiansInit = await hre.ethers.getContract('ArcadiansInit')
        arcadiansFacet = await hre.ethers.getContractAt('ArcadiansFacet', diamond.address)
        merkleFacet = await hre.ethers.getContractAt('MerkleFacet', diamond.address)
        rolesFacet = await hre.ethers.getContractAt('RolesFacet', diamond.address)

        defaultAdminRole = await rolesFacet.getDefaultAdminRole();
        managerRole = await rolesFacet.getManagerRole();
        minterRole = await rolesFacet.getMinterRole();
    })

    beforeEach(async () => {
    });

    it('manager should be able to update baseURI', async () => {
        const newBaseURI = "newBaseURI";
        await arcadiansFacet.setBaseURI(newBaseURI);
        expect(await arcadiansFacet.getBaseURI()).to.be.equal(newBaseURI);
    })

    it('non-manager should not able to update baseURI', async () => {
        const newBaseURI = "newBaseURI";
        const aliceAddress = (await alice.getAddress()).toLocaleLowerCase();
        const managerRoleMissingError = `AccessControl: account ${aliceAddress} is missing role ${managerRole}`
        await expect(arcadiansFacet.connect(alice).setBaseURI(newBaseURI)).to.be.revertedWith(managerRoleMissingError);
    })

    it('should not be able to update merkle root if not the owner', async () => {
        const newMerkleRoot = ethers.constants.HashZero;
        const aliceAddress = (await alice.getAddress()).toLocaleLowerCase();
        const managerRoleMissingError = `AccessControl: account ${aliceAddress.toLocaleLowerCase()} is missing role ${managerRole}`
        await expect(
            merkleFacet.connect(alice).updateMerkleRoot(newMerkleRoot),
        ).to.be.revertedWith(managerRoleMissingError);
    })
});


describe('Items roles', function () {
    this.timeout(180000);

    // contracts
    let diamond: Contract;
    let itemsInit: Contract;
    let itemsFacet: Contract;
    let merkleFacet: Contract;
    let rolesFacet: Contract;

    // accounts
    let deployer: ethers.Signer
    let deployerAddress: string;
    let alice: ethers.Signer
    let aliceAddress: string;

    // roles
    let defaultAdminRole: string;
    let managerRole: string;
    let minterRole: string;

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
        aliceAddress = await alice.getAddress();

        diamond = await hre.ethers.getContract('ItemsDiamond');
        console.log("diamond.owner: ", await diamond.owner());
        
        itemsInit = await hre.ethers.getContract('ItemsInit')
        itemsFacet = await hre.ethers.getContractAt('ItemsFacet', diamond.address)
        merkleFacet = await hre.ethers.getContractAt('MerkleFacet', diamond.address)
        rolesFacet = await hre.ethers.getContractAt('RolesFacet', diamond.address)

        defaultAdminRole = await rolesFacet.getDefaultAdminRole();
        managerRole = await rolesFacet.getManagerRole();
        minterRole = await rolesFacet.getMinterRole();
        
        merkleGenerator = new MerkleGenerator(TOKENS_PATH);
        await merkleFacet.updateMerkleRoot(merkleGenerator.merkleRoot);

        tokensData = merkleGenerator.getOwnedItems();
        claimAddresses = Object.keys(tokensData);
        claimValues = Object.values(tokensData);
    })

    beforeEach(async () => {
    });

    it('account with manager role should be able to update merkle root', async () => {
        const newMerkleRoot = ethers.constants.HashZero;
        await merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })

    it('account without manager role shouldnt be able to update merkle root', async () => {
        const newMerkleRoot = ethers.constants.HashZero;
        const managerRoleMissingError = `AccessControl: account ${aliceAddress.toLocaleLowerCase()} is missing role ${managerRole}`
        await expect(merkleFacet.connect(alice).updateMerkleRoot(newMerkleRoot)).to.be.revertedWith(managerRoleMissingError);
    })
})