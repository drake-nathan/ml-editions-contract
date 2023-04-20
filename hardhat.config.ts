import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-gas-reporter';

import { config as configDotenv } from 'dotenv';
import type { HardhatUserConfig } from 'hardhat/config';

configDotenv();
const infuraKey = process.env.INFURA_KEY;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const coinmarketcapApiKey = process.env.COINMARKETCAP_API_KEY;
const testnetPrivateKey = process.env.TESTNET_PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_PRIVATE_KEY;

if (
  !infuraKey ||
  !etherscanApiKey ||
  !coinmarketcapApiKey ||
  !testnetPrivateKey ||
  !mainnetPrivateKey
) {
  throw new Error('Missing env var.');
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${infuraKey}`,
      accounts: [mainnetPrivateKey],
      timeout: 600000,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${infuraKey}`,
      accounts: [testnetPrivateKey],
      timeout: 600000,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${infuraKey}`,
      accounts: [testnetPrivateKey],
      timeout: 600000,
    },
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
  mocha: {
    timeout: 50000,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: 'ETH',
    coinmarketcap: coinmarketcapApiKey,
  },
};

export default config;
