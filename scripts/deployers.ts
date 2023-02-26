import { ethers, upgrades } from 'hardhat';
import type {
  RektMemelordsEditions__factory,
  RektMemelordsEditions,
  MemelordStorefront__factory,
  MemelordStorefront,
} from '../typechain-types';
import type { StoreFrontArgs, TokenArgs } from './args';

export const deployTokenContract = async (
  args: TokenArgs,
): Promise<RektMemelordsEditions> => {
  const TokenFactory = (await ethers.getContractFactory(
    'RektMemelordsEditions',
  )) as RektMemelordsEditions__factory;

  const tokenContract: RektMemelordsEditions = (await upgrades.deployProxy(
    TokenFactory,
    [...Object.values(args)],
  )) as RektMemelordsEditions;

  return tokenContract;
};

export const deployStoreFrontContract = async (
  args: StoreFrontArgs,
): Promise<MemelordStorefront> => {
  const StoreFrontFactory = (await ethers.getContractFactory(
    'MemelordStorefront',
  )) as MemelordStorefront__factory;

  const storeFrontContract: MemelordStorefront =
    (await StoreFrontFactory.deploy(
      args.tokenAddress,
      args.allowlistRoot,
      args.payees,
      args.paymentShares,
      args.devWallet,
      args.hmooreWallet,
      args.saintWallet,
    )) as MemelordStorefront;

  return storeFrontContract;
};
