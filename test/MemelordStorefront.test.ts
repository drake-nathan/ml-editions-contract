import { ethers } from 'hardhat';
import { expect } from 'chai';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import type {
  MemelordStorefront,
  RektMemelordsEditions,
  MemeLordDistrict,
} from '../typechain-types';
import {
  deployTokenContract,
  deployStoreFrontContract,
  deployMldContract,
} from '../scripts/deployers';
import type { TokenArgs, StoreFrontArgs, MldArgs } from '../scripts/args';
import { delegateAddress } from '../utils/constants';

describe('MemelordStorefront contract', () => {
  let tokenContract: RektMemelordsEditions;
  let storefrontContract: MemelordStorefront;
  let mldContract: MemeLordDistrict;

  let mldAddress = '0x0000000';
  let tokenAddress = '0x0000000';

  let tokenArgs: TokenArgs;
  let storefrontArgs: StoreFrontArgs;
  let mldArgs: MldArgs;

  let deployer: SignerWithAddress;
  let royaltySafe: SignerWithAddress;
  let devWallet: SignerWithAddress;
  let hmooreWallet: SignerWithAddress;
  let saintWallet: SignerWithAddress;
  let normie1: SignerWithAddress;
  let normie2: SignerWithAddress;

  before(async () => {
    [
      deployer,
      royaltySafe,
      devWallet,
      hmooreWallet,
      saintWallet,
      normie1,
      normie2,
    ] = await ethers.getSigners();

    tokenArgs = {
      royaltySafe: royaltySafe.address,
      devWallet: devWallet.address,
      hmooreWallet: hmooreWallet.address,
      saintWallet: saintWallet.address,
    };

    storefrontArgs = {
      delegateAddress,
      mldAddress,
      tokenAddress,
      payees: [devWallet.address, royaltySafe.address],
      paymentShares: [1, 9],
      devWallet: devWallet.address,
      hmooreWallet: hmooreWallet.address,
      saintWallet: saintWallet.address,
    };

    mldArgs = {
      _merkleRoot:
        '0x26393431d940e5e53b2cecee483378c02c8134bed2dea1a64189bcad1665a906',
      projectWallet: deployer.address,
      nateWallet: devWallet.address,
      saintWallet: saintWallet.address,
      hmooreWallet: hmooreWallet.address,
    };
  });

  beforeEach(async () => {
    try {
      mldContract = await (await deployMldContract(mldArgs)).deployed();
      storefrontArgs.mldAddress = mldContract.address;
    } catch (error) {
      console.error('MLD Deploy Error:', error);
    }

    try {
      tokenContract = await (await deployTokenContract(tokenArgs)).deployed();
      storefrontArgs.tokenAddress = tokenContract.address;
    } catch (error) {
      console.error('Token Deploy Error:', error);
    }

    try {
      storefrontContract = await (
        await deployStoreFrontContract(storefrontArgs)
      ).deployed();
    } catch (error) {
      console.error('Storefront Deploy Error:', error);
    }

    const tokenMinterRole = await tokenContract.MINTER_ROLE();
    const tokenAdminRole = await tokenContract.ADMIN_ROLE();
    await tokenContract
      .connect(devWallet)
      .grantRole(tokenMinterRole, storefrontContract.address);
    await tokenContract
      .connect(hmooreWallet)
      .grantRole(tokenAdminRole, storefrontContract.address);
  });

  describe('Deployment', () => {
    it('should deploy the storefront contract', async () => {
      expect(storefrontContract.address).to.be.a.properAddress;
    });

    it('should grant storefront contract minter role on token contract', async () => {
      const tokenMinterRole = await tokenContract.MINTER_ROLE();

      expect(
        await tokenContract.hasRole(
          tokenMinterRole,
          storefrontContract.address,
        ),
      ).to.equal(true);
    });
  });

  describe('Pausable', () => {
    it('cannot be paused by non-admin', async () => {
      await expect(
        storefrontContract.connect(normie1).pause(),
      ).to.be.revertedWith(
        `AccessControl: account ${normie1.address.toLowerCase()} is missing role ${await storefrontContract.ADMIN_ROLE()}`,
      );

      expect(await storefrontContract.paused()).to.equal(false);
    });

    it('can be paused by admin (hmoore)', async () => {
      await storefrontContract.connect(hmooreWallet).pause();
      expect(await storefrontContract.paused()).to.equal(true);
    });

    it('can be unpaused by admin (dev)', async () => {
      await storefrontContract.connect(hmooreWallet).pause();

      await storefrontContract.connect(devWallet).unpause();
      expect(await storefrontContract.paused()).to.equal(false);
    });
  });

  describe('Setup Mint', () => {
    const tokenId = 1;
    const maxSupply = 284;
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 10000;
    const uri = 'https://ipfs';

    const setupMint = async () => {
      await storefrontContract
        .connect(devWallet)
        .setupMint(tokenId, maxSupply, startTime, endTime, uri);
    };

    it('should be able to initialize mint on token contract', async () => {
      await setupMint();

      expect(await tokenContract.maxSupply(tokenId)).to.equal(maxSupply);
      expect(await storefrontContract.currentEdition()).to.equal(tokenId);
      expect(await tokenContract.currentEdition()).to.equal(tokenId);
    });

    describe('Open/Close Mint with Timestamps', () => {
      it('should automatically open the mint phase based on unix time', async () => {
        await setupMint();

        await time.increase(1000);

        expect(await storefrontContract.isMintOpen()).to.equal(true);
      });

      it('should automatically close the mint phase based on unix time', async () => {
        await setupMint();

        await time.increase(10001);

        expect(await storefrontContract.isMintOpen()).to.equal(false);
      });
    });
  });
});
