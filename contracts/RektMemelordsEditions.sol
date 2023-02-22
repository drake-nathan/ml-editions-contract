// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import '@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol';
import 'operator-filter-registry/src/upgradeable/DefaultOperatorFiltererUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/// @custom:security-contact nathan@drakewest.dev
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
  bytes32 public constant URI_SETTER_ROLE = keccak256('URI_SETTER_ROLE');
  bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');
  bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

  /**
   * @notice The next token id to be minted
   */
  uint16 public nextEdition = 0;

  /**
   * @notice Mapping from token ID to max supply
   */
  mapping(uint16 => uint32) public maxSupplies;

  /**
   * @notice Mapping from token ID to token URI
   */
  mapping(uint16 => string) public tokenURIs;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address projectWallet) public initializer {
    __ERC1155_init('');
    __AccessControl_init();
    __Pausable_init();
    __ERC1155Burnable_init();
    __ERC1155Supply_init();
    __ERC2981_init();
    __DefaultOperatorFilterer_init();

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(URI_SETTER_ROLE, msg.sender);
    _grantRole(PAUSER_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
    _setDefaultRoyalty(projectWallet, 500);
  }

  function setURI(string memory newuri) public onlyRole(URI_SETTER_ROLE) {
    _setURI(newuri);
  }

  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  function mint(
    address account,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public onlyRole(MINTER_ROLE) {
    _mint(account, id, amount, data);
  }

  function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public onlyRole(MINTER_ROLE) {
    _mintBatch(to, ids, amounts, data);
  }

  function initNextToken(
    uint32 maxSupply,
    string memory tokenURI
  ) public onlyRole(MINTER_ROLE) {
    require(maxSupply > 0, 'maxSupply must be greater than 0');
    require(
      maxSupplies[nextEdition] == 0,
      'nextEdition must not have been initialized'
    );

    maxSupplies[nextEdition] = maxSupply;
    tokenURIs[nextEdition] = tokenURI;
    nextEdition++;
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
