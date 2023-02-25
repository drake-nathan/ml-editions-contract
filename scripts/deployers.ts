import { ethers, upgrades } from 'hardhat';
import type {
  RektMemelordsEditions__factory,
  RektMemelordsEditions,
} from '../typechain-types';
import type { StoreFrontArgs, TokenArgs } from './args';

export const deployTokenContract = async (
  args: TokenArgs,
): Promise<RektMemelordsEditions> => {
  const Factory = (await ethers.getContractFactory(
    'RektMemelordsEditions',
  )) as RektMemelordsEditions__factory;

  const contract: RektMemelordsEditions = (await upgrades.deployProxy(Factory, [
    ...Object.values(args),
  ])) as RektMemelordsEditions;

  return contract;
};

export const deployStoreFrontContract = async (
  args: StoreFrontArgs,
): Promise<void> => {};
