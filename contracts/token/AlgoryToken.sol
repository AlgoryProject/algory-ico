pragma solidity ^0.4.15;

import './ReleasableToken.sol';
import './UpgradeableToken.sol';
import './FractionalERC20.sol';
import './BurnableToken.sol';

/**
 * A Algory token.
 *
 */
contract AlgoryToken is FractionalERC20, ReleasableToken, UpgradeableToken, BurnableToken {

    string public name = 'Algory';
    string public symbol = 'ALG';
    uint public decimals = 18;

    event UpdatedTokenInformation(string newName, string newSymbol);

    function AlgoryToken(uint _initialSupply) UpgradeableToken(msg.sender) {
        owner = msg.sender;
        totalSupply = _initialSupply;
        require(totalSupply > 0);
        balances[owner] = totalSupply;
        Minted(owner, totalSupply);
    }

    function releaseTokenTransfer() public onlyReleaseAgent {
        super.releaseTokenTransfer();
    }

    function canUpgrade() public constant returns(bool) {
        return released && super.canUpgrade();
    }

    function setTokenInformation(string _name, string _symbol) onlyOwner {
        name = _name;
        symbol = _symbol;
        // use StringUtils
//        require(name != '' && symbol != '');
        UpdatedTokenInformation(name, symbol);
    }

}