pragma solidity ^0.4.15;

/**
 * Pricing Strategy - Abstract contract for defining crowdsale pricing.
 */
contract PricingStrategy {

  // How many tokens per one investor is allowed in presale
  uint public presaleMaxValue = 0;

  function isPricingStrategy() external constant returns (bool) {
      return true;
  }

  function getPresaleMaxValue() public constant returns (uint) {
      return presaleMaxValue;
  }

  function isPresaleFull(uint weiRaised) public constant returns (bool);

  function getAmountOfTokens(uint value, uint weiRaised) public constant returns (uint tokensAmount);
}