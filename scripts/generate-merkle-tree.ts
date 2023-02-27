import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

export interface Proof {
  address: string;
  allowlist: string[];
}

const generateProofs = (addresses: string[]) => {
  addresses = addresses.sort();

  const tree = new MerkleTree(addresses, keccak256, {
    hashLeaves: true,
    sortPairs: true,
  });

  const root = tree.getRoot().toString('hex');

  const proofs = {} as Record<string, string[]>;

  addresses.forEach((address) => {
    const addrHash = keccak256(address);
    const proof = tree.getHexProof(addrHash);
    proofs[address] = proof;
  });

  return {
    root,
    proofs,
  };
};

export const buildProofs = (
  allowlist: string[],
): {
  allowlistRoot: string;
  proofs: Proof[];
} => {
  const allowlistLowerCase = allowlist.map((address) => address.toLowerCase());

  const allowlistProofs = generateProofs(allowlistLowerCase);

  const output = {
    allowlistRoot: `0x${allowlistProofs.root}`,
    proofs: [] as Proof[],
  };

  Object.keys(allowlistProofs.proofs).forEach((address) => {
    const result = {
      address,
      allowlist: allowlistProofs.proofs[address],
    };

    output.proofs.push(result);
  });

  return output;
};
