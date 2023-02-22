const { makeInterfaceId } = require('@openzeppelin/test-helpers');
import { expect } from 'chai';

const INTERFACES = {
  ERC165: ['supportsInterface(bytes4)'],
  ERC721: [
    'balanceOf(address)',
    'ownerOf(uint256)',
    'approve(address,uint256)',
    'getApproved(uint256)',
    'setApprovalForAll(address,bool)',
    'isApprovedForAll(address,address)',
    'transferFrom(address,address,uint256)',
    'safeTransferFrom(address,address,uint256)',
    'safeTransferFrom(address,address,uint256,bytes)',
  ],
  ERC721Enumerable: [
    'totalSupply()',
    'tokenOfOwnerByIndex(address,uint256)',
    'tokenByIndex(uint256)',
  ],
  ERC721Metadata: ['name()', 'symbol()', 'tokenURI(uint256)'],
  ERC1155: [
    'balanceOf(address,uint256)',
    'balanceOfBatch(address[],uint256[])',
    'setApprovalForAll(address,bool)',
    'isApprovedForAll(address,address)',
    'safeTransferFrom(address,address,uint256,uint256,bytes)',
    'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
  ],
  ERC1155Receiver: [
    'onERC1155Received(address,address,uint256,uint256,bytes)',
    'onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)',
  ],
  AccessControl: [
    'hasRole(bytes32,address)',
    'getRoleAdmin(bytes32)',
    'grantRole(bytes32,address)',
    'revokeRole(bytes32,address)',
    'renounceRole(bytes32,address)',
  ],
  AccessControlEnumerable: [
    'getRoleMember(bytes32,uint256)',
    'getRoleMemberCount(bytes32)',
  ],
};

type InterfaceKey = keyof typeof INTERFACES;

const INTERFACE_IDS: Partial<Record<InterfaceKey, string | undefined>> = {};
const FN_SIGNATURES: Record<string, string> = {};
for (const k of Object.getOwnPropertyNames(INTERFACES) as InterfaceKey[]) {
  INTERFACE_IDS[k] = makeInterfaceId.ERC165(INTERFACES[k]);
  for (const fnName of INTERFACES[k]) {
    // the interface id of a single function is equivalent to its function signature
    FN_SIGNATURES[fnName] = makeInterfaceId.ERC165([fnName]);
  }
}

export function shouldSupportInterfaces(interfaces: InterfaceKey[] = []) {
  describe('Contract interface', function () {
    beforeEach(function () {
      this.contractUnderTest =
        this.mock || this.token || this.holder || this.accessControl;
    });

    for (const k of interfaces) {
      const interfaceId = INTERFACE_IDS[k];
      describe(k, function () {
        describe("ERC165's supportsInterface(bytes4)", function () {
          it('claims support', async function () {
            expect(
              await this.contractUnderTest.supportsInterface(interfaceId),
            ).to.equal(true);
          });
        });
      });
    }
  });
}
