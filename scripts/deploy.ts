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

configDotenv();

const chainEnv = process.env.CHAIN;

if (!chainEnv) {
  throw new Error('Missing CHAIN env var.');
}

if (chainEnv !== 'mainnet' && chainEnv !== 'goerli') {
  throw new Error("CHAIN env var must be 'mainnet' or 'goerli'.");
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
};

deploy(chainEnv)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
