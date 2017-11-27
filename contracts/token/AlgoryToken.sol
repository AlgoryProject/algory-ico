pragma solidity ^0.4.15;

import './CrowdsaleToken.sol';
import './UpgradeableToken.sol';

/**
 * @title Algory Token
 *
 * Contract is based on OpenZeppelin contract licenced under https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/LICENSE
 *
 * @license Apache License, version 2.0 https://github.com/AlgoryProject/algory-ico/blob/master/LICENSE
 */
contract AlgoryToken is UpgradeableToken, CrowdsaleToken {

    string public name = 'Algory';
    string public symbol = 'ALG';
    uint public decimals = 18;

    uint256 public INITIAL_SUPPLY = 75000000 * (10 ** uint256(decimals));

    event UpdatedTokenInformation(string newName, string newSymbol);

    function AlgoryToken() UpgradeableToken(msg.sender) {
        owner = msg.sender;
        totalSupply = INITIAL_SUPPLY;
        balances[owner] = totalSupply;
    }

    function canUpgrade() public constant returns(bool) {
        return released && super.canUpgrade();
    }

    function setTokenInformation(string _name, string _symbol) onlyOwner {
        name = _name;
        symbol = _symbol;
        UpdatedTokenInformation(name, symbol);
    }

}