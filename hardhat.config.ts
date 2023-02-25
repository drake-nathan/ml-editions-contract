import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@openzeppelin/hardhat-upgrades';

import { HardhatUserConfig } from 'hardhat/config';
import { config as configDotenv } from 'dotenv';

configDotenv();
const mainnetRpcUrl = process.env.MAINNET_RPC_URL;
const goerliRpcUrl = process.env.GOERLI_RPC_URL;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const testnetPrivateKey = process.env.TESTNET_PRIVATE_KEY;
const mainnetPrivateKey = process.env.MAINNET_PRIVATE_KEY;

if (
  !mainnetRpcUrl ||
  !goerliRpcUrl ||
  !etherscanApiKey ||
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
};

export default config;
