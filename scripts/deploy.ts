import { ethers } from 'hardhat';

const main = async () => {
  const RektMemelordsEditions = await ethers.getContractFactory(
    'RektMemelordsEditions',
  );

  console.log('Deploying RektMemelordsEditions Contract...');
  const rektMemelordsEditions = await RektMemelordsEditions.deploy();
  await rektMemelordsEditions.deployed();
  console.log('MemeLordDistrict deployed to:', rektMemelordsEditions.address);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
