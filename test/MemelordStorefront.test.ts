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
import { buildProofs, Proof } from '../scripts/generate-merkle-tree';

describe('MemelordStorefront contract', () => {
  let tokenContract: RektMemelordsEditions;
  let storefrontContract: MemelordStorefront;
  let testTokenArgs: TokenArgs;
  let storefrontArgs: StoreFrontArgs;
  let proofs: Proof[];

  let deployer: SignerWithAddress;
  let royaltySafe: SignerWithAddress;
  let devWallet: SignerWithAddress;
  let hmooreWallet: SignerWithAddress;
  let saintWallet: SignerWithAddress;
  let normie1: SignerWithAddress;
  let normie2: SignerWithAddress;
  let allowlist1: SignerWithAddress;
  let allowlist2: SignerWithAddress;
  let allowlist3: SignerWithAddress;

  before(async () => {
    [
      deployer,
      royaltySafe,
      devWallet,
      hmooreWallet,
      saintWallet,
      normie1,
      normie2,
      allowlist1,
      allowlist2,
      allowlist3,
    ] = await ethers.getSigners();

    const allowlist = [
      allowlist1.address,
      allowlist2.address,
      allowlist3.address,
    ];
    let allowlistRoot: string;

    ({ proofs, allowlistRoot } = buildProofs(allowlist));

    testTokenArgs = {
      royaltySafe: royaltySafe.address,
      devWallet: devWallet.address,
      hmooreWallet: hmooreWallet.address,
      saintWallet: saintWallet.address,
    };

    storefrontArgs = {
      tokenAddress: '',
      allowlistRoot,
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
      await storefrontContract.connect(devWallet).pause();

      await storefrontContract.connect(devWallet).unpause();
      expect(await storefrontContract.paused()).to.equal(false);
    });
  });
});
