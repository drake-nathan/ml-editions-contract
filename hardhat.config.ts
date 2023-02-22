import '@nomicfoundation/hardhat-toolbox';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';

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
  solidity: '0.8.18',
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
};

export default config;
