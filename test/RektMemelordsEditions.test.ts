import { ethers } from 'hardhat';
import { expect } from 'chai';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { RektMemelordsEditions } from '../typechain-types';
import { shouldSupportInterfaces } from './support/interface';
import type { Context } from 'mocha';
import type { ContractTransaction } from 'ethers';
import { type TokenArgs } from '../scripts/args';
import { deployTokenContract } from '../scripts/deployers';

describe('RektMemelordsEditions contract', () => {
  let contract: RektMemelordsEditions;
  let deployer: SignerWithAddress;
  let royaltySafe: SignerWithAddress;
  let devWallet: SignerWithAddress;
  let hmooreWallet: SignerWithAddress;
  let saintWallet: SignerWithAddress;
  let nonOwner1: SignerWithAddress;
  let nonOwner2: SignerWithAddress;
  let testTokenArgs: TokenArgs;

  async function initializeEdition(
    account: SignerWithAddress,
    id: number,
    amount: number,
    uri: string,
  ): Promise<ContractTransaction> {
    return contract.connect(account).initializeEdition(id, amount, uri);
  }

  async function mintTokens(
    id: number,
    amount: number,
    from: SignerWithAddress,
    to: SignerWithAddress,
  ): Promise<ContractTransaction> {
    return contract.connect(from).mint(to.address, id, amount);
  }

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
  });

  beforeEach(async () => {
    contract = await (await deployTokenContract(testTokenArgs)).deployed();
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

  describe('Supply', () => {
    describe('maxSupply', () => {
      it('maxSupply is initially null (zero)', async () => {
        expect(await contract.maxSupply(0)).to.equal(0);
      });

      it('maxSupply cannot be set by non-admin', async () => {
        expect(
          contract.connect(nonOwner1).setMaxSupply(0, 100),
        ).to.be.revertedWith(
          `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await contract.ADMIN_ROLE()}`,
        );
      });

      it('maxSupply can be set by admin', async () => {
        await contract.connect(devWallet).setMaxSupply(0, 100);
        expect(await contract.maxSupply(0)).to.equal(100);
      });
    });

    describe('totalSupply', () => {
      it('totalSupply is tracked by token and can be read', async () => {
        await initializeEdition(devWallet, 0, 100, 'thisIsATokenURI');
        await mintTokens(0, 10, hmooreWallet, saintWallet);
        expect(await contract.totalSupply(0)).to.equal(10);

        await mintTokens(0, 10, hmooreWallet, saintWallet);
        expect(await contract.totalSupply(0)).to.equal(20);

        await initializeEdition(devWallet, 1, 100, 'thisIsATokenURI');
        await mintTokens(1, 69, hmooreWallet, saintWallet);
        expect(await contract.totalSupply(1)).to.equal(69);

        expect(await contract.totalSupply(2)).to.equal(0);
      });
    });

    describe('tokenIdsMinted', () => {
      it('tokenIdsMinted is tracked by token and can be read', async () => {
        await initializeEdition(devWallet, 0, 100, 'thisIsATokenURI');
        await mintTokens(0, 10, hmooreWallet, saintWallet);
        expect(await contract.tokenIdsMinted()).to.deep.equal([0]);

        await mintTokens(0, 10, hmooreWallet, saintWallet);
        expect(await contract.tokenIdsMinted()).to.deep.equal([0]);

        await initializeEdition(devWallet, 1, 100, 'thisIsATokenURI');
        await mintTokens(1, 69, hmooreWallet, saintWallet);
        expect(await contract.tokenIdsMinted()).to.deep.equal([0, 1]);

        await initializeEdition(devWallet, 69, 100, 'thisIsATokenURI');
        await mintTokens(69, 1, hmooreWallet, saintWallet);
        expect(await contract.tokenIdsMinted()).to.deep.equal([0, 1, 69]);
      });
    });
  });

  describe('Current Edition', () => {
    it('is initially token #0', async () => {
      expect(await contract.currentEdition()).to.equal(0);
    });

    it('cannot be set by non-admin', async () => {
      expect(
        contract.connect(nonOwner1).setCurrentEdition(1),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await contract.ADMIN_ROLE()}`,
      );
    });

    it('can be set by admin', async () => {
      await contract.connect(devWallet).setCurrentEdition(1);
      expect(await contract.currentEdition()).to.equal(1);
    });
  });

  describe('Initialize New Edition/Token', () => {
    it('non-admin cannot initialize', async () => {
      expect(
        initializeEdition(nonOwner1, 0, 69, 'bollocks'),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await contract.ADMIN_ROLE()}`,
      );
    });

    it('initializes new edition if admin with proper arguments', async () => {
      const token = 0;
      const maxSupply = 69;
      const uri = 'bollocks';
      await initializeEdition(saintWallet, token, maxSupply, uri);
      expect(await contract.maxSupply(token)).to.equal(maxSupply);
      expect(await contract.uri(token)).to.equal(uri);
      expect(await contract.currentEdition()).to.equal(token);
    });

    it('initializes again with random token', async () => {
      const token = 69;
      const maxSupply = 42_000;
      const uri = 'https://www.bollocks.com/';
      await initializeEdition(saintWallet, token, maxSupply, uri);
      expect(await contract.maxSupply(token)).to.equal(maxSupply);
      expect(await contract.uri(token)).to.equal(uri);
      expect(await contract.currentEdition()).to.equal(token);
    });
  });

  describe('Minting', () => {
    it('cannot mint without minter role', async () => {
      expect(mintTokens(0, 1, nonOwner1, nonOwner1)).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await contract.MINTER_ROLE()}`,
      );
    });

    it('cannot mint when paused', async () => {
      await contract.connect(hmooreWallet).pause();
      expect(await contract.paused()).to.equal(true);

      await expect(mintTokens(0, 1, hmooreWallet, nonOwner1)).to.be.reverted;
    });

    it('cannot mint if token/edition has not been initialized', async () => {
      await expect(mintTokens(0, 1, hmooreWallet, nonOwner1)).to.be.reverted;
    });

    it('cannot mint if not current edition', async () => {
      await contract.connect(devWallet).setMaxSupply(0, 100);
      await contract.connect(devWallet).setCurrentEdition(1);

      await expect(mintTokens(0, 1, hmooreWallet, nonOwner1)).to.be.reverted;
    });

    it('can mint if current edition, token initialized, has minter role, and maxSupply not exceeded', async () => {
      const tokenToMint = 1;

      await initializeEdition(devWallet, tokenToMint, 10, 'realUri');

      await mintTokens(tokenToMint, 3, hmooreWallet, nonOwner1);
      expect(await contract.balanceOf(nonOwner1.address, tokenToMint)).to.equal(
        3,
      );
      await mintTokens(tokenToMint, 7, hmooreWallet, nonOwner1);
      expect(await contract.balanceOf(nonOwner1.address, tokenToMint)).to.equal(
        10,
      );
    });

    it('cannot mint if maxSupply exceeded', async () => {
      const tokenToMint = 1;

      await initializeEdition(devWallet, tokenToMint, 10, 'realUri');

      await mintTokens(tokenToMint, 9, hmooreWallet, nonOwner1);
      await expect(mintTokens(tokenToMint, 2, hmooreWallet, nonOwner1)).to.be
        .reverted;
    });
  });

  describe('Transfers', async () => {
    beforeEach(async () => {
      const tokenToMint = 0;
      await initializeEdition(hmooreWallet, tokenToMint, 10, 'realUri');
      await mintTokens(tokenToMint, 1, hmooreWallet, nonOwner1);
    });

    it('cannot transfer when paused', async () => {
      await contract.connect(hmooreWallet).pause();
      expect(await contract.paused()).to.equal(true);

      await expect(
        contract
          .connect(nonOwner2)
          .safeTransferFrom(nonOwner1.address, nonOwner2.address, 0, 1, '0x'),
      ).to.be.reverted;
    });

    it('cannot transfer tokens if not owner or approved', async () => {
      await expect(
        contract
          .connect(nonOwner2)
          .safeTransferFrom(nonOwner1.address, nonOwner2.address, 0, 1, '0x'),
      ).to.be.revertedWith('ERC1155: caller is not token owner or approved');
    });

    it('can transfer token if owner of token', async () => {
      await contract
        .connect(nonOwner1)
        .safeTransferFrom(nonOwner1.address, nonOwner2.address, 0, 1, '0x');
      expect(await contract.balanceOf(nonOwner1.address, 0)).to.equal(0);
      expect(await contract.balanceOf(nonOwner2.address, 0)).to.equal(1);
    });

    it('can transfer token if approved', async () => {
      await contract
        .connect(nonOwner1)
        .setApprovalForAll(nonOwner2.address, true);
      await contract
        .connect(nonOwner2)
        .safeTransferFrom(nonOwner1.address, nonOwner2.address, 0, 1, '0x');
      expect(await contract.balanceOf(nonOwner1.address, 0)).to.equal(0);
      expect(await contract.balanceOf(nonOwner2.address, 0)).to.equal(1);
    });
  });

  describe('Burns', () => {
    beforeEach(async () => {
      const tokenToMint = 0;

      await contract
        .connect(devWallet)
        .initializeEdition(tokenToMint, 100, 'realUri');

      await contract
        .connect(hmooreWallet)
        .mint(nonOwner1.address, tokenToMint, 1);
    });

    it('cannot burn if not owner', async () => {
      await expect(
        contract.connect(nonOwner2).burn(nonOwner1.address, 0, 1),
      ).to.be.revertedWith('ERC1155: caller is not token owner or approved');
    });

    it('can burn if owner', async () => {
      await contract.connect(nonOwner1).burn(nonOwner1.address, 0, 1);
      expect(await contract.balanceOf(nonOwner1.address, 0)).to.equal(0);
    });
  });
});
