import { ethers } from 'hardhat';

const main = async () => {
  const TestToken = await ethers.getContractFactory('TestToken');

  console.log('Deploying TestToken Contract...');
  const testToken = await TestToken.deploy();
  await testToken.deployed();
  console.log('MemeLordDistrict deployed to:', testToken.address);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
