import type { Chain, TokenArgs, StoreFrontArgs } from './types';

const gnosisSafeMainnet = '0x8E3CD3E6a1B72050ba55163fbc89e81E27B8C671';
const gnosisSafeTestnet = '0x64Cf6bc2afb9DE771B74CAb243aE31837D1ac127';

const nateWalletMainnet = '0x56ee8bD11b5A385d3d533B4c2c6E37DE78b2aAFb';
const nateWalletTestnet = '0x93b84B50b65342e0C0115FFdb3d1c8c5134DC1Ad';

const saintWalletMainnet = '0x8B90Eb28DD723Fd07F31d1A6C867DCca00F10f1F';
const saintWalletTestnet = '0x9285c83f950A5E81a4d710CE9c780224dC968457';

const hmooreWalletMainnet = '0x15d41E0Fa9419b11916507BEd3E201FE82266C74';
const hmooreWalletTestnet = '0x7A70e760310b7257Ad58f8bF9084C9f7D32Cf76C';

const mldAddressMainnet = '0x924F2a4D3e93cC595792292C84A41Ad3AEd70E95';
const mldAddressTestnet = '0xe0c8D341bF2024F8f331aE1c78E66aE823D85f01';

const delegateAddress = '0x00000000000076A84feF008CDAbe6409d2FE638B';

export const tokenArgs: Record<Chain, TokenArgs> = {
  mainnet: {
    royaltySafe: gnosisSafeMainnet,
    devWallet: nateWalletMainnet,
    hmooreWallet: hmooreWalletMainnet,
    saintWallet: saintWalletMainnet,
  },
  goerli: {
    royaltySafe: gnosisSafeTestnet,
    devWallet: nateWalletTestnet,
    hmooreWallet: hmooreWalletTestnet,
    saintWallet: saintWalletTestnet,
  },
};

export const storeFrontArgs: Record<Chain, StoreFrontArgs> = {
  mainnet: {
    delegateAddress,
    mldAddress: mldAddressMainnet,
    tokenAddress: '',
    payees: [nateWalletMainnet, gnosisSafeMainnet],
    paymentShares: [1, 9],
    devWallet: nateWalletMainnet,
    hmooreWallet: hmooreWalletMainnet,
    saintWallet: saintWalletMainnet,
  },
  goerli: {
    delegateAddress,
    mldAddress: mldAddressTestnet,
    tokenAddress: '',
    payees: [nateWalletTestnet, gnosisSafeTestnet],
    paymentShares: [1, 9],
    devWallet: nateWalletTestnet,
    hmooreWallet: hmooreWalletTestnet,
    saintWallet: saintWalletTestnet,
  },
};
