import fs from 'fs';
import type { Chain, TokenArgs, StoreFrontArgs } from './args/types';

export const writeContractInfo = (
  chain: Chain,
  tokenAddress: string,
  storeFrontAddress: string,
) => {
  const date = new Date().toISOString();

  const contractInfo = {
    date,
    chain,
    tokenAddress,
    storeFrontAddress,
  };

  if (!fs.existsSync('outputs')) {
    fs.mkdirSync('outputs');
  }

  const filePath = 'outputs/contractInfo.json';
  let existingData = [];
  if (fs.existsSync(filePath)) {
    existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  existingData.push(contractInfo);

  fs.writeFileSync(filePath, JSON.stringify(existingData));
};

export const writeArgs = (
  slug: 'token' | 'storefront',
  args: TokenArgs | StoreFrontArgs,
) => {
  const fileContent = `module.exports = ${JSON.stringify([
    ...Object.values(args),
  ])};`;

  fs.writeFileSync(`outputs/${slug}Args.js`, fileContent);
};
