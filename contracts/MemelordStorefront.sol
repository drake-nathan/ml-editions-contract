// SPDX-License-Identifier: MIT
/// @title: Rekt Memelords Storefront
/// @author: Nathan Drake <nathan@drakewest.dev>
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/finance/PaymentSplitter.sol';
import './IDelegationRegistry.sol';

interface IMldContract {
  function ownerOf(uint256 tokenId) external view returns (address owner);

  function totalSuppy() external view returns (uint256 totalSupply);
}

interface ITokenContract {
  function initializeEdition(
    uint16 id,
    uint32 maxSupply,
    string memory uri
  ) external;

  function mint(address to, uint256 id, uint256 amount) external;

  function totalSupply(uint16 id) external returns (uint32 supply);

  function maxSupply(uint16 id) external returns (uint32 supply);
}

error MaxTokensPerTransactionExceeded(uint256 requested, uint256 maximum);
error InsufficientPayment(uint256 sent, uint256 required);
error TotalSupplyExceeded(uint16 id, uint32 requested, uint32 maxSupply);
error DelegateNotValid(address delegate);
error UnequalClaimTokens(uint256 sent, uint256 required);
error NotOwnerOfMldToken(uint16 tokenId);
error TokenClaimed(uint16 tokenId);
error MintClosed();

contract MemelordStorefront is Pausable, AccessControl, PaymentSplitter {
  // roles
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

  // mint state
  uint256 public mintPrice = 0.042 ether;
  uint16 public maxPurchaseCount = 10;
  uint16 public currentEdition = 0;
  uint256 public mintStart = 1690000000;
  uint256 public mintEnd = 1690000001;

  // create mapping of token ids used to claim
  mapping(uint16 => bool) public claimed;

  // delegate cash, mld, token contract
  IDelegationRegistry dc;
  IMldContract mld;
  ITokenContract token;

  // private vars
  address private _mldAddress;

  constructor(
    address delegateAddress,
    address mldAddress,
    address tokenAddress,
    address[] memory payees,
    uint256[] memory paymentShares,
    address devWallet,
    address hmooreWallet,
    address saintWallet
  ) PaymentSplitter(payees, paymentShares) {
    dc = IDelegationRegistry(delegateAddress);
    mld = IMldContract(mldAddress);
    token = ITokenContract(tokenAddress);

    _grantRole(DEFAULT_ADMIN_ROLE, hmooreWallet);
    _grantRole(ADMIN_ROLE, devWallet);
    _grantRole(ADMIN_ROLE, hmooreWallet);
    _grantRole(ADMIN_ROLE, saintWallet);

    _mldAddress = mldAddress;
  }

  function pause() public onlyRole(ADMIN_ROLE) {
    _pause();
  }

  function unpause() public onlyRole(ADMIN_ROLE) {
    _unpause();
  }

  function isMintOpen() public view returns (bool) {
    return block.timestamp >= mintStart && block.timestamp <= mintEnd;
  }

  // Setters
  function setTokenAddress(address tokenAddress) external onlyRole(ADMIN_ROLE) {
    token = ITokenContract(tokenAddress);
  }

  function setMaxPurchaseCount(uint16 newCount) external onlyRole(ADMIN_ROLE) {
    maxPurchaseCount = newCount;
  }

  function setBaseMintPrice(uint256 newPrice) external onlyRole(ADMIN_ROLE) {
    mintPrice = newPrice;
  }

  function setCurrentEditionId(uint16 id) external onlyRole(ADMIN_ROLE) {
    currentEdition = id;
  }

  /// @param mintStart_ - set mint start unix timestamp
  function setMintStart(uint256 mintStart_) external onlyRole(ADMIN_ROLE) {
    mintStart = mintStart_;
  }

  /// @param mintEnd_ - set mint end unix timestamp
  function setMintEnd(uint256 mintEnd_) external onlyRole(ADMIN_ROLE) {
    mintEnd = mintEnd_;
  }

  /// @notice - manually set claimed status for token id
  function setClaimed(uint16 id) external onlyRole(ADMIN_ROLE) {
    claimed[id] = true;
  }

  // resetters
  /// @notice - manually reset claimed status for token id
  function resetClaimed(uint16 id) external onlyRole(ADMIN_ROLE) {
    claimed[id] = false;
  }

  function resetClaimedList() external onlyRole(ADMIN_ROLE) {
    uint256 _mldMaxToken = mld.totalSuppy();

    for (uint16 i = 0; i < _mldMaxToken; i++) {
      claimed[i] = false;
    }
  }

  /**
   * @notice - setup mint on storefront contract, and initialize edition on token contract
   * @param id - ERC1155 edition id for token contract
   * @param maxSupply - max supply for edition
   * @param startTime_ - unix timestamp for start of mint
   * @param endTime_ - unix timestamp for end of mint
   * @param uri - uri for edition
   */
  function setupMint(
    uint16 id,
    uint32 maxSupply,
    uint256 startTime_,
    uint256 endTime_,
    string calldata uri
  ) external onlyRole(ADMIN_ROLE) {
    token.initializeEdition(id, maxSupply, uri);
    currentEdition = id;
    mintStart = startTime_;
    mintEnd = endTime_;
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
    uint32 totalSupply = token.totalSupply(currentEdition);
    uint32 maxSupply = token.maxSupply(currentEdition);

    if (totalSupply + numberOfTokens > maxSupply) {
      revert TotalSupplyExceeded({
        id: currentEdition,
        requested: numberOfTokens,
        maxSupply: 10000
      });
    }
    _;
  }

  modifier whenMintOpen() {
    if (!isMintOpen()) {
      revert MintClosed();
    }
    _;
  }

  /**
   *
   * @param to - address to send tokens to
   * @param numberOfTokens - number of tokens to mint
   * @param mldClaimTokenIds - array of MLD token ids using to claim, must be 1:1 with numberOfTokens, and must be owner or delegate of those tokens
   * @param _vault - optional vault address for delegate.cash
   */
  function claim(
    address to,
    uint8 numberOfTokens,
    uint16[] calldata mldClaimTokenIds,
    address _vault
  )
    public
    payable
    whenNotPaused
    whenMintOpen
    whenValidTokenCount(numberOfTokens)
    whenSufficientValue(numberOfTokens)
    whenTotalSupplyNotReached(numberOfTokens)
  {
    address requester = msg.sender;

    if (_vault != address(0)) {
      bool isDelegateValid = dc.checkDelegateForContract(
        requester,
        _vault,
        _mldAddress
      );

      if (!isDelegateValid) {
        revert DelegateNotValid({delegate: requester});
      }

      requester = _vault;
    }

    if (mldClaimTokenIds.length != numberOfTokens) {
      revert UnequalClaimTokens({
        sent: mldClaimTokenIds.length,
        required: numberOfTokens
      });
    }

    for (uint8 i = 0; i < numberOfTokens; i++) {
      uint16 tokenId = mldClaimTokenIds[i];

      if (claimed[tokenId]) {
        revert TokenClaimed({tokenId: tokenId});
      }

      if (mld.ownerOf(tokenId) != requester) {
        revert NotOwnerOfMldToken({tokenId: tokenId});
      }
    }

    token.mint(to, currentEdition, numberOfTokens);

    for (uint8 i = 0; i < numberOfTokens; i++) {
      uint16 tokenId = mldClaimTokenIds[i];
      claimed[tokenId] = true;
    }
  }
}
