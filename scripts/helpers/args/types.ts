export type Chain = 'mainnet' | 'goerli';

export interface TokenArgs {
  royaltySafe: string;
  devWallet: string;
  hmooreWallet: string;
  saintWallet: string;
}

export interface StoreFrontArgs {
  delegateAddress: string;
  mldAddress: string;
  tokenAddress?: string;
  payees: string[];
  paymentShares: number[];
  devWallet: string;
  hmooreWallet: string;
  saintWallet: string;
}

export interface MldArgs {
  _merkleRoot: string;
  projectWallet: string;
  nateWallet: string;
  saintWallet: string;
  hmooreWallet: string;
}
