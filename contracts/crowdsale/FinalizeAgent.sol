pragma solidity ^0.4.15;

/**
 * @title Finalize Agent Abstract Contract
 * Finalize agent defines what happens at the end of successful crowdsale.
 */
contract FinalizeAgent {

  function isFinalizeAgent() public constant returns(bool) {
    return true;
  }

  function isSane() public constant returns (bool);

  function finalizeCrowdsale();

}