import '~helpers/hardhat-imports';
import { Contract, ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import hre from 'hardhat';
import path from "path";
import fs from "fs";
import MerkleGenerator from '~helpers/merkle-tree/merkleGenerator';
import { TOKENS_PATH_ITEMS, deployItemsFixture } from './Items.test';
import { TOKENS_PATH_ARCADIANS, deployArcadiansFixture } from './Arcadians.test';

import deployArcadiansDiamond from '../../deploy/hardhat-deploy/01.ArcadiansDiamond.deploy';
import deployItemsDiamond from '../../deploy/hardhat-deploy/02.ItemsDiamond.deploy';
import initArcadiansDiamond from '../../deploy/hardhat-deploy/03.initArcadiansDiamond.deploy';
import initItemsDiamond from '../../deploy/hardhat-deploy/04.initItemsDiamond.deploy';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

export async function deployArcadiansPlusRolesFixture() {
    const arcadiansFixture = await deployArcadiansFixture();
    
    const defaultAdminRole = await arcadiansFixture.rolesFacet.getDefaultAdminRole();
    const managerRole = await arcadiansFixture.rolesFacet.getManagerRole();
    const minterRole = await arcadiansFixture.rolesFacet.getMinterRole();
    
    return {...arcadiansFixture, defaultAdminRole, managerRole, minterRole};
}

export async function deployItemsPlusRolesFixture() {
    const itemsFixture = await deployItemsFixture();
    
    const defaultAdminRole = await itemsFixture.rolesFacet.getDefaultAdminRole();
    const managerRole = await itemsFixture.rolesFacet.getManagerRole();
    const minterRole = await itemsFixture.rolesFacet.getMinterRole();
    
    return {...itemsFixture, defaultAdminRole, managerRole, minterRole};
}

describe('Roles setup', function () {
    
    it('deployer should have all roles', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployArcadiansPlusRolesFixture)
        expect(await rolesFacet.hasRole(defaultAdminRole, namedAddresses.deployer)).to.be.true;
        expect(await rolesFacet.hasRole(managerRole, namedAddresses.deployer)).to.be.true;
        expect(await rolesFacet.hasRole(minterRole, namedAddresses.deployer)).to.be.true;
    })
    
    it('non deployer should not have roles by default', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployArcadiansPlusRolesFixture)
        expect(await rolesFacet.hasRole(defaultAdminRole, namedAddresses.alice)).to.be.false;
        expect(await rolesFacet.hasRole(managerRole, namedAddresses.alice)).to.be.false;
        expect(await rolesFacet.hasRole(minterRole, namedAddresses.alice)).to.be.false;
    })
    
    it('default admin should be able to add role to account', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployArcadiansPlusRolesFixture)
        expect(await rolesFacet.hasRole(managerRole, namedAddresses.alice)).to.be.false;
        await rolesFacet.grantRole(managerRole, namedAddresses.bob);
        expect(await rolesFacet.hasRole(managerRole, namedAddresses.bob)).to.be.true;
    })
});

describe('Arcadians roles', function () {
    it('manager should be able to update baseURI', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployArcadiansPlusRolesFixture)
        const newBaseURI = "newBaseURI";
        await arcadiansFacet.setBaseURI(newBaseURI);
        expect(await arcadiansFacet.getBaseURI()).to.be.equal(newBaseURI);
    })

    it('non-manager should not able to update baseURI', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployArcadiansPlusRolesFixture)
        const newBaseURI = "newBaseURI";
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${managerRole}`
        await expect(arcadiansFacet.connect(namedAccounts.alice).setBaseURI(newBaseURI)).to.be.revertedWith(managerRoleMissingError);
    })

    it('should not be able to update merkle root without manager role', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployArcadiansPlusRolesFixture)
        const newMerkleRoot = ethers.constants.HashZero;
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${managerRole}`
        await expect(
            merkleFacet.connect(namedAccounts.alice).updateMerkleRoot(newMerkleRoot),
        ).to.be.revertedWith(managerRoleMissingError);
    })
    
    it('Should not be able to update max mint limit without manager role', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployArcadiansPlusRolesFixture)
        const currentMaxLimit = await arcadiansFacet.getMaxMintPerUser();
        const newMaxLimit = currentMaxLimit + 1;
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${managerRole}`
        await expect(arcadiansFacet.connect(namedAccounts.alice).setMaxMintPerUser(newMaxLimit)).to.be.revertedWith(managerRoleMissingError)
        
    })
    
    it('Should not be able to update mint price without manager role', async () => {
        const { namedAccounts, namedAddresses, diamond, arcadiansInit, arcadiansFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, maxMintPerUser, mintPrice, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployArcadiansPlusRolesFixture)
        const newMintPrice = mintPrice + 1;
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${managerRole}`
        await expect(arcadiansFacet.connect(namedAccounts.alice).setMintPrice(newMintPrice)).to.be.revertedWith(managerRoleMissingError)
        
    })
});


describe('Items roles', function () {

    it('account with manager role should be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployItemsPlusRolesFixture)
        const newMerkleRoot = ethers.constants.HashZero;
        await merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })

    it('account without manager role shouldnt be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, diamond, itemsInit, itemsFacet, merkleFacet, rolesFacet, merkleGenerator, baseTokenUri, defaultAdminRole, managerRole, minterRole } = await loadFixture(deployItemsPlusRolesFixture)
        const newMerkleRoot = ethers.constants.HashZero;
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${managerRole}`
        await expect(merkleFacet.connect(namedAccounts.alice).updateMerkleRoot(newMerkleRoot)).to.be.revertedWith(managerRoleMissingError);
    })
})