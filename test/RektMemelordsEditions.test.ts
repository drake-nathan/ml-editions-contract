import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type {
  RektMemelordsEditions,
  RektMemelordsEditions__factory,
} from '../typechain-types';
import { shouldSupportInterfaces } from './support/interface';
import type { Context } from 'mocha';

describe('RektMemelordsEditions contract', function () {
  let contract: RektMemelordsEditions;
  let deployer: SignerWithAddress;
  let minter: SignerWithAddress;
  let nonOwnerAddr: SignerWithAddress;

  const deployContract = async () => {
    const Factory = await ethers.getContractFactory('RektMemelordsEditions');

    [deployer, minter, nonOwnerAddr] = await ethers.getSigners();

    contract = (await upgrades.deployProxy(Factory)) as RektMemelordsEditions;

    await contract.deployed();

    contract.connect(nonOwnerAddr);
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

  describe('Pausable', () => {
    it('can be paused', async () => {
      await contract.connect(deployer).pause();
      expect(await contract.paused()).to.equal(true);
    });

    it('can be unpaused', async () => {
      await contract.connect(deployer).pause();

      await contract.connect(deployer).unpause();
      expect(await contract.paused()).to.equal(false);
    });
  });
});
