import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type {
  RektMemelordsEditions,
  RektMemelordsEditions__factory,
} from '../typechain-types';
import { shouldSupportInterfaces } from './support/interface';
import type { Context } from 'mocha';

interface Args {
  royaltySafe: string;
  devWallet: string;
  hmooreWallet: string;
  saintWallet: string;
}

describe('RektMemelordsEditions contract', function () {
  let contract: RektMemelordsEditions;
  let deployer: SignerWithAddress;
  let royaltySafe: SignerWithAddress;
  let devWallet: SignerWithAddress;
  let hmooreWallet: SignerWithAddress;
  let saintWallet: SignerWithAddress;
  let nonOwner1: SignerWithAddress;
  let nonOwner2: SignerWithAddress;

  const deployContract = async () => {
    const Factory = (await ethers.getContractFactory(
      'RektMemelordsEditions',
    )) as RektMemelordsEditions__factory;

    [
      deployer,
      royaltySafe,
      devWallet,
      hmooreWallet,
      saintWallet,
      nonOwner1,
      nonOwner2,
    ] = await ethers.getSigners();

    const args: Args = {
      royaltySafe: royaltySafe.address,
      devWallet: devWallet.address,
      hmooreWallet: hmooreWallet.address,
      saintWallet: saintWallet.address,
    };

    contract = (await upgrades.deployProxy(Factory, [
      ...Object.values(args),
    ])) as RektMemelordsEditions;

    await contract.deployed();
  };

  beforeEach(async () => {
    await deployContract();
  });

  describe('Standard Behavior', () => {
    beforeEach(function () {
      (this as Context & { token: RektMemelordsEditions }).token = contract;
    });

    shouldSupportInterfaces(['ERC1155']);
  });

  describe('Access Control', () => {
    describe('On Contract Deploy', () => {
      it('assigns default admin role to hmooreWallet', async () => {
        expect(
          await contract.hasRole(
            await contract.DEFAULT_ADMIN_ROLE(),
            hmooreWallet.address,
          ),
        ).to.equal(true);
      });

      it('assigns plain admin role to hmooreWallet, saintWallet, devWallet', async () => {
        expect(
          await contract.hasRole(
            await contract.ADMIN_ROLE(),
            hmooreWallet.address,
          ),
        ).to.equal(true);
        expect(
          await contract.hasRole(
            await contract.ADMIN_ROLE(),
            saintWallet.address,
          ),
        ).to.equal(true);
        expect(
          await contract.hasRole(
            await contract.ADMIN_ROLE(),
            devWallet.address,
          ),
        ).to.equal(true);
      });

      it('assigns minter role to hmooreWallet & saintWallet', async () => {
        expect(
          await contract.hasRole(
            await contract.MINTER_ROLE(),
            hmooreWallet.address,
          ),
        ).to.equal(true);
        expect(
          await contract.hasRole(
            await contract.MINTER_ROLE(),
            saintWallet.address,
          ),
        ).to.equal(true);
      });

      it('does not assign minter role to devWallet', async () => {
        expect(
          await contract.hasRole(
            await contract.MINTER_ROLE(),
            devWallet.address,
          ),
        ).to.equal(false);
      });
    });

    describe('After Deploy', () => {
      it('plain admin cannot grant admin role to non-admin', async () => {
        await expect(
          contract
            .connect(devWallet)
            .grantRole(await contract.ADMIN_ROLE(), nonOwner1.address),
        ).to.be.revertedWith(
          `AccessControl: account ${devWallet.address.toLowerCase()} is missing role ${await contract.DEFAULT_ADMIN_ROLE()}`,
        );

        expect(
          await contract.hasRole(
            await contract.ADMIN_ROLE(),
            nonOwner1.address,
          ),
        ).to.equal(false);
      });

      it('normie cannot grant admin role to non-admin', async () => {
        await expect(
          contract
            .connect(nonOwner1)
            .grantRole(await contract.ADMIN_ROLE(), nonOwner2.address),
        ).to.be.revertedWith(
          `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await contract.DEFAULT_ADMIN_ROLE()}`,
        );

        expect(
          await contract.hasRole(
            await contract.ADMIN_ROLE(),
            nonOwner2.address,
          ),
        ).to.equal(false);
      });

      it('default admin can grant admin role to non-admin', async () => {
        await contract
          .connect(hmooreWallet)
          .grantRole(await contract.ADMIN_ROLE(), nonOwner1.address);

        expect(
          await contract.hasRole(
            await contract.ADMIN_ROLE(),
            nonOwner1.address,
          ),
        ).to.equal(true);
      });

      it('default admin can revoke admin role from admin', async () => {
        await contract
          .connect(hmooreWallet)
          .revokeRole(await contract.ADMIN_ROLE(), devWallet.address);

        expect(
          await contract.hasRole(
            await contract.ADMIN_ROLE(),
            devWallet.address,
          ),
        ).to.equal(false);
      });
    });
  });

  describe('Royalties', () => {
    it('sets to royaltySafe at 5% on deploy', async function () {
      const info = await contract.royaltyInfo(0, 100);
      expect(info[1].toNumber()).to.be.equal(5);
      expect(info[0]).to.be.equal(royaltySafe.address);
    });

    it('allows default admin to update the address and percentage', async () => {
      await contract
        .connect(hmooreWallet)
        .setRoyaltyInfo(saintWallet.address, 690);

      const info = await contract.royaltyInfo(0, 1000);
      expect(info[1].toNumber()).to.be.equal(69);
      expect(info[0]).to.be.equal(saintWallet.address);
    });

    it('does not allow non-owners to set the address', async () => {
      await expect(
        contract.connect(nonOwner1).setRoyaltyInfo(nonOwner1.address, 1000),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await contract.DEFAULT_ADMIN_ROLE()}`,
      );
    });
  });

  describe('Pausable', () => {
    it('cannot be paused by non-admin', async () => {
      await expect(contract.connect(nonOwner1).pause()).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await contract.ADMIN_ROLE()}`,
      );

      expect(await contract.paused()).to.equal(false);
    });

    it('can be paused by admin (hmoore)', async () => {
      await contract.connect(hmooreWallet).pause();
      expect(await contract.paused()).to.equal(true);
    });

    it('can be unpaused by admin (dev)', async () => {
      await contract.connect(devWallet).pause();

      await contract.connect(devWallet).unpause();
      expect(await contract.paused()).to.equal(false);
    });
  });

  describe('Token URI', () => {
    it('cannot be set by non-admin', async () => {
      await expect(
        contract.connect(nonOwner1).setTokenURI(0, 'test'),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await contract.ADMIN_ROLE()}`,
      );
    });

    it('can be set per token by admin', async () => {
      await contract.connect(devWallet).setTokenURI(0, 'test');
      expect(await contract.uri(0)).to.equal('test');

      await contract.connect(devWallet).setTokenURI(1, 'test2');
      expect(await contract.uri(1)).to.equal('test2');

      expect(await contract.uri(2)).to.equal('');
    });
  });
});
