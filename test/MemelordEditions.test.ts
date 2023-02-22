import { ethers } from 'hardhat';
import { expect } from 'chai';
import { type SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { type Contract } from 'ethers';

describe('RektMemelordsEditions', function () {
  let contract: Contract;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    const Contract = await ethers.getContractFactory('RektMemelordsEditions');
    contract = await Contract.deploy();
    await contract.deployed();

    [owner] = await ethers.getSigners();
  });

  it('should allow the owner to set the URI', async function () {
    const newURI = 'https://example.com/token/{id}.json';
    await contract.connect(owner).setURI(newURI);
    const uri = await contract.uri(0);
    expect(uri).to.equal(newURI);
  });

  it('should allow the owner to pause and unpause the contract', async function () {
    await contract.connect(owner).pause();
    expect(await contract.paused()).to.be.true;

    await contract.connect(owner).unpause();
    expect(await contract.paused()).to.be.false;
  });

  it('should allow the owner to mint tokens', async function () {
    const recipient = ethers.Wallet.createRandom().address;
    const tokenId = 1;
    const amount = 10;

    await contract.connect(owner).mint(recipient, tokenId, amount, '0x');

    const balance = await contract.balanceOf(recipient, tokenId);
    expect(balance).to.equal(amount);
  });

  it('should allow the owner to mint multiple tokens', async function () {
    const recipient = ethers.Wallet.createRandom().address;
    const tokenIds = [1, 2, 3];
    const amounts = [10, 20, 30];

    await contract.connect(owner).mintBatch(recipient, tokenIds, amounts, '0x');

    const balances = await Promise.all(
      tokenIds.map((id) => contract.balanceOf(recipient, id)),
    );
    expect(balances).to.deep.equal(amounts);
  });
});
