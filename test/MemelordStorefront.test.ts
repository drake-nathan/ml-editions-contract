import { ethers } from 'hardhat';
import { expect } from 'chai';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type {
  MemelordStorefront,
  RektMemelordsEditions,
} from '../typechain-types';
import {
  deployTokenContract,
  deployStoreFrontContract,
} from '../scripts/deployers';
import type { TokenArgs, StoreFrontArgs } from '../scripts/args';

describe('MemelordStorefront contract', () => {
  let tokenContract: RektMemelordsEditions;
  let storefrontContract: MemelordStorefront;
  let deployer: SignerWithAddress;
  let royaltySafe: SignerWithAddress;
  let devWallet: SignerWithAddress;
  let hmooreWallet: SignerWithAddress;
  let saintWallet: SignerWithAddress;
  let nonOwner1: SignerWithAddress;
  let nonOwner2: SignerWithAddress;
  let testTokenArgs: TokenArgs;
  let storefrontArgs: StoreFrontArgs;

  before(async () => {
    [
      deployer,
      royaltySafe,
      devWallet,
      hmooreWallet,
      saintWallet,
      nonOwner1,
      nonOwner2,
    ] = await ethers.getSigners();

    testTokenArgs = {
      royaltySafe: royaltySafe.address,
      devWallet: devWallet.address,
      hmooreWallet: hmooreWallet.address,
      saintWallet: saintWallet.address,
    };

    storefrontArgs = {
      tokenAddress: '',
      allowlistRoot:
        '0x6e0181871788dd911c8f4e6ee4e342fecbd704ca4f0790639478bd00098513f5',
      payees: [devWallet.address, royaltySafe.address],
      paymentShares: [1, 9],
      devWallet: devWallet.address,
      hmooreWallet: hmooreWallet.address,
      saintWallet: saintWallet.address,
    };
  });

  beforeEach(async () => {
    tokenContract = await (await deployTokenContract(testTokenArgs)).deployed();
    storefrontArgs.tokenAddress = tokenContract.address;

    storefrontContract = await (
      await deployStoreFrontContract(storefrontArgs)
    ).deployed();

    const tokenMinterRole = await tokenContract.MINTER_ROLE();
    await tokenContract
      .connect(devWallet)
      .grantRole(tokenMinterRole, storefrontContract.address);
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
        storefrontContract.connect(nonOwner1).pause(),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await storefrontContract.ADMIN_ROLE()}`,
      );

      expect(await storefrontContract.paused()).to.equal(false);
    });

    it('can be paused by admin (hmoore)', async () => {
      await storefrontContract.connect(hmooreWallet).pause();
      expect(await storefrontContract.paused()).to.equal(true);
    });

    it('can be unpaused by admin (dev)', async () => {
      await storefrontContract.connect(devWallet).pause();

      await storefrontContract.connect(devWallet).unpause();
      expect(await storefrontContract.paused()).to.equal(false);
    });
  });
});
