// SPDX-License-Identifier: MIT
/// @title: HDL Genesis Token Storefront
/// @author: Nathan Drake
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/finance/PaymentSplitter.sol';
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';

interface ITokenContract {
  function mint(address to, uint256 id, uint256 amount) external;

  function totalSupply(uint16 id) external returns (uint32 supply);

  function maxSupply(uint16 id) external returns (uint32 supply);
}

enum MintPhase {
  Closed,
  PreSale,
  PublicSale
}

error MaxTokensPerTransactionExceeded(uint256 requested, uint256 maximum);
error InsufficientPayment(uint256 sent, uint256 required);
error TotalSupplyExceeded(uint16 id, uint32 requested, uint32 maxSupply);
error InvalidMerkleProof();

contract MemelordStorefront is Pausable, AccessControl, PaymentSplitter {
  // roles
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
  // mint state
  uint256 public mintPrice = 0.069 ether;
  uint256 public discountPrice = 0.042 ether;
  uint16 public maxPurchaseCount = 10;
  MintPhase public mintPhase = MintPhase.Closed;
  uint16 public currentEditionId = 0;

  bytes32 _allowlistRoot;

  // token contract
  ITokenContract token;

  constructor(
    address tokenAddress,
    bytes32 allowlistRoot,
    address[] memory payees,
    uint256[] memory paymentShares
  ) PaymentSplitter(payees, paymentShares) {
    _allowlistRoot = allowlistRoot;
    token = ITokenContract(tokenAddress);

    _grantRole(ADMIN_ROLE, msg.sender);
  }

  function pause() public onlyRole(ADMIN_ROLE) {
    _pause();
  }

  function unpause() public onlyRole(ADMIN_ROLE) {
    _unpause();
  }

  // Setters
  function setTokenAddress(address tokenAddress) external onlyRole(ADMIN_ROLE) {
    token = ITokenContract(tokenAddress);
  }

  /**
   * @notice 0 = Closed, 1 = PreSale, 2 = PublicSalew
   */
  function setMintPhase(MintPhase phase) public onlyRole(ADMIN_ROLE) {
    mintPhase = phase;
  }

  function setMaxPurchaseCount(uint16 newCount) external onlyRole(ADMIN_ROLE) {
    maxPurchaseCount = newCount;
  }

  function setBaseMintPrice(uint256 newPrice) external onlyRole(ADMIN_ROLE) {
    mintPrice = newPrice;
  }

  function setDiscountMintPrice(
    uint256 newPrice
  ) external onlyRole(ADMIN_ROLE) {
    discountPrice = newPrice;
  }

  function setAllowlistRoot(bytes32 merkleRoot) external onlyRole(ADMIN_ROLE) {
    _allowlistRoot = merkleRoot;
  }

  modifier whenValidTokenCount(uint8 numberOfTokens) {
    if (numberOfTokens > maxPurchaseCount) {
      revert MaxTokensPerTransactionExceeded({
        requested: numberOfTokens,
        maximum: maxPurchaseCount
      });
    }

    _;
  }

  modifier whenSufficientValue(uint8 numberOfTokens) {
    uint256 totalSale = mintPrice * numberOfTokens;

    if (msg.value < totalSale) {
      revert InsufficientPayment({sent: msg.value, required: totalSale});
    }

    _;
  }

  modifier whenTotalSupplyNotReached(uint8 numberOfTokens) {
    uint32 totalSupply = token.totalSupply(currentEditionId);
    uint32 maxSupply = token.maxSupply(currentEditionId);

    if (totalSupply + numberOfTokens > maxSupply) {
      revert TotalSupplyExceeded({
        id: currentEditionId,
        requested: numberOfTokens,
        maxSupply: 10000
      });
    }

    _;
  }

  function mintTokens(
    address to,
    uint8 numberOfTokens
  )
    public
    payable
    whenNotPaused
    whenValidTokenCount(numberOfTokens)
    whenSufficientValue(numberOfTokens)
    whenTotalSupplyNotReached(numberOfTokens)
  {
    token.mint(to, currentEditionId, numberOfTokens);
  }

  // function mintPresale(
  //   uint8 numberOfTokens,
  //   bytes32[] calldata merkleProof
  // )
  //   external
  //   payable
  //   whenNotPaused
  //   whenValidTokenCount(numberOfTokens)
  //   whenSufficientValue(numberOfTokens)
  // {
  //   if (
  //     !MerkleProof.verify(
  //       merkleProof,
  //       _allowlistRoot,
  //       keccak256(abi.encodePacked(_msgSender()))
  //     )
  //   ) {
  //     revert InvalidMerkleProof();
  //   }

  //   token.mintTokens(numberOfTokens, _msgSender());
  // }
}
