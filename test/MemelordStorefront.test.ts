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
} from '../scripts/helpers/deployers';
import type {
  TokenArgs,
  StoreFrontArgs,
  MldArgs,
} from '../scripts/helpers/args/types';
import { delegateAddress, zeroAddress } from '../utils/constants';

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
  let mldOwner1: SignerWithAddress;
  let mldOwner2: SignerWithAddress;

  const setupMld = async () => {
    const totalSupply = 50;
    const tokensMintedOnDeploy = 15;
    const owner1Tokens = 3;
    const owner1TokenIds = [15, 16, 17];
    const owner2Tokens = 5;
    const owner2TokenIds = [18, 19, 20, 21, 22];
    const remainingTokens =
      totalSupply - tokensMintedOnDeploy - owner1Tokens - owner2Tokens;

    await mldContract
      .connect(deployer)
      .ownerMint(mldOwner1.address, owner1Tokens);
    await mldContract
      .connect(deployer)
      .ownerMint(mldOwner2.address, owner2Tokens);
    await mldContract
      .connect(deployer)
      .ownerMint(deployer.address, remainingTokens);

    return [owner1TokenIds, owner2TokenIds];
  };

  before(async () => {
    [
      deployer,
      royaltySafe,
      devWallet,
      hmooreWallet,
      saintWallet,
      normie1,
      normie2,
      mldOwner1,
      mldOwner2,
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

  describe('Token Contract Address', () => {
    it('should initialize with token address', async () => {
      expect(await storefrontContract.tokenAddress()).to.equal(
        tokenContract.address,
      );
    });

    it('should be able to update token address', async () => {
      await storefrontContract
        .connect(devWallet)
        .setTokenAddress(devWallet.address);

      expect(await storefrontContract.tokenAddress()).to.equal(
        devWallet.address,
      );
    });
  });

  describe('MLD Test Setup', () => {
    it('should deploy MLD', async () => {
      expect(mldContract.address).to.be.a.properAddress;
    });

    it('should mint mld tokens to test wallets', async () => {
      await setupMld();

      expect(await mldContract.balanceOf(mldOwner1.address)).to.equal(3);
      expect(await mldContract.balanceOf(mldOwner2.address)).to.equal(5);
    });

    it('should have a supply of 50', async () => {
      await setupMld();

      expect(await mldContract.totalSupply()).to.equal(50);
    });
  });

  describe('Mint', () => {
    const tokenId = 0;
    const freeTokenId = 1;
    const maxSupply = 284;
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 10000;
    const uri = 'https://ipfs';

    const setupMint = async () => {
      await storefrontContract
        .connect(devWallet)
        .setupMint(tokenId, maxSupply, startTime, endTime, uri, []);
    };

    const setupFreeClaim = async () => {
      await storefrontContract
        .connect(devWallet)
        .setupMint(freeTokenId, maxSupply, startTime, endTime, uri, []);

      await storefrontContract.connect(devWallet).setMintPrice(0);
      await storefrontContract.connect(devWallet).resetClaimedList();
    };

    it('should be able to initialize mint on token contract', async () => {
      await setupMint();

      expect(await tokenContract.maxSupply(tokenId)).to.equal(maxSupply);
      expect(await storefrontContract.currentEdition()).to.equal(tokenId);
      expect(await tokenContract.currentEdition()).to.equal(tokenId);
    });

    describe('Free Claim', () => {
      let owner1TokenIds: number[];
      let owner2TokenIds: number[];

      beforeEach(async () => {
        [owner1TokenIds, owner2TokenIds] = await setupMld();
        await setupMint();

        const mintPrice = await storefrontContract.mintPrice();
        const weiAmount = mintPrice.mul(owner1TokenIds.length);

        await storefrontContract
          .connect(mldOwner1)
          .claim(mldOwner1.address, owner1TokenIds, zeroAddress, {
            value: weiAmount,
          });

        await setupFreeClaim();
      });

      it('PML owner should be able to claim', async () => {
        await storefrontContract
          .connect(mldOwner1)
          .freeClaim(mldOwner1.address, owner1TokenIds, zeroAddress);

        expect(
          await tokenContract.balanceOf(mldOwner1.address, freeTokenId),
        ).to.equal(owner1TokenIds.length);
      });
    });

    describe('Claiming', () => {
      let owner1TokenIds: number[];
      let owner2TokenIds: number[];

      beforeEach(async () => {
        [owner1TokenIds, owner2TokenIds] = await setupMld();
        await setupMint();
      });

      it('mld owner can claim equivalent tokens', async () => {
        const mintPrice = await storefrontContract.mintPrice();
        const weiAmount = mintPrice.mul(owner1TokenIds.length);

        await storefrontContract
          .connect(mldOwner1)
          .claim(mldOwner1.address, owner1TokenIds, zeroAddress, {
            value: weiAmount,
          });

        expect(
          await tokenContract.balanceOf(mldOwner1.address, tokenId),
        ).to.equal(owner1TokenIds.length);
      });

      it('mld owner cannot claim again with the same token', async () => {
        const mintPrice = await storefrontContract.mintPrice();
        const weiAmount = mintPrice.mul(owner1TokenIds.length);

        await storefrontContract
          .connect(mldOwner1)
          .claim(mldOwner1.address, owner1TokenIds, zeroAddress, {
            value: weiAmount,
          });

        expect(
          await tokenContract.balanceOf(mldOwner1.address, tokenId),
        ).to.equal(owner1TokenIds.length);

        expect(
          storefrontContract
            .connect(mldOwner1)
            .claim(mldOwner1.address, owner1TokenIds, zeroAddress, {
              value: weiAmount,
            }),
        )
          .to.be.revertedWithCustomError(storefrontContract, 'TokenClaimed')
          .withArgs(owner1TokenIds[0]);
      });

      it('mld owner can claim in multiple transactions', async () => {
        const mintPrice = await storefrontContract.mintPrice();
        const weiAmount1 = mintPrice.mul(3);
        const weiAmount2 = mintPrice.mul(2);

        await storefrontContract
          .connect(mldOwner2)
          .claim(mldOwner2.address, [18, 19, 20], zeroAddress, {
            value: weiAmount1,
          });

        expect(
          await tokenContract.balanceOf(mldOwner2.address, tokenId),
        ).to.equal(3);

        await storefrontContract
          .connect(mldOwner2)
          .claim(mldOwner2.address, [21, 22], zeroAddress, {
            value: weiAmount2,
          });

        expect(
          await tokenContract.balanceOf(mldOwner2.address, tokenId),
        ).to.equal(5);
      });

      it('all tokens are marked claimed after mint', async () => {
        const mintPrice = await storefrontContract.mintPrice();
        const weiAmount1 = mintPrice.mul(3);
        const weiAmount2 = mintPrice.mul(5);

        const tokenIds = owner1TokenIds.concat(owner2TokenIds);

        await storefrontContract
          .connect(mldOwner1)
          .claim(mldOwner1.address, tokenIds.slice(0, 3), zeroAddress, {
            value: weiAmount1,
          });
        expect(
          await tokenContract.balanceOf(mldOwner1.address, tokenId),
        ).to.equal(3);

        await storefrontContract
          .connect(mldOwner2)
          .claim(mldOwner2.address, tokenIds.slice(-5), zeroAddress, {
            value: weiAmount2,
          });
        expect(
          await tokenContract.balanceOf(mldOwner2.address, tokenId),
        ).to.equal(5);

        await Promise.all(
          tokenIds.map(async (id) =>
            expect(await storefrontContract.claimed(id)).to.equal(true),
          ),
        );
      });

      it('no one else can claim using mld tokens', async () => {
        const mintPrice = await storefrontContract.mintPrice();
        const weiAmount = mintPrice.mul(2);

        await expect(
          storefrontContract
            .connect(normie1)
            .claim(normie1.address, [15, 16], zeroAddress, {
              value: weiAmount,
            }),
        )
          .to.be.revertedWithCustomError(
            storefrontContract,
            'NotOwnerOfMldToken',
          )
          .withArgs(normie1.address, 15);
      });
    });

    describe('Burning', () => {
      beforeEach(async () => {
        await setupMld();
        await setupMint();
      });

      it('should be able to burn mld to mint edition', async () => {
        await mldContract
          .connect(mldOwner1)
          .approve(storefrontContract.address, 15);

        await storefrontContract.connect(mldOwner1).burnAndClaim([15]);

        expect(
          await tokenContract.balanceOf(mldOwner1.address, tokenId),
        ).to.equal(1);
      });

      it('should be able to burn mld to mint multiple editions', async () => {
        await mldContract
          .connect(mldOwner2)
          .setApprovalForAll(storefrontContract.address, true);

        await storefrontContract.connect(mldOwner2).burnAndClaim([18, 19, 20]);

        expect(
          await tokenContract.balanceOf(mldOwner2.address, tokenId),
        ).to.equal(3);
      });
    });

    describe('Payment Splitter', () => {
      let owner1TokenIds: number[];
      let owner2TokenIds: number[];

      beforeEach(async () => {
        [owner1TokenIds, owner2TokenIds] = await setupMld();
        await setupMint();

        const mintPrice = await storefrontContract.mintPrice();
        const weiAmount1 = mintPrice.mul(3);
        const weiAmount2 = mintPrice.mul(5);

        const tokenIds = owner1TokenIds.concat(owner2TokenIds);

        await storefrontContract
          .connect(mldOwner1)
          .claim(mldOwner1.address, tokenIds.slice(0, 3), zeroAddress, {
            value: weiAmount1,
          });

        await storefrontContract
          .connect(mldOwner2)
          .claim(mldOwner2.address, tokenIds.slice(-5), zeroAddress, {
            value: weiAmount2,
          });
      });

      it('should have the correct contract balance', async () => {
        const mintPrice = await storefrontContract.mintPrice();
        const weiAmount = mintPrice.mul(8);
        const balance = await ethers.provider.getBalance(
          storefrontContract.address,
        );

        expect(balance).to.equal(weiAmount);
      });

      it('should be able to release funds to the safe', async () => {
        const mintPrice = await storefrontContract.mintPrice();
        const totalWei = mintPrice.mul(8);
        const bigShareWei = totalWei.mul(90).div(100);

        const balanceBeforeWei = await ethers.provider.getBalance(
          royaltySafe.address,
        );

        await storefrontContract
          .connect(hmooreWallet)
          ['release(address)'](royaltySafe.address);

        const balanceAfter = await ethers.provider.getBalance(
          royaltySafe.address,
        );

        const diffInWei = balanceAfter.sub(balanceBeforeWei);

        expect(diffInWei).to.equal(bigShareWei);
      });

      it('should be able to release funds to the dev', async () => {
        const mintPrice = await storefrontContract.mintPrice();

        const balanceBeforeWei = await ethers.provider.getBalance(
          devWallet.address,
        );

        await storefrontContract
          .connect(devWallet)
          ['release(address)'](devWallet.address);

        const balanceAfter = await ethers.provider.getBalance(
          devWallet.address,
        );

        expect(balanceAfter).to.be.gt(balanceBeforeWei);
      });

      it('cannot release funds to an unapproved address', async () => {
        await expect(
          storefrontContract
            .connect(normie2)
            ['release(address)'](normie1.address),
        ).to.be.revertedWith('PaymentSplitter: account has no shares');
      });
    });

    describe('Open/Close Mint with Timestamps', () => {
      it('should automatically open the mint phase based on unix time', async () => {
        await setupMint();

        await time.increase(1000);

        expect(await storefrontContract.isMintOpen()).to.equal(true);
      });

      it('should automatically close the mint phase based on unix time', async () => {
        await setupMint();

        await time.increase(endTime - startTime + 1000);

        expect(await storefrontContract.isMintOpen()).to.equal(false);
      });
    });
  });

  describe('Setters', () => {
    describe('Mint Price', () => {
      it('admin can manually set mint price', async () => {
        const mintPrice = ethers.utils.parseEther('0.069');
        await storefrontContract.connect(devWallet).setMintPrice(mintPrice);
        expect(await storefrontContract.mintPrice()).to.equal(mintPrice);
      });

      it('non-admin cannot manually set mint price', async () => {
        const mintPrice = ethers.utils.parseEther('0.069');
        await expect(
          storefrontContract.connect(normie1).setMintPrice(mintPrice),
        ).to.be.revertedWith(
          `AccessControl: account ${normie1.address.toLowerCase()} is missing role ${await storefrontContract.ADMIN_ROLE()}`,
        );
      });
    });

    describe('Current Edition', () => {
      it('admin can manually set current edition', async () => {
        await storefrontContract.connect(devWallet).setCurrentEditionId(69);
        expect(await storefrontContract.currentEdition()).to.equal(69);
      });

      it('non-admin cannot manually set current edition', async () => {
        await expect(
          storefrontContract.connect(normie1).setCurrentEditionId(69),
        ).to.be.revertedWith(
          `AccessControl: account ${normie1.address.toLowerCase()} is missing role ${await storefrontContract.ADMIN_ROLE()}`,
        );
      });
    });

    describe('Mint Per MLD', () => {
      it('admin can manually set mint per mld', async () => {
        await storefrontContract.connect(devWallet).setMintPerMld(69);
        expect(await storefrontContract.mintPerMld()).to.equal(69);
      });

      it('non-admin cannot manually set mint per mld', async () => {
        await expect(
          storefrontContract.connect(normie1).setMintPerMld(69),
        ).to.be.revertedWith(
          `AccessControl: account ${normie1.address.toLowerCase()} is missing role ${await storefrontContract.ADMIN_ROLE()}`,
        );
      });
    });
  });

  describe('Claimed', () => {
    const tokenId = 5;
    const tokenIds = [5, 7, 13, 42, 49];

    it('admin should be able to manually set a token as claimed', async () => {
      await storefrontContract.connect(devWallet).setClaimed(tokenId);

      expect(await storefrontContract.claimed(tokenId)).to.equal(true);
      expect(await storefrontContract.claimed(tokenId + 69)).to.equal(false);
    });

    it('non-admin should not be able to manually set a token as claimed', async () => {
      await expect(
        storefrontContract.connect(normie1).setClaimed(tokenId),
      ).to.be.revertedWith(
        `AccessControl: account ${normie1.address.toLowerCase()} is missing role ${await storefrontContract.ADMIN_ROLE()}`,
      );
    });

    it('admin can manually reset claim', async () => {
      await storefrontContract.connect(devWallet).setClaimed(tokenId);
      await storefrontContract.connect(devWallet).resetClaimed(tokenId);

      expect(await storefrontContract.claimed(tokenId)).to.equal(false);
    });

    it('admin can manually reset full claim list', async () => {
      await setupMld();

      await Promise.all(
        tokenIds.map(async (id) => {
          await storefrontContract.connect(devWallet).setClaimed(id);
        }),
      );

      await Promise.all(
        tokenIds.map(async (id) => {
          expect(await storefrontContract.claimed(id)).to.equal(true);
        }),
      );

      expect(await storefrontContract.claimed(1)).to.equal(false);

      await storefrontContract.connect(devWallet).resetClaimedList();

      await Promise.all(
        tokenIds.map(async (id) => {
          expect(await storefrontContract.claimed(id)).to.equal(false);
        }),
      );
    });
  });
});
