import '~helpers/hardhat-imports';
import { ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import hre from 'hardhat';
import MerkleGenerator from '~helpers/merkle-tree/merkleGenerator';
import path from "path";
import fs from "fs";
import deployArcadiansDiamond, { arcadiansDiamondInitName, arcadiansDiamondName, arcadiansFacetNames } from '../../deploy/hardhat-deploy/01.ArcadiansDiamond.deploy';
import deployItemsDiamond, { itemsDiamondName } from '../../deploy/hardhat-deploy/02.ItemsDiamond.deploy';
import initArcadiansDiamond from '../../deploy/hardhat-deploy/03.initArcadiansDiamond.deploy';
import initItemsDiamond from '../../deploy/hardhat-deploy/04.initItemsDiamond.deploy';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

export const TOKENS_PATH_ARCADIANS = path.join(__dirname, "../mocks/ownedArcadiansMock.json");

export async function deployArcadiansFixture() {
    const deploymentHardhatPath = path.join(__dirname, '../../generated/hardhat/deployments/hardhat');
    if (fs.existsSync(deploymentHardhatPath)) {
        fs.rmdirSync(deploymentHardhatPath, { recursive: true })
    }
    const deploymentLocalhostPath = path.join(__dirname, '../../generated/hardhat/deployments/localhost');
    if (fs.existsSync(deploymentLocalhostPath)) {
        fs.rmdirSync(deploymentLocalhostPath, { recursive: true })
    }

    const merkleGenerator = new MerkleGenerator(TOKENS_PATH_ARCADIANS);
    const baseTokenUri = "https://api.arcadians.io/";
    const maxMintPerUser = 3;
    const mintPrice = 10;
    

    await deployArcadiansDiamond();
    await deployItemsDiamond();
    await initArcadiansDiamond();

    const namedAccounts = await hre.ethers.getNamedSigners();
    const namedAddresses = {
        deployer: (await namedAccounts.deployer.getAddress()),
        alice: (await namedAccounts.alice.getAddress()),
        bob: (await namedAccounts.bob.getAddress()),
    }
    const diamond = await hre.ethers.getContract(arcadiansDiamondName);
    const itemsDiamond = await hre.ethers.getContract(itemsDiamondName);
    const arcadiansInit = await hre.ethers.getContract(arcadiansDiamondInitName)
    const arcadiansFacet = await hre.ethers.getContractAt(arcadiansFacetNames.arcadiansFacet, diamond.address)
    const merkleFacet = await hre.ethers.getContractAt(arcadiansFacetNames.merkleFacet, diamond.address)
    const rolesFacet = await hre.ethers.getContractAt(arcadiansFacetNames.rolesFacet, diamond.address)
    const whitelistFacet = await hre.ethers.getContractAt(arcadiansFacetNames.whitelistFacet, diamond.address)

    let functionCall = arcadiansInit.interface.encodeFunctionData('init', [itemsDiamond.address, merkleGenerator.merkleRoot, baseTokenUri, maxMintPerUser, mintPrice])
    let tx = await diamond.diamondCut([], arcadiansInit.address, functionCall)
    await tx.wait()

    return { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, whitelistFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice };
}

describe('Arcadians Diamond Test', function () {
    this.timeout(10000)
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const owner = await diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })
})

describe('Arcadians Diamond Inventory Test', function () {
    it('should be able to update arcadians address', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const newInventoryAddress = diamond.address;
        const add = await arcadiansFacet.getInventoryAddress();
        await arcadiansFacet.setInventoryAddress(newInventoryAddress);
        expect(await arcadiansFacet.getInventoryAddress()).to.be.equal(newInventoryAddress);
    })

    it('should not be able to update arcadians address to a zero address', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const newInventoryAddress = ethers.constants.AddressZero;
        await expect(arcadiansFacet.setInventoryAddress(newInventoryAddress)).to.be.revertedWith("ArcadiansInternal._setInventoryAddress: Invalid address");
    })
})

describe('Arcadians Diamond Whitelist', function () {

    it('should be able to claim tokens if whitelisted', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, whitelistFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);

        let balance = await arcadiansFacet.balanceOf(namedAddresses.deployer);
        expect(balance).to.be.equal(0);

        const elegibleAmount = 10;

        await expect(arcadiansFacet.claimWhitelist(elegibleAmount)).
            to.be.revertedWith("WhitelistInternal._consumeWhitelist: amount exceeds elegible amount");

        await whitelistFacet.addToWhitelist(namedAddresses.deployer, elegibleAmount);
        expect(await whitelistFacet.getWhitelistClaimed(namedAddresses.deployer)).to.be.equal(0);
        expect(await whitelistFacet.getWhitelistBalance(namedAddresses.deployer)).to.be.equal(elegibleAmount);

        await arcadiansFacet.claimWhitelist(elegibleAmount);
        
        expect(await whitelistFacet.getWhitelistClaimed(namedAddresses.deployer)).to.be.equal(elegibleAmount);
        expect(await whitelistFacet.getWhitelistBalance(namedAddresses.deployer)).to.be.equal(0);
        balance = await arcadiansFacet.balanceOf(namedAddresses.deployer);
        expect(balance).to.be.equal(elegibleAmount);
    })
})

describe('Arcadians Diamond merkle', function () {

    it('should be able to claim tokens if elegible', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);

        let balance = await arcadiansFacet.balanceOf(namedAddresses.deployer)
        expect(balance).to.be.equal(0)

        const amountToClaim = 1;
        let proof = merkleGenerator.generateProof(namedAddresses.deployer);
        const txRequest = await arcadiansFacet.claimMerkle(amountToClaim, proof);
        const tx = await txRequest.wait();
        expect(tx.status).to.be.equal(1);

        balance = await arcadiansFacet.balanceOf(namedAddresses.deployer)
        expect(balance).to.be.equal(amountToClaim)
    })

    it('should not able to claim the same tokens twice', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const claimAmount = 1;
        let proof = merkleGenerator.generateProof(namedAddresses.deployer);
        await arcadiansFacet.claimMerkle(claimAmount, proof);
        await expect(
            arcadiansFacet.claimMerkle(claimAmount, proof)
        ).to.be.revertedWith("All tokens claimed");
    })
    
    it('should not be able to claim a different amount of tokens', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const badClaimAmount = 2;
        let proof = merkleGenerator.generateProof(namedAddresses.deployer);
        await expect(
            arcadiansFacet.claimMerkle(badClaimAmount, proof),
        ).to.be.revertedWith("Data not included in merkle");
    })

    it('should be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        await merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })
})

describe('mint max limit per user', function () {

    it('Should be able to update mint price', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        
        const newMintPrice = mintPrice + 1;
        await arcadiansFacet.setMintPrice(newMintPrice);
        expect(await arcadiansFacet.getMintPrice()).to.be.equal(newMintPrice);
    })
    
    it('Should be able to mint by paying the right amount ', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const previousBalance: BigInt = await arcadiansFacet.balanceOf(namedAddresses.alice);
        await arcadiansFacet.connect(namedAccounts.alice).mint({value: mintPrice})
        const newBalance = await arcadiansFacet.balanceOf(namedAddresses.alice);
        expect(newBalance).to.be.equal(Number(previousBalance) + 1)
    })

    it('Should not be able to mint without sending ether ', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        await expect(arcadiansFacet.connect(namedAccounts.bob).mint()).to.be.revertedWith("ArcadiansInternal._mint: Invalid pay amount")
    })

    it('Should not be able to mint paying a wrong amount ', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const wrongMintPrice = mintPrice - 1;
        await expect(arcadiansFacet.connect(namedAccounts.bob).mint({value: wrongMintPrice})).to.be.revertedWith("ArcadiansInternal._mint: Invalid pay amount")
    })
})

describe('mint max limit per user', function () {
    
    it('Should be able to update max mint limit ', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const currentMaxLimit = await arcadiansFacet.getMaxMintPerUser();
        const newMaxLimit = Number(currentMaxLimit) + 1;
        await arcadiansFacet.setMaxMintPerUser(newMaxLimit)
        expect(await arcadiansFacet.getMaxMintPerUser()).to.be.equal(newMaxLimit)
    })
    
    it('Should be able to mint before reaching max limit ', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice } = await loadFixture(deployArcadiansFixture);
        const maxLimit = await arcadiansFacet.getMaxMintPerUser();
        const currentBalance = await arcadiansFacet.balanceOf(namedAddresses.bob);
        const claimedAmount = await arcadiansFacet.getClaimedAmountMerkle(namedAddresses.bob);
        
        let canMint = maxLimit - (currentBalance - claimedAmount);
        
        for (let i = 0; i < canMint; i++) {
            await arcadiansFacet.connect(namedAccounts.bob).mint({value: mintPrice});
        }
        expect(await arcadiansFacet.balanceOf(namedAddresses.bob)).to.be.equal(Number(maxLimit) + Number(claimedAmount));
        await expect(arcadiansFacet.connect(namedAccounts.bob).mint({value: mintPrice})).to.be.revertedWith("ArcadiansInternal._mint: User maximum minted tokens reached");
    })
});