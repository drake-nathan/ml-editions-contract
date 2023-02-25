export interface TokenArgs {
  royaltySafe: string;
  devWallet: string;
  hmooreWallet: string;
  saintWallet: string;
}

export interface StoreFrontArgs {
  tokenAddress: string;
  allowlistRoot: string;
  payees: string[];
  paymentShares: number[];
}
