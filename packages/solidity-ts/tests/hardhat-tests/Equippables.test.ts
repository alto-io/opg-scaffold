import '~helpers/hardhat-imports';
import { Contract, ethers } from "ethers";

import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';

import { expect } from 'chai';
const { assert } = require('chai')
import hre from 'hardhat';
import MerkleGenerator, { TokensData } from '~helpers/merkle-tree/merkleGenerator';
import path from "path";

const TOKENS_PATH = path.join(__dirname, "../mocks/merkleDataMock.json");

const deployDiamond = require('../../deploy/hardhat-deploy/0.Diamond.deploy')
  
describe('DiamondTest', function () {
    this.timeout(180000);

    let diamond: Contract;
    let diamondCutFacet: Contract;
    let arcadiansInit: Contract;
    let diamondLoupeFacet: Contract;
    let ownershipFacet: Contract;
    let equippableFacet: Contract;
    let deployer: string
    const addresses = []

    before(async function () {
        await deployDiamond.func()

        deployer = (await hre.getNamedAccounts()).deployer

        diamond = await hre.ethers.getContract('ArcadianDiamond');        
        arcadiansInit = await hre.ethers.getContract('ArcadiansInit')
        diamondCutFacet = await hre.ethers.getContract('DiamondCutFacet', diamond.address)
        diamondLoupeFacet = await hre.ethers.getContractAt('DiamondLoupeFacet', diamond.address)
        ownershipFacet = await hre.ethers.getContractAt('OwnershipFacet', diamond.address)
        equippableFacet = await hre.ethers.getContractAt('EquippableFacet', diamond.address)
    })

    beforeEach(async () => {
        // put stuff you need to run before each test here
    });

    it('should have three facets -- call to facetAddresses function', async () => {
        for (const address of await diamondLoupeFacet.facetAddresses()) {
            addresses.push(address)
        }
        assert.equal(addresses.length, 4)
    })
    
    it('should deployer be owner', async () => {
        const owner = await ownershipFacet.owner();
        expect(owner).to.be.equal(deployer);
    })

    describe("", function() {
        
    })
})

describe.only('DiamondTest merkle', function () {
    this.timeout(180000);

    // contracts
    let diamond: Contract;
    let arcadiansInit: Contract;
    let equippableFacet: Contract;
    let merkleFacet: Contract;

    // accounts
    let deployer: ethers.Signer
    let deployerAddress: string;
    let alice: ethers.Signer

    // merkle
    let proofs: string[][];
    let merkleGenerator: MerkleGenerator;
    let tokensData: TokensData;

    before(async function () {
        // use deploy script to deploy diamond
        await deployDiamond.func()
        
        const namedAccounts = await hre.ethers.getNamedSigners();
        console.log("namedAccounts: ", namedAccounts);
        
        deployer = namedAccounts.deployer
        deployerAddress = await deployer.getAddress();
        alice = namedAccounts.alice

        diamond = await hre.ethers.getContract('ArcadianDiamond');
        console.log("diamond.owner: ", await diamond.owner());
        
        arcadiansInit = await hre.ethers.getContract('ArcadiansInit')
        equippableFacet = await hre.ethers.getContractAt('EquippableFacet', diamond.address)
        merkleFacet = await hre.ethers.getContractAt('MerkleFacet', diamond.address)
        
        merkleGenerator = new MerkleGenerator(TOKENS_PATH);
        await merkleFacet.updateMerkleRoot(merkleGenerator.merkleRoot);

        proofs = await merkleGenerator.generateProof(deployerAddress);
        tokensData = await merkleGenerator.getTokens(deployerAddress);
    })

    beforeEach(async () => {
        // put stuff you need to run before each test here
    });
    
    it('should be able to claim tokens if elegible', async () => {
        const txRequest = await equippableFacet.claimBatch(deployerAddress, tokensData.ids, tokensData.amounts, proofs);
        const tx = await txRequest.wait();
        await expect(tx.status).to.be.equal(1);

        for (let i = 0; i < tokensData.ids.length; i++) {
            const balance = await equippableFacet.balanceOf(deployerAddress, tokensData.ids[i])
            expect(balance).to.be.equal(tokensData.amounts[i])
        }
    })

    it('should not able to claim the same tokens twice', async () => {
        await expect(
            equippableFacet.claimBatch(deployerAddress, tokensData.ids, tokensData.amounts, proofs),
        ).to.be.revertedWith("Already claimed");
    })
    
    it('should not be able to claim tokens if not elegible', async () => {
        const badTokensId = tokensData.ids.map(()=>555)

        await expect(
            equippableFacet.claimBatch(deployerAddress, badTokensId, tokensData.amounts, proofs),
        ).to.be.revertedWith("Not elegible to claim");
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