import { ethers } from 'hardhat';
import { expect } from 'chai';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { RektMemelordsEditions } from '../typechain-types';
import type { Context } from 'mocha';
import type { ContractTransaction } from 'ethers';
import { type TokenArgs } from '../scripts/helpers/args/types';
import { shouldSupportInterfaces } from './helpers/interface';
import { deployTokenContract } from '../scripts/helpers/deployers';

describe('RektMemelordsEditions contract', () => {
  let tokenContract: RektMemelordsEditions;
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
    return tokenContract.connect(account).initializeEdition(id, amount, uri);
  }

  async function mintTokens(
    id: number,
    amount: number,
    from: SignerWithAddress,
    to: SignerWithAddress,
  ): Promise<ContractTransaction> {
    return tokenContract.connect(from).mint(to.address, id, amount);
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
    tokenContract = await (await deployTokenContract(testTokenArgs)).deployed();
  });

  describe('Standard Behavior', () => {
    beforeEach(function () {
      (this as Context & { token: RektMemelordsEditions }).token =
        tokenContract;
    });

    shouldSupportInterfaces(['ERC1155']);
  });

  describe('Access Control', () => {
    describe('On Contract Deploy', () => {
      it('assigns default admin role to deployer', async () => {
        expect(
          await tokenContract.hasRole(
            await tokenContract.DEFAULT_ADMIN_ROLE(),
            deployer.address,
          ),
        ).to.equal(true);
      });

      it('assigns plain admin role to hmooreWallet, saintWallet, devWallet', async () => {
        expect(
          await tokenContract.hasRole(
            await tokenContract.ADMIN_ROLE(),
            hmooreWallet.address,
          ),
        ).to.equal(true);
        expect(
          await tokenContract.hasRole(
            await tokenContract.ADMIN_ROLE(),
            saintWallet.address,
          ),
        ).to.equal(true);
        expect(
          await tokenContract.hasRole(
            await tokenContract.ADMIN_ROLE(),
            devWallet.address,
          ),
        ).to.equal(true);
      });

      it('assigns minter role to hmooreWallet & saintWallet', async () => {
        expect(
          await tokenContract.hasRole(
            await tokenContract.MINTER_ROLE(),
            hmooreWallet.address,
          ),
        ).to.equal(true);
        expect(
          await tokenContract.hasRole(
            await tokenContract.MINTER_ROLE(),
            saintWallet.address,
          ),
        ).to.equal(true);
      });

      it('does not assign minter role to devWallet', async () => {
        expect(
          await tokenContract.hasRole(
            await tokenContract.MINTER_ROLE(),
            devWallet.address,
          ),
        ).to.equal(false);
      });
    });

    describe('After Deploy', () => {
      it('plain admin cannot grant admin role to non-admin', async () => {
        await expect(
          tokenContract
            .connect(devWallet)
            .grantRole(await tokenContract.ADMIN_ROLE(), nonOwner1.address),
        ).to.be.revertedWith(
          `AccessControl: account ${devWallet.address.toLowerCase()} is missing role ${await tokenContract.DEFAULT_ADMIN_ROLE()}`,
        );

        expect(
          await tokenContract.hasRole(
            await tokenContract.ADMIN_ROLE(),
            nonOwner1.address,
          ),
        ).to.equal(false);
      });

      it('normie cannot grant admin role to non-admin', async () => {
        await expect(
          tokenContract
            .connect(nonOwner1)
            .grantRole(await tokenContract.ADMIN_ROLE(), nonOwner2.address),
        ).to.be.revertedWith(
          `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await tokenContract.DEFAULT_ADMIN_ROLE()}`,
        );

        expect(
          await tokenContract.hasRole(
            await tokenContract.ADMIN_ROLE(),
            nonOwner2.address,
          ),
        ).to.equal(false);
      });

      it('default admin can grant admin role to non-admin', async () => {
        await tokenContract
          .connect(deployer)
          .grantRole(await tokenContract.ADMIN_ROLE(), nonOwner1.address);

        expect(
          await tokenContract.hasRole(
            await tokenContract.ADMIN_ROLE(),
            nonOwner1.address,
          ),
        ).to.equal(true);
      });

      it('default admin can revoke admin role from admin', async () => {
        await tokenContract
          .connect(deployer)
          .revokeRole(await tokenContract.ADMIN_ROLE(), devWallet.address);

        expect(
          await tokenContract.hasRole(
            await tokenContract.ADMIN_ROLE(),
            devWallet.address,
          ),
        ).to.equal(false);
      });

      it('default admin can grant minter role to non-admin', async () => {
        await tokenContract
          .connect(hmooreWallet)
          .grantRole(await tokenContract.MINTER_ROLE(), nonOwner2.address);

        expect(
          await tokenContract.hasRole(
            await tokenContract.MINTER_ROLE(),
            nonOwner2.address,
          ),
        ).to.equal(true);
      });

      it('admin can grant minter role', async () => {
        await tokenContract
          .connect(devWallet)
          .grantRole(await tokenContract.MINTER_ROLE(), nonOwner1.address);

        expect(
          await tokenContract.hasRole(
            await tokenContract.MINTER_ROLE(),
            nonOwner1.address,
          ),
        ).to.equal(true);
      });

      it('default admin can grant default admin', async () => {
        await tokenContract
          .connect(deployer)
          .grantRole(
            await tokenContract.DEFAULT_ADMIN_ROLE(),
            hmooreWallet.address,
          );

        expect(
          await tokenContract.hasRole(
            await tokenContract.DEFAULT_ADMIN_ROLE(),
            hmooreWallet.address,
          ),
        ).to.equal(true);
      });

      it('default admin can revoke default admin from self', async () => {
        await tokenContract
          .connect(deployer)
          .revokeRole(
            await tokenContract.DEFAULT_ADMIN_ROLE(),
            deployer.address,
          );

        expect(
          await tokenContract.hasRole(
            await tokenContract.DEFAULT_ADMIN_ROLE(),
            deployer.address,
          ),
        ).to.equal(false);
      });
    });
  });

  describe('Ownable', () => {
    it('deployer is owner on deploy', async () => {
      expect(await tokenContract.owner()).to.equal(deployer.address);
    });

    it('owner can transfer ownership', async () => {
      await tokenContract
        .connect(deployer)
        .transferOwnership(hmooreWallet.address);
      expect(await tokenContract.owner()).to.equal(hmooreWallet.address);
    });
  });

  describe('Royalties', () => {
    it('sets to royaltySafe at 5% on deploy', async function () {
      const info = await tokenContract.royaltyInfo(0, 100);
      expect(info[1].toNumber()).to.be.equal(5);
      expect(info[0]).to.be.equal(royaltySafe.address);
    });

    it('allows default admin to update the address and percentage', async () => {
      await tokenContract
        .connect(deployer)
        .setRoyaltyInfo(saintWallet.address, 690);

      const info = await tokenContract.royaltyInfo(0, 1000);
      expect(info[1].toNumber()).to.be.equal(69);
      expect(info[0]).to.be.equal(saintWallet.address);
    });

    it('does not allow non-owners to set the address', async () => {
      await expect(
        tokenContract
          .connect(nonOwner1)
          .setRoyaltyInfo(nonOwner1.address, 1000),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await tokenContract.DEFAULT_ADMIN_ROLE()}`,
      );
    });
  });

  describe('Pausable', () => {
    it('cannot be paused by non-admin', async () => {
      await expect(tokenContract.connect(nonOwner1).pause()).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await tokenContract.ADMIN_ROLE()}`,
      );

      expect(await tokenContract.paused()).to.equal(false);
    });

    it('can be paused by admin (hmoore)', async () => {
      await tokenContract.connect(hmooreWallet).pause();
      expect(await tokenContract.paused()).to.equal(true);
    });

    it('can be unpaused by admin (dev)', async () => {
      await tokenContract.connect(devWallet).pause();

      await tokenContract.connect(devWallet).unpause();
      expect(await tokenContract.paused()).to.equal(false);
    });
  });

  describe('Token URI', () => {
    it('cannot be set by non-admin', async () => {
      await expect(
        tokenContract.connect(nonOwner1).setTokenURI(0, 'test'),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await tokenContract.ADMIN_ROLE()}`,
      );
    });

    it('can be set per token by admin', async () => {
      await tokenContract.connect(devWallet).setTokenURI(0, 'test');
      expect(await tokenContract.uri(0)).to.equal('test');

      await tokenContract.connect(devWallet).setTokenURI(1, 'test2');
      expect(await tokenContract.uri(1)).to.equal('test2');

      expect(await tokenContract.uri(2)).to.equal('');
    });
  });

  describe('Supply', () => {
    describe('maxSupply', () => {
      it('maxSupply is initially null (zero)', async () => {
        expect(await tokenContract.maxSupply(0)).to.equal(0);
      });

      it('maxSupply cannot be set by non-admin', async () => {
        expect(
          tokenContract.connect(nonOwner1).setMaxSupply(0, 100),
        ).to.be.revertedWith(
          `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await tokenContract.ADMIN_ROLE()}`,
        );
      });

      it('maxSupply can be set by admin', async () => {
        await tokenContract.connect(devWallet).setMaxSupply(0, 100);
        expect(await tokenContract.maxSupply(0)).to.equal(100);
      });
    });

    describe('currentSupply', () => {
      it('currentSupply is tracked by token and can be read', async () => {
        await initializeEdition(devWallet, 0, 100, 'thisIsATokenURI');
        await mintTokens(0, 10, hmooreWallet, saintWallet);
        expect(await tokenContract.currentSupply(0)).to.equal(10);

        await mintTokens(0, 10, hmooreWallet, saintWallet);
        expect(await tokenContract.currentSupply(0)).to.equal(20);

        await initializeEdition(devWallet, 1, 100, 'thisIsATokenURI');
        await mintTokens(1, 69, hmooreWallet, saintWallet);
        expect(await tokenContract.currentSupply(1)).to.equal(69);

        expect(await tokenContract.currentSupply(2)).to.equal(0);
      });
    });

    describe('tokenIdsMinted', () => {
      it('tokenIdsMinted is tracked by token and can be read', async () => {
        await initializeEdition(devWallet, 0, 100, 'thisIsATokenURI');
        await mintTokens(0, 10, hmooreWallet, saintWallet);
        expect(await tokenContract.tokenIdsMinted()).to.deep.equal([0]);

        await mintTokens(0, 10, hmooreWallet, saintWallet);
        expect(await tokenContract.tokenIdsMinted()).to.deep.equal([0]);

        await initializeEdition(devWallet, 1, 100, 'thisIsATokenURI');
        await mintTokens(1, 69, hmooreWallet, saintWallet);
        expect(await tokenContract.tokenIdsMinted()).to.deep.equal([0, 1]);

        await initializeEdition(devWallet, 69, 100, 'thisIsATokenURI');
        await mintTokens(69, 1, hmooreWallet, saintWallet);
        expect(await tokenContract.tokenIdsMinted()).to.deep.equal([0, 1, 69]);
      });
    });
  });

  describe('Current Edition', () => {
    it('is initially token #0', async () => {
      expect(await tokenContract.currentEdition()).to.equal(0);
    });

    it('cannot be set by non-admin', async () => {
      expect(
        tokenContract.connect(nonOwner1).setCurrentEdition(1),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await tokenContract.ADMIN_ROLE()}`,
      );
    });

    it('can be set by admin', async () => {
      await tokenContract.connect(devWallet).setCurrentEdition(1);
      expect(await tokenContract.currentEdition()).to.equal(1);
    });
  });

  describe('Initialize New Edition/Token', () => {
    it('non-admin cannot initialize', async () => {
      expect(
        initializeEdition(nonOwner1, 0, 69, 'bollocks'),
      ).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await tokenContract.ADMIN_ROLE()}`,
      );
    });

    it('initializes new edition if admin with proper arguments', async () => {
      const token = 0;
      const maxSupply = 69;
      const uri = 'bollocks';
      await initializeEdition(saintWallet, token, maxSupply, uri);
      expect(await tokenContract.maxSupply(token)).to.equal(maxSupply);
      expect(await tokenContract.uri(token)).to.equal(uri);
      expect(await tokenContract.currentEdition()).to.equal(token);
    });

    it('initializes again with random token', async () => {
      const token = 69;
      const maxSupply = 42_000;
      const uri = 'https://www.bollocks.com/';
      await initializeEdition(saintWallet, token, maxSupply, uri);
      expect(await tokenContract.maxSupply(token)).to.equal(maxSupply);
      expect(await tokenContract.uri(token)).to.equal(uri);
      expect(await tokenContract.currentEdition()).to.equal(token);
    });
  });

  describe('Minting', () => {
    it('cannot mint without minter role', async () => {
      expect(mintTokens(0, 1, nonOwner1, nonOwner1)).to.be.revertedWith(
        `AccessControl: account ${nonOwner1.address.toLowerCase()} is missing role ${await tokenContract.MINTER_ROLE()}`,
      );
    });

    it('cannot mint when paused', async () => {
      await tokenContract.connect(hmooreWallet).pause();
      expect(await tokenContract.paused()).to.equal(true);

      await expect(mintTokens(0, 1, hmooreWallet, nonOwner1)).to.be.reverted;
    });

    it('cannot mint if token/edition has not been initialized', async () => {
      await expect(mintTokens(0, 1, hmooreWallet, nonOwner1)).to.be.reverted;
    });

    it('cannot mint if not current edition', async () => {
      await tokenContract.connect(devWallet).setMaxSupply(0, 100);
      await tokenContract.connect(devWallet).setCurrentEdition(1);

      await expect(mintTokens(0, 1, hmooreWallet, nonOwner1)).to.be.reverted;
    });

    it('can mint if current edition, token initialized, has minter role, and maxSupply not exceeded', async () => {
      const tokenToMint = 1;

      await initializeEdition(devWallet, tokenToMint, 10, 'realUri');

      await mintTokens(tokenToMint, 3, hmooreWallet, nonOwner1);
      expect(
        await tokenContract.balanceOf(nonOwner1.address, tokenToMint),
      ).to.equal(3);
      await mintTokens(tokenToMint, 7, hmooreWallet, nonOwner1);
      expect(
        await tokenContract.balanceOf(nonOwner1.address, tokenToMint),
      ).to.equal(10);
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
      await tokenContract.connect(hmooreWallet).pause();
      expect(await tokenContract.paused()).to.equal(true);

      await expect(
        tokenContract
          .connect(nonOwner2)
          .safeTransferFrom(nonOwner1.address, nonOwner2.address, 0, 1, '0x'),
      ).to.be.reverted;
    });

    it('cannot transfer tokens if not owner or approved', async () => {
      await expect(
        tokenContract
          .connect(nonOwner2)
          .safeTransferFrom(nonOwner1.address, nonOwner2.address, 0, 1, '0x'),
      ).to.be.revertedWith('ERC1155: caller is not token owner or approved');
    });

    it('can transfer token if owner of token', async () => {
      await tokenContract
        .connect(nonOwner1)
        .safeTransferFrom(nonOwner1.address, nonOwner2.address, 0, 1, '0x');
      expect(await tokenContract.balanceOf(nonOwner1.address, 0)).to.equal(0);
      expect(await tokenContract.balanceOf(nonOwner2.address, 0)).to.equal(1);
    });

    it('can transfer token if approved', async () => {
      await tokenContract
        .connect(nonOwner1)
        .setApprovalForAll(nonOwner2.address, true);
      await tokenContract
        .connect(nonOwner2)
        .safeTransferFrom(nonOwner1.address, nonOwner2.address, 0, 1, '0x');
      expect(await tokenContract.balanceOf(nonOwner1.address, 0)).to.equal(0);
      expect(await tokenContract.balanceOf(nonOwner2.address, 0)).to.equal(1);
    });
  });

  describe('Burns', () => {
    beforeEach(async () => {
      const tokenToMint = 0;

      await tokenContract
        .connect(devWallet)
        .initializeEdition(tokenToMint, 100, 'realUri');

      await tokenContract
        .connect(hmooreWallet)
        .mint(nonOwner1.address, tokenToMint, 1);
    });

    it('cannot burn if not owner', async () => {
      await expect(
        tokenContract.connect(nonOwner2).burn(nonOwner1.address, 0, 1),
      ).to.be.revertedWith('ERC1155: caller is not token owner or approved');
    });

    it('can burn if owner', async () => {
      await tokenContract.connect(nonOwner1).burn(nonOwner1.address, 0, 1);
      expect(await tokenContract.balanceOf(nonOwner1.address, 0)).to.equal(0);
    });
  });
});
