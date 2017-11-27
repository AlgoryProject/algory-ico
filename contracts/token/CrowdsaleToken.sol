pragma solidity ^0.4.15;

import './ReleasableToken.sol';
import './BurnableToken.sol';
/**
 * @title Base crowdsale token interface
 *
 */
contract CrowdsaleToken is BurnableToken, ReleasableToken {
    uint public decimals;
}