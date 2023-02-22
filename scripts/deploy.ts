import { ethers } from 'hardhat';
import fs from 'fs';

interface Args {
  _merkleRoot: string;
  projectWallet: string;
  nateWallet: string;
  saintWallet: string;
  hmooreWallet: string;
}

const main = async () => {
  const MemeLordDistrict = await ethers.getContractFactory('MemeLordDistrict');

  const args: Args = {
    _merkleRoot:
      '0x26393431d940e5e53b2cecee483378c02c8134bed2dea1a64189bcad1665a906',
    projectWallet: '0x8E3CD3E6a1B72050ba55163fbc89e81E27B8C671',
    nateWallet: '0x56ee8bD11b5A385d3d533B4c2c6E37DE78b2aAFb',
    saintWallet: '0x8B90Eb28DD723Fd07F31d1A6C867DCca00F10f1F',
    hmooreWallet: '0x15d41E0Fa9419b11916507BEd3E201FE82266C74',
  };

  console.log('Deploying MemeLordDistrict...');
  const memelordDistrict = await MemeLordDistrict.deploy(
    ...Object.values(args),
  );
  await memelordDistrict.deployed();
  console.log('MemeLordDistrict deployed to:', memelordDistrict.address);

  console.log('Writing args...');

  const fileContent = `module.exports = ${JSON.stringify([
    ...Object.values(args),
  ])};`;
  fs.writeFileSync('arguments.js', fileContent);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
