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
        defaultAdmin: await deployFixture.arcadiansContracts.rolesFacet.defaultAdminRole(),
        manager: await deployFixture.arcadiansContracts.rolesFacet.managerRole(),
        automation: await deployFixture.arcadiansContracts.rolesFacet.automationRole()
    }
    
    const itemsRoles = {
        defaultAdmin: await deployFixture.itemsContracts.rolesFacet.defaultAdminRole(),
        manager: await deployFixture.itemsContracts.rolesFacet.managerRole(),
        automation: await deployFixture.itemsContracts.rolesFacet.automationRole()
    }
    
    return {...deployFixture, arcadianRoles, itemsRoles};
}

describe('Roles setup arcadians', function () {
    
    it('deployer should have admin and manager roles', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.defaultAdmin, namedAddresses.deployer)).to.be.true;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.manager, namedAddresses.deployer)).to.be.true;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.automation, namedAddresses.deployer)).to.be.false;
    })
    
    it('non deployer should not have roles by default', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.defaultAdmin, namedAddresses.alice)).to.be.false;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.manager, namedAddresses.alice)).to.be.false;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.automation, namedAddresses.alice)).to.be.false;
    })
    
    it('default admin should be able to add role to account', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.automation, namedAddresses.bob)).to.be.false;
        await arcadiansContracts.rolesFacet.grantRole(itemsRoles.automation, namedAddresses.bob);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.automation, namedAddresses.bob)).to.be.true;
    })
});

describe('Roles setup Items', function () {
    
    it('deployer should have admin & manager roles', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.defaultAdmin, namedAddresses.deployer)).to.be.true;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.manager, namedAddresses.deployer)).to.be.true;
        expect(await arcadiansContracts.rolesFacet.hasRole(itemsRoles.automation, namedAddresses.deployer)).to.be.false;
    })
    
    it('non deployer should not have roles by default', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        expect(await arcadiansContracts.rolesFacet.hasRole(arcadianRoles.defaultAdmin, namedAddresses.alice)).to.be.false;
        expect(await arcadiansContracts.rolesFacet.hasRole(arcadianRoles.manager, namedAddresses.alice)).to.be.false;
        expect(await arcadiansContracts.rolesFacet.hasRole(arcadianRoles.automation, namedAddresses.alice)).to.be.false;
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
        expect(await arcadiansContracts.arcadiansFacet.baseURI()).to.be.equal(newBaseURI);
    })

    it('non-manager should not able to update baseURI', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const newBaseURI = "newBaseURI";
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).setBaseURI(newBaseURI)).
            to.be.revertedWithCustomError(arcadiansContracts.rolesFacet, "Roles_MissingManagerRole")
    })

    // it('should not be able to update merkle root without manager role', async () => {
    //     const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
    //     const newMerkleRoot = ethers.constants.HashZero;
    //     await expect(itemsContracts.merkleFacet.connect(namedAccounts.alice).updateMerkleRoot(newMerkleRoot),).
    //         to.be.revertedWithCustomError(itemsContracts.rolesFacet, "Roles_MissingManagerRole")
    // })
    
    it('Should not be able to update max mint limit without manager role', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const currentMaxLimit = await arcadiansContracts.arcadiansFacet.maxMintPerUser();
        const newMaxLimit = currentMaxLimit + 1;
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).setMaxMintPerUser(newMaxLimit)).
            to.be.revertedWithCustomError(arcadiansContracts.rolesFacet, "Roles_MissingManagerRole");
    })
    
    it('Should not be able to update mint price without manager role', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        const newMintPrice = arcadiansParams.mintPrice + 1;
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).setMintPrice(newMintPrice)).
            to.be.revertedWithCustomError(arcadiansContracts.rolesFacet, "Roles_MissingManagerRole");
    })

    it('Should not be able to update add base modifiers without automation role', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
        await expect(arcadiansContracts.inventoryFacet.connect(namedAccounts.bob).addBaseModifierCoupons(namedAddresses.bob, [1], [1])).
            to.be.revertedWithCustomError(arcadiansContracts.rolesFacet, "Roles_MissingAutomationRole");
    })
});

// describe('Items roles', function () {

//     it('account with manager role should be able to update merkle root', async () => {
//         const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
//         const newMerkleRoot = ethers.constants.HashZero;
//         await itemsContracts.merkleFacet.updateMerkleRoot(newMerkleRoot);
//         expect(await itemsContracts.merkleFacet.merkleRoot()).to.be.equal(newMerkleRoot);
//     })

//     it('account without manager role shouldnt be able to update merkle root', async () => {
//         const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams, arcadianRoles, itemsRoles } = await loadFixture(deployAndInitPlusRolesFixture);
//         const newMerkleRoot = ethers.constants.HashZero;
//         await expect(itemsContracts.merkleFacet.connect(namedAccounts.alice).updateMerkleRoot(newMerkleRoot)).
//             to.be.revertedWithCustomError(itemsContracts.rolesFacet, "Roles_MissingManagerRole");
//     })
// })