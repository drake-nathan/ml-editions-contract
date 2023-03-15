import { ethers, upgrades } from 'hardhat';
import type {
  RektMemelordsEditions__factory,
  RektMemelordsEditions,
  MemelordStorefront__factory,
  MemelordStorefront,
  MemeLordDistrict__factory,
  MemeLordDistrict,
} from '../../typechain-types';
import type { MldArgs, TokenArgs, StoreFrontArgs } from './args/types';

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

  if (!args.tokenAddress) throw new Error('Missing token address on args.');

  const storeFrontContract: MemelordStorefront =
    (await StoreFrontFactory.deploy(
      args.delegateAddress,
      args.mldAddress,
      args.tokenAddress,
      args.payees,
      args.paymentShares,
      args.devWallet,
      args.hmooreWallet,
      args.saintWallet,
    )) as MemelordStorefront;

  return storeFrontContract;
};

export const deployMldContract = async (
  args: MldArgs,
): Promise<MemeLordDistrict> => {
  const MldFactory = (await ethers.getContractFactory(
    'MemeLordDistrict',
  )) as MemeLordDistrict__factory;

  const mldContract: MemeLordDistrict = (await MldFactory.deploy(
    args._merkleRoot,
    args.projectWallet,
    args.nateWallet,
    args.saintWallet,
    args.hmooreWallet,
  )) as MemeLordDistrict;

  return mldContract;
};
