import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-gas-reporter';

import { config as configDotenv } from 'dotenv';
import type { HardhatUserConfig } from 'hardhat/config';

configDotenv();
const mainnetRpcUrl = process.env.MAINNET_RPC_URL;
const goerliRpcUrl = process.env.GOERLI_RPC_URL;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const coinmarketcapApiKey = process.env.COINMARKETCAP_API_KEY;
const testnetPrivateKey = process.env.TESTNET_PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_PRIVATE_KEY;

if (
  !mainnetRpcUrl ||
  !goerliRpcUrl ||
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
      url: mainnetRpcUrl,
      accounts: [mainnetPrivateKey],
      timeout: 600000,
    },
    goerli: {
      url: goerliRpcUrl,
      accounts: [testnetPrivateKey],
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
