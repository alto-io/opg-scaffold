import '~helpers/hardhat-imports';
import '~helpers/hardhat-imports';
import '~tests/utils/chai-imports';
import { expect } from 'chai';
import path from "path";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import deployAndInitContractsFixture from './fixtures/deployAndInitContractsFixture';
import { ethers } from 'ethers';

export const TOKENS_PATH_ARCADIANS = path.join(__dirname, "../mocks/ownedArcadiansMock.json");

describe('Arcadians Diamond Test', function () {
    it('should deployer be owner', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const owner = await arcadiansContracts.diamond.owner();
        expect(owner).to.be.equal(namedAddresses.deployer);
    })
})

describe('Arcadians Diamond BaseUri Test', function () {
    it('should be able to set base URI', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const newBaseURI = "newbaseuri.io/";
        await arcadiansContracts.arcadiansFacet.setBaseURI(newBaseURI);
        expect(await arcadiansContracts.arcadiansFacet.baseURI()).to.be.equal(newBaseURI);
    })
})

describe('Arcadians Diamond Whitelist', function () {

    it('should be able to switch whitelist state', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        // disable and disable claim to test it
        expect(await arcadiansContracts.whitelistFacet.isWhitelistClaimActive()).to.be.true;
        await arcadiansContracts.whitelistFacet.setWhitelistClaimInactive();
        expect(await arcadiansContracts.whitelistFacet.isWhitelistClaimActive()).to.be.false;

        await expect(arcadiansContracts.arcadiansFacet.claimWhitelist(1)).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Whitelist_ClaimInactive");

        await arcadiansContracts.whitelistFacet.setWhitelistClaimActive();
        expect(await arcadiansContracts.whitelistFacet.isWhitelistClaimActive()).to.be.true;
    })

    it('should be able to claim arcadians if whitelisted', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        let balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer);
        expect(balance).to.be.equal(0);

        const elegibleAmount = 3;

        await expect(arcadiansContracts.arcadiansFacet.claimWhitelist(elegibleAmount)).
            to.be.revertedWithCustomError(arcadiansContracts.whitelistFacet, "Whitelist_ExceedsElegibleAmount");

        // Increase whitelist elegible
        await arcadiansContracts.whitelistFacet.increaseWhitelistElegible(namedAddresses.deployer, elegibleAmount);
        expect(await arcadiansContracts.whitelistFacet.claimedWhitelist(namedAddresses.deployer)).to.be.equal(0);
        expect(await arcadiansContracts.whitelistFacet.elegibleWhitelist(namedAddresses.deployer)).to.be.equal(elegibleAmount);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedWhitelist()).to.be.equal(0);
        expect(await arcadiansContracts.whitelistFacet.totalElegibleWhitelist()).to.be.equal(elegibleAmount);
        
        // claim
        await arcadiansContracts.arcadiansFacet.claimWhitelist(elegibleAmount);
        expect(await arcadiansContracts.whitelistFacet.claimedWhitelist(namedAddresses.deployer)).to.be.equal(elegibleAmount);
        expect(await arcadiansContracts.whitelistFacet.elegibleWhitelist(namedAddresses.deployer)).to.be.equal(0);
        balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer);
        expect(balance).to.be.equal(elegibleAmount);
        expect(await arcadiansContracts.whitelistFacet.totalClaimedWhitelist()).to.be.equal(elegibleAmount);
        expect(await arcadiansContracts.whitelistFacet.totalElegibleWhitelist()).to.be.equal(0);

        // Should not claim more arcadians than the limit per user
        await arcadiansContracts.whitelistFacet.increaseWhitelistElegible(namedAddresses.deployer, 10);
        await expect(arcadiansContracts.arcadiansFacet.claimWhitelist(10)).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_MaximumMintedArcadiansPerUserReached");
    })
})

describe('Arcadians Diamond merkle', function () {

    it('should be able to claim tokens if elegible', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);

        let balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        
        expect(balance).to.be.equal(0)

        const amountToClaim = 1;
        let proof = arcadiansParams.merkleGenerator.generateProof(namedAddresses.deployer);
        const txRequest = await arcadiansContracts.arcadiansFacet.claimMerkle(amountToClaim, proof);
        const tx = await txRequest.wait();
        expect(tx.status).to.be.equal(1);

        balance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.deployer)
        expect(balance).to.be.equal(amountToClaim)
        expect(await arcadiansContracts.arcadiansFacet.totalClaimedMerkle()).to.be.equal(amountToClaim);
    })

    it('should not able to claim the same tokens twice', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const claimAmount = 1;
        let proof = arcadiansParams.merkleGenerator.generateProof(namedAddresses.deployer);
        await arcadiansContracts.arcadiansFacet.claimMerkle(claimAmount, proof);
        await expect(arcadiansContracts.arcadiansFacet.claimMerkle(claimAmount, proof)).
            to.be.revertedWithCustomError(arcadiansContracts.merkleFacet, "Merkle_AlreadyClaimed");
    })

    it('should not able to claim if merkle calim is not active', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const claimAmount = 1;
        let proof = arcadiansParams.merkleGenerator.generateProof(namedAddresses.deployer);
        await arcadiansContracts.merkleFacet.setMerkleClaimInactive();
        await expect(arcadiansContracts.arcadiansFacet.claimMerkle(claimAmount, proof)).
            to.be.revertedWithCustomError(arcadiansContracts.merkleFacet, "Merkle_ClaimInactive");
    })
    
    it('should not be able to claim a different amount of tokens', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const badClaimAmount = 2;
        let proof = arcadiansParams.merkleGenerator.generateProof(namedAddresses.deployer);
        await expect(arcadiansContracts.arcadiansFacet.claimMerkle(badClaimAmount, proof)).
            to.be.revertedWithCustomError(arcadiansContracts.merkleFacet, "Merkle_NotIncludedInMerkleTree");
    })

    it('should be able to update merkle root', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const newMerkleRoot = ethers.constants.HashZero;
        await arcadiansContracts.merkleFacet.updateMerkleRoot(newMerkleRoot);
        expect(await arcadiansContracts.merkleFacet.merkleRoot()).to.be.equal(newMerkleRoot);
    })
})

describe('mint limits', function () {

    it('Should be able to update mint price', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        
        const newMintPrice = arcadiansParams.mintPrice + 1;
        await arcadiansContracts.arcadiansFacet.setMintPrice(newMintPrice);
        expect(await arcadiansContracts.arcadiansFacet.mintPrice()).to.be.equal(newMintPrice);
    })
    
    it('Should be able to mint by paying the right amount ', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const previousBalance: BigInt = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.alice);
        await arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).mint({value: arcadiansParams.mintPrice})
        const newBalance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.alice);
        expect(newBalance).to.be.equal(Number(previousBalance) + 1)
    })

    it('Should not be able to mint without sending ether ', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.bob).mint()).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_InvalidPayAmount");
    })

    it('Should not be able to mint paying a wrong amount ', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const wrongMintPrice = arcadiansParams.mintPrice - 1;
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.bob).mint({value: wrongMintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_InvalidPayAmount");
    })

    // To run this test, the value MAX_SUPPLY should be updated in the 
    // contract to a smaller value (ie. 1)
    // it('Should be able to mint only until the max supply is reached ', async () => {
    //     const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
    //     const maxSupply = await arcadiansContracts.arcadiansFacet.maxSupply();
    //     console.log("maxSupply: ", maxSupply);
    //     await arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).mint({value: arcadiansParams.mintPrice});
    //     await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.alice).mint({value: arcadiansParams.mintPrice})).to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_MaximumArcadiansSupplyReached")
    // })
})

describe('mint max limit per user', function () {
    
    it('Should be able to update max mint limit ', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const currentMaxLimit = await arcadiansContracts.arcadiansFacet.maxMintPerUser();
        const newMaxLimit = Number(currentMaxLimit) + 1;
        await arcadiansContracts.arcadiansFacet.setMaxMintPerUser(newMaxLimit)
        expect(await arcadiansContracts.arcadiansFacet.maxMintPerUser()).to.be.equal(newMaxLimit)
    })
    
    it('Should be able to mint before reaching max limit', async () => {
        const { namedAccounts, namedAddresses, arcadiansContracts, itemsContracts, arcadiansParams, itemsParams } = await loadFixture(deployAndInitContractsFixture);
        const maxLimit = await arcadiansContracts.arcadiansFacet.maxMintPerUser();
        const currentBalance = await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.bob);
        const claimedAmount = await arcadiansContracts.arcadiansFacet.claimedAmountMerkle(namedAddresses.bob);
        
        let canMint = maxLimit - (currentBalance - claimedAmount);
        
        for (let i = 0; i < canMint; i++) {
            await arcadiansContracts.arcadiansFacet.connect(namedAccounts.bob).mint({value: arcadiansParams.mintPrice});
        }
        expect(await arcadiansContracts.arcadiansFacet.balanceOf(namedAddresses.bob)).to.be.equal(Number(maxLimit) + Number(claimedAmount));
        await expect(arcadiansContracts.arcadiansFacet.connect(namedAccounts.bob).mint({value: arcadiansParams.mintPrice})).
            to.be.revertedWithCustomError(arcadiansContracts.arcadiansFacet, "Arcadians_MaximumMintedArcadiansPerUserReached");
    })
});