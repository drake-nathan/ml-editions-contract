import { config as configDotenv } from 'dotenv';
import { deployStoreFrontContract } from './helpers/deployers';
import type { MemelordStorefront } from '../typechain-types';
import { storeFrontArgs } from './helpers/args';
import type { StoreFrontArgs, Chain } from './helpers/args/types';
import { writeArgs, writeContractInfo } from './helpers/fileWrites';
import contractsInfo from '../outputs/contractInfo.json';

configDotenv();

const chainEnv = process.env.CHAIN;

if (!chainEnv) {
  throw new Error('Missing CHAIN env var.');
}

if (chainEnv !== 'mainnet' && chainEnv !== 'goerli') {
  throw new Error("CHAIN env var must be 'mainnet' or 'goerli'.");
}

console.log({ contractsInfo });
const contracts = contractsInfo.filter(
  (contract) => contract.chain === chainEnv,
);
console.log({ contracts });
const { tokenAddress } = contracts[contracts.length - 1];
console.log({ tokenAddress });

if (!tokenAddress) {
  throw new Error('Missing token address in contract info file.');
}

const deploy = async (chain: Chain) => {
  console.info('Deploying storefront to:', chain);

  const storeFrontArgs_: StoreFrontArgs = storeFrontArgs[chain];

  let storeFrontContract: MemelordStorefront;

  storeFrontArgs_.tokenAddress = tokenAddress;

  try {
    console.info('Deploying store front contract...');
    storeFrontContract = await deployStoreFrontContract(storeFrontArgs_);
  } catch (error) {
    console.error('Storefront deployment error:', error);
    process.exit(1);
  }

  console.info('Storefront contract deployed at:', storeFrontContract.address);

  console.info('Writing contract info to file...');
  writeContractInfo(chain, tokenAddress, storeFrontContract.address);

  console.info(`Writing storefront args...`);
  writeArgs('storefront', storeFrontArgs_);
};

deploy(chainEnv)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
