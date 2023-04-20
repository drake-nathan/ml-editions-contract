import { config as configDotenv } from 'dotenv';
import {
  deployTokenContract,
  deployStoreFrontContract,
} from './helpers/deployers';
import type {
  MemelordStorefront,
  RektMemelordsEditions,
} from '../typechain-types';
import { storeFrontArgs, tokenArgs } from './helpers/args';
import type { StoreFrontArgs, TokenArgs, Chain } from './helpers/args/types';
import { writeArgs, writeContractInfo } from './helpers/fileWrites';
import { ethers } from 'ethers';

configDotenv();

const chainEnv = process.env.CHAIN;
const testnetPrivateKey = process.env.TESTNET_PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_PRIVATE_KEY;
const infuraKey = process.env.INFURA_KEY;

if (!chainEnv || !testnetPrivateKey || !mainnetPrivateKey || !infuraKey) {
  throw new Error('Missing env var.');
}

if (chainEnv !== 'mainnet' && chainEnv !== 'goerli' && chainEnv !== 'sepolia') {
  throw new Error("CHAIN env var must be 'mainnet' or 'goerli' or 'sepolia'.");
}

const deploy = async (chain: Chain) => {
  console.info('Deploying contracts to:', chain);

  const tokenArgs_: TokenArgs = tokenArgs[chain];
  const storeFrontArgs_: StoreFrontArgs = storeFrontArgs[chain];

  let tokenContract: RektMemelordsEditions;
  let storeFrontContract: MemelordStorefront;

  try {
    console.info('Deploying token contract...');
    tokenContract = await deployTokenContract(tokenArgs_);
  } catch (error) {
    console.error('Token deployment error:', error);
    process.exit(1);
  }

  console.info('Token contract deployed at:', tokenContract.address);
  storeFrontArgs_.tokenAddress = tokenContract.address;

  try {
    console.info('Deploying store front contract...');
    storeFrontContract = await deployStoreFrontContract(storeFrontArgs_);
  } catch (error) {
    console.error('Storefront deployment error:', error);
    process.exit(1);
  }

  console.info('Storefront contract deployed at:', storeFrontContract.address);

  console.info('Writing contract info to file...');
  writeContractInfo(chain, tokenContract.address, storeFrontContract.address);

  console.info(`Writing token args...`);
  writeArgs('token', tokenArgs_);
  console.info(`Writing storefront args...`);
  writeArgs('storefront', storeFrontArgs_);

  try {
    const privateKey =
      chain === 'mainnet' ? mainnetPrivateKey : testnetPrivateKey;
    const provider = new ethers.providers.InfuraProvider(chain, infuraKey);
    const wallet = new ethers.Wallet(privateKey, provider);
    const tokenWithSigner = tokenContract.connect(wallet);

    const defaultAdminRole = tokenWithSigner.DEFAULT_ADMIN_ROLE();
    const adminRole = tokenWithSigner.ADMIN_ROLE();
    const minterRole = tokenWithSigner.MINTER_ROLE();

    console.info('Assigning adming role to storefront...');
    const tx1 = await tokenWithSigner.grantRole(
      adminRole,
      storeFrontContract.address,
    );
    await tx1.wait();

    console.info('Assigning minter role to storefront...');
    const tx2 = await tokenWithSigner.grantRole(
      minterRole,
      storeFrontContract.address,
    );
    await tx2.wait();

    console.info('Transferring ownership to hmoorewallet...');
    const tx3 = await tokenWithSigner.transferOwnership(
      tokenArgs_.hmooreWallet,
    );
    await tx3.wait();

    console.info('Revoking admin role from deployer...');
    const tx4 = await tokenWithSigner.revokeRole(adminRole, wallet.address);
    await tx4.wait();

    console.info('Revoking default admin role from deployer...');
    const tx5 = await tokenWithSigner.revokeRole(
      defaultAdminRole,
      wallet.address,
    );
    await tx5.wait();

    console.info('Successfully assigned roles!');
  } catch (error) {
    console.error('Error assigning roles', error);
    process.exit(1);
  }

  console.info('Done!');
};

deploy(chainEnv)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
