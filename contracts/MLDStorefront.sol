// SPDX-License-Identifier: MIT
/// @title: HDL Genesis Token Storefront
/// @author: Nathan Drake
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/finance/PaymentSplitter.sol';
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';

interface IMintableToken {
  function mintTokens(uint16 numberOfTokens, address to) external;

  function totalSupply() external returns (uint256);
}

enum MintPhase {
  Closed,
  PreSale,
  PublicSale
}

error MaxTokensPerTransactionExceeded(uint256 requested, uint256 maximum);
error InsufficientPayment(uint256 sent, uint256 required);
error MustMintFromEOA();
error InvalidMerkleProof();

contract MLDStorefront is Pausable, Ownable, PaymentSplitter {
  uint256 public mintPrice = 0.069 ether;
  uint256 _discountPrice = 0.042 ether;
  uint16 _maxPurchaseCount = 10;
  string _baseURIValue;
  bytes32 _allowlistRoot;
  MintPhase _mintPhase;
  uint16 _currentEditionId;
  mapping(address => bool) _discountClaimed;

  IMintableToken token;

  constructor(
    address tokenAddress,
    bytes32 allowlistRoot,
    address[] memory payees,
    uint256[] memory paymentShares
  ) PaymentSplitter(payees, paymentShares) {
    _allowlistRoot = allowlistRoot;
    token = IMintableToken(tokenAddress);
    _mintPhase = MintPhase.Closed;
  }

  function pause() public onlyOwner {
    _pause();
  }

  function unpause() public onlyOwner {
    _unpause();
  }

  function setTokenAddress(address tokenAddress) external onlyOwner {
    token = IMintableToken(tokenAddress);
  }

  /**
   * @notice 0 = Closed, 1 = PreSale, 2 = PublicSalew
   */
  function setMintPhase(MintPhase phase) public onlyOwner {
    _mintPhase = phase;
  }

  function mintPhase() public view returns (MintPhase) {
    return _mintPhase;
  }

  function maxPurchaseCount() public view returns (uint16) {
    return _maxPurchaseCount;
  }

  function hasClaimedDiscount(address addr) public view returns (bool) {
    return _discountClaimed[addr];
  }

  function setMaxPurchaseCount(uint16 count) external onlyOwner {
    _maxPurchaseCount = count;
  }

  function setBaseMintPrice(uint256 newPrice) external onlyOwner {
    mintPrice = newPrice;
  }

  function setAllowlistRoot(bytes32 merkleRoot) external onlyOwner {
    _allowlistRoot = merkleRoot;
  }

  modifier whenValidTokenCount(uint8 numberOfTokens) {
    if (numberOfTokens > _maxPurchaseCount) {
      revert MaxTokensPerTransactionExceeded({
        requested: numberOfTokens,
        maximum: _maxPurchaseCount
      });
    }

    _;
  }

  modifier whenSufficientValue(uint8 numberOfTokens) {
    if (msg.value < mintPrice * numberOfTokens) {
      revert InsufficientPayment({
        sent: msg.value,
        required: mintPrice * numberOfTokens
      });
    }

    _;
  }

  function mintTokens(
    uint8 numberOfTokens,
    address to
  )
    public
    payable
    whenNotPaused
    whenValidTokenCount(numberOfTokens)
    whenSufficientValue(numberOfTokens)
  {
    if (_msgSender() != tx.origin) {
      revert MustMintFromEOA();
    }

    token.mintTokens(numberOfTokens, to);
  }

  function mintTokens(uint8 numberOfTokens) external payable {
    mintTokens(numberOfTokens, msg.sender);
  }

  function mintPresale(
    uint8 numberOfTokens,
    bytes32[] calldata merkleProof
  )
    external
    payable
    whenNotPaused
    whenValidTokenCount(numberOfTokens)
    whenSufficientValue(numberOfTokens)
  {
    if (
      !MerkleProof.verify(
        merkleProof,
        _allowlistRoot,
        keccak256(abi.encodePacked(_msgSender()))
      )
    ) {
      revert InvalidMerkleProof();
    }

    token.mintTokens(numberOfTokens, _msgSender());
  }
}
