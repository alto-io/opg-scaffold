import '~helpers/hardhat-imports';
import { ethers } from "ethers";
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import deployAndInitContractsFixture from './fixtures/deployAndInitContractsFixture';

export async function deployAndInitPlusRolesFixture() {
    const deployFixture = await loadFixture(deployAndInitContractsFixture);
    
    const arcadianRoles = {
        defaultAdmin: await deployFixture.arcadiansContracts.rolesFacet.getDefaultAdminRole(),
        manager: await deployFixture.arcadiansContracts.rolesFacet.getManagerRole(),
        minter: await deployFixture.arcadiansContracts.rolesFacet.getMinterRole()
    }
    
    const itemsRoles = {
        defaultAdmin: await deployFixture.itemsContracts.rolesFacet.getDefaultAdminRole(),
        manager: await deployFixture.itemsContracts.rolesFacet.getManagerRole(),
        minter: await deployFixture.itemsContracts.rolesFacet.getMinterRole()
    }
    
    return {...deployFixture, arcadianRoles, itemsRoles};
}

describe('Roles setup arcadians', function () {
    
    it('deployer should have all roles', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.defaultAdmin, namedAddresses.deployer)).to.be.true;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.manager, namedAddresses.deployer)).to.be.true;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.minter, namedAddresses.deployer)).to.be.true;
    })
    
    it('non deployer should not have roles by default', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.defaultAdmin, namedAddresses.alice)).to.be.false;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.manager, namedAddresses.alice)).to.be.false;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.minter, namedAddresses.alice)).to.be.false;
    })
    
    it('default admin should be able to add role to account', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.minter, namedAddresses.bob)).to.be.false;
        await arcadiansContracts.rolesFacet.grantRole(itemsRoles.minter, namedAddresses.bob);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.minter, namedAddresses.bob)).to.be.true;
    })
});

describe('Roles setup Items', function () {
    
    it('deployer should have all roles', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.defaultAdmin, namedAddresses.deployer)).to.be.true;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.manager, namedAddresses.deployer)).to.be.true;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.minter, namedAddresses.deployer)).to.be.true;
    })
    
    it('non deployer should not have roles by default', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(arcadianRoles.defaultAdmin, namedAddresses.alice)).to.be.false;
        expect(await arcadiansContracts.rolesFacet.hasRole(arcadianRoles.manager, namedAddresses.alice)).to.be.false;
        expect(await arcadiansContracts.rolesFacet.hasRole(arcadianRoles.minter, namedAddresses.alice)).to.be.false;
    })
    
    it('default admin should be able to add role to account', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(arcadianRoles.manager, namedAddresses.bob)).to.be.false;
        await arcadiansContracts.rolesFacet.grantRole(arcadianRoles.manager, namedAddresses.bob);
        expect(await arcadiansContracts.rolesFacet.hasRole(arcadianRoles.manager, namedAddresses.bob)).to.be.true;
    })
});

describe('Arcadians roles', function () {
    it('manager should be able to update baseURI', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const newBaseURI = "newBaseURI";
        await arcadiansContracts.arcadiansFacet.setBaseURI(newBaseURI);
        expect(await arcadiansContracts.arcadiansFacet.getBaseURI()).to.be.equal(newBaseURI);
    })

    it('non-manager should not able to update baseURI', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const newBaseURI = "newBaseURI";
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${arcadianRoles.manager}`
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).setBaseURI(newBaseURI)).to.be.revertedWith(managerRoleMissingError);
    })

    it('should not be able to update merkle root without manager role', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${arcadianRoles.manager}`
        await expect(
            arcadiansContracts.merkleFacet.connect(namedAccounts.alice).updateMerkleRoot(newMerkleRoot),
        ).to.be.revertedWith(managerRoleMissingError);
    })
    
    it('Should not be able to update max mint limit without manager role', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const currentMaxLimit = await arcadiansContracts.arcadiansFacet.getMaxMintPerUser();
        const newMaxLimit = currentMaxLimit + 1;
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${arcadianRoles.manager}`
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).setMaxMintPerUser(newMaxLimit)).to.be.revertedWith(managerRoleMissingError)
        
    })
    
    it('Should not be able to update mint price without manager role', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const newMintPrice = arcadiansParams.mintPrice + 1;
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${arcadianRoles.manager}`
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).setMintPrice(newMintPrice)).to.be.revertedWith(managerRoleMissingError)
    })
});

describe('Items roles', function () {

    it('account with manager role should be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        await itemsContracts.merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await itemsContracts.merkleFacet.getMerkleRoot()).to.be.equal(newMerkleRoot);
    })

    it('account without manager role shouldnt be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${itemsRoles.manager}`
        await expect(itemsContracts.merkleFacet.connect(namedAccounts.alice).updateMerkleRoot(newMerkleRoot)).to.be.revertedWith(managerRoleMissingError);
    })

    it('account without minter role shouldnt be able to mint', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const managerRoleMissingError = `AccessControl: account ${namedAddresses.alice.toLocaleLowerCase()} is missing role ${itemsRoles.minter}`
        await expect(itemsContracts.itemsFacet.connect(namedAccounts.alice).mint(namedAddresses.alice, 1, 10)).to.be.revertedWith(managerRoleMissingError);
    })
})