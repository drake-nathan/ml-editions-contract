// SPDX-License-Identifier: MIT
/// @title: Rekt Memelords Editions
/// @author: Nathan Drake <nathan@drakewest.dev>
pragma solidity ^0.8.17;

import '@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol';
import 'operator-filter-registry/src/upgradeable/DefaultOperatorFiltererUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

error TokenNotInitialized(uint16 id);
error NotCurrentEdition(uint16 id);
error ExceedsMaxSupply(uint16 id, uint32 requested, uint32 maxSupply);

contract RektMemelordsEditions is
  Initializable,
  ERC1155Upgradeable,
  AccessControlUpgradeable,
  PausableUpgradeable,
  ERC1155BurnableUpgradeable,
  ERC1155SupplyUpgradeable,
  ERC2981Upgradeable,
  DefaultOperatorFiltererUpgradeable
{
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
  bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

  /// @notice The current edition that can be minted
  uint16 public currentEdition;

  /// @dev Mapping from token ID to max supply
  mapping(uint16 => uint32) public maxSupply;

  /**
   * @dev Mapping from token ID to current supply
   */
  mapping(uint16 => uint32) public totalySupply;

  uint16[] _tokenIdsMinted;

  /**
   * @dev Mapping from token ID to token URI
   */
  mapping(uint16 => string) _tokenURIs;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address royaltySafe,
    address devWallet,
    address hmooreWallet,
    address saintWallet
  ) public initializer {
    __ERC1155_init('');
    __AccessControl_init();
    __Pausable_init();
    __ERC1155Burnable_init();
    __ERC1155Supply_init();
    __ERC2981_init();
    __DefaultOperatorFilterer_init();

    _grantRole(DEFAULT_ADMIN_ROLE, hmooreWallet);
    _grantRole(ADMIN_ROLE, devWallet);
    _grantRole(ADMIN_ROLE, hmooreWallet);
    _grantRole(ADMIN_ROLE, saintWallet);

    _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
    _grantRole(MINTER_ROLE, hmooreWallet);
    _grantRole(MINTER_ROLE, saintWallet);

    _setDefaultRoyalty(royaltySafe, 500);

    currentEdition = 0;
  }

  function pause() public onlyRole(ADMIN_ROLE) {
    _pause();
  }

  function unpause() public onlyRole(ADMIN_ROLE) {
    _unpause();
  }

  /**
   *
   * @param royaltyAddress address of the royalty receiver
   * @param royaltyBps royalty amount in basis points (500 = 5%)
   */
  function setRoyaltyInfo(
    address royaltyAddress,
    uint96 royaltyBps
  ) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setDefaultRoyalty(royaltyAddress, royaltyBps);
  }

  function setTokenURI(
    uint16 id,
    string memory newuri
  ) external onlyRole(ADMIN_ROLE) {
    _tokenURIs[id] = newuri;
  }

  function uri(uint256 id) public view override returns (string memory) {
    return _tokenURIs[uint16(id)];
  }

  function tokenIdsMinted() external view returns (uint16[] memory) {
    return _tokenIdsMinted;
  }

  function setMaxSupply(
    uint16 id,
    uint32 newMaxSupply
  ) public onlyRole(ADMIN_ROLE) {
    maxSupply[id] = newMaxSupply;
  }

  /// @notice Sets the current edition that can be minted
  function setCurrentEdition(uint16 newEdition) external onlyRole(ADMIN_ROLE) {
    currentEdition = newEdition;
  }

  function initializeEdition(
    uint16 tokenToInit,
    uint32 tokenMaxSupply,
    string calldata tokenURI
  ) external onlyRole(ADMIN_ROLE) {
    require(tokenMaxSupply > 0, 'maxSupply must be greater than 0');
    require(bytes(tokenURI).length > 0, 'tokenURI must not be empty string');
    require(maxSupply[tokenToInit] == 0, 'edition already initialized');

    maxSupply[tokenToInit] = tokenMaxSupply;
    _tokenURIs[tokenToInit] = tokenURI;
    currentEdition = tokenToInit;
  }

  modifier hasBeenInitialized(uint16 id) {
    if (maxSupply[id] == 0) {
      revert TokenNotInitialized(id);
    }
    _;
  }

  modifier isCurrentEdition(uint16 id) {
    if (id != currentEdition) {
      revert NotCurrentEdition(id);
    }
    _;
  }

  modifier doesNotExceedMaxSupply(uint16 id, uint32 amount) {
    if (totalySupply[id] + amount > maxSupply[id]) {
      revert ExceedsMaxSupply(id, amount, maxSupply[id]);
    }
    _;
  }

  function mint(
    address account,
    uint256 id,
    uint256 amount
  )
    external
    onlyRole(MINTER_ROLE)
    whenNotPaused
    hasBeenInitialized(uint16(id))
    isCurrentEdition(uint16(id))
    doesNotExceedMaxSupply(uint16(id), uint32(amount))
  {
    _mint(account, id, amount, '');
    totalySupply[uint16(id)] += uint32(amount);
    // if tokenIdsMinted does not contain this token id, add it
    if (totalySupply[uint16(id)] == amount) {
      _tokenIdsMinted.push(uint16(id));
    }
  }

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  )
    internal
    override(ERC1155Upgradeable, ERC1155SupplyUpgradeable)
    whenNotPaused
  {
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  // OpenSea filter overrides

  /**
   * @dev See {IERC1155-setApprovalForAll}.
   *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
   */
  function setApprovalForAll(
    address operator,
    bool approved
  ) public override onlyAllowedOperatorApproval(operator) {
    super.setApprovalForAll(operator, approved);
  }

  /**
   * @dev See {IERC1155-safeTransferFrom}.
   *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 amount,
    bytes memory data
  ) public override onlyAllowedOperator(from) {
    super.safeTransferFrom(from, to, tokenId, amount, data);
  }

  /**
   * @dev See {IERC1155-safeBatchTransferFrom}.
   *      In this example the added modifier ensures that the operator is allowed by the OperatorFilterRegistry.
   */
  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public virtual override onlyAllowedOperator(from) {
    super.safeBatchTransferFrom(from, to, ids, amounts, data);
  }

  // The following functions are overrides required by Solidity.

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    override(ERC1155Upgradeable, ERC2981Upgradeable, AccessControlUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
