import '~helpers/hardhat-imports';
import { ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import hre from 'hardhat';
import MerkleGenerator from '~helpers/merkle-tree/merkleGenerator';
import path from "path";
import fs from "fs";
import deployArcadiansDiamond, { arcadiansDiamondName } from '../../deploy/hardhat-deploy/01.ArcadiansDiamond.deploy';
import deployItemsDiamond, { itemsDiamondInitName, itemsDiamondName, itemsFacetNames } from '../../deploy/hardhat-deploy/02.ItemsDiamond.deploy';
import initArcadiansDiamond from '../../deploy/hardhat-deploy/03.initArcadiansDiamond.deploy';
import initItemsDiamond from '../../deploy/hardhat-deploy/04.initItemsDiamond.deploy';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

export const TOKENS_PATH_ITEMS = path.join(__dirname, "../mocks/ownedItemsMock.json");

export async function deployItemsFixture() {
    const deploymentHardhatPath = path.join(__dirname, '../../generated/hardhat/deployments/hardhat');
    if (fs.existsSync(deploymentHardhatPath)) {
        fs.rmdirSync(deploymentHardhatPath, { recursive: true })
    }
    const deploymentLocalhostPath = path.join(__dirname, '../../generated/hardhat/deployments/localhost');
    if (fs.existsSync(deploymentLocalhostPath)) {
        fs.rmdirSync(deploymentLocalhostPath, { recursive: true })
    }

    const merkleGenerator = new MerkleGenerator(TOKENS_PATH_ITEMS);
    const baseTokenUri = "https://api.arcadians.io/";

    await deployArcadiansDiamond();
    await deployItemsDiamond();
    await initArcadiansDiamond();
    // await initItemsDiamond(null, baseTokenUri, merkleGenerator.merkleRoot);
    await initItemsDiamond();

    const namedAccounts = await hre.ethers.getNamedSigners();
    const namedAddresses = {
        deployer: (await namedAccounts.deployer.getAddress()),
        alice: (await namedAccounts.alice.getAddress()),
        bob: (await namedAccounts.bob.getAddress()),
    }
    const diamond = await hre.ethers.getContract(itemsDiamondName);
    const arcadiansDiamond = await hre.ethers.getContract(arcadiansDiamondName);
    const itemsInit = await hre.ethers.getContract(itemsDiamondInitName)
    const itemsFacet = await hre.ethers.getContractAt(itemsFacetNames.itemsFacet, diamond.address)
    
    const merkleFacet = await hre.ethers.getContractAt(itemsFacetNames.merkleFacet, diamond.address)
    const inventoryFacet = await hre.ethers.getContractAt(itemsFacetNames.inventoryFacet, diamond.address)
    const rolesFacet = await hre.ethers.getContractAt(itemsFacetNames.rolesFacet, diamond.address)

    let functionCall = itemsInit.interface.encodeFunctionData('init', [arcadiansDiamond.address, merkleGenerator.merkleRoot, baseTokenUri])
    let tx = await diamond.diamondCut([], itemsInit.address, functionCall)
    await tx.wait()

    return { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, rolesFacet, merkleGenerator, baseTokenUri };
}

describe('Items Diamond Test', function () {
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const owner = await diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })
})

describe('Items Diamond Inventory Test', function () {
    it('should be able to update arcadians address', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const newArcadiansAddress = inventoryFacet.address;
        await inventoryFacet.setArcadiansAddress(newArcadiansAddress);
        expect(await inventoryFacet.getArcadiansAddress()).to.be.equal(newArcadiansAddress);
    })

    it('should be able to mint', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        await itemsFacet.connect(namedAccounts.deployer).mint(namedAddresses.deployer, 1, 10, 1);
        const balanceToken1 = await itemsFacet.balanceOf(namedAddresses.deployer, 1);
        console.log("balanceToken1: ", balanceToken1);
    })
})

describe('Items Diamond merkle Test', function () {

    it('should not be able to claim tokens if not elegible', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);
        await expect(
            itemsFacet.connect(namedAccounts.alice).claimBatch(ids, amounts, proofs),
        ).to.be.revertedWith("Data not included in merkle");
    })

    it('should not be able to claim tokens if token data is wrong', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const ids = [1, 2];
        const badAmounts = [3, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);
        await expect(
            itemsFacet.connect(namedAccounts.deployer).claimBatch(ids, badAmounts, proofs),
        ).to.be.revertedWith("Data not included in merkle");
    })
    
    it('should be able to claim tokens if elegible', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);

        await itemsFacet.connect(namedAccounts.deployer).claimBatch(ids, amounts, proofs);

        for (let i = 0; i < ids.length; i++) {
            const balance = await itemsFacet.balanceOf(namedAddresses.deployer, ids[i])
            expect(balance).to.be.equal(amounts[i])
        }
    })

    it('should not able to claim the same tokens twice', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const ids = [1, 2];
        const amounts = [1, 2];
        const proofs = merkleGenerator.generateProofs(namedAddresses.deployer);
        await itemsFacet.claimBatch(ids, amounts, proofs)
        await expect(
            itemsFacet.claimBatch(ids, amounts, proofs)
        ).to.be.revertedWith("Already claimed");
    })

    it('should be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, inventoryFacet, merkleGenerator, baseTokenUri } = await loadFixture(deployItemsFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        await merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })
})