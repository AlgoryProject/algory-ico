pragma solidity ^0.4.15;

import './FinalizeAgent.sol';
import './AlgoryCrowdsale.sol';
import '../math/SafeMath.sol';
import '../token/AlgoryToken.sol';

/**
 * @title Algory Finalize Agent
 *
 * @note based on TokenMarketNet
 *
 * Apache License, version 2.0 https://github.com/AlgoryProject/algory-ico/blob/master/LICENSE
 */
contract AlgoryFinalizeAgent is FinalizeAgent {

    using SafeMath for uint;

    AlgoryToken public token;
    AlgoryCrowdsale public crowdsale;

    function AlgoryFinalizeAgent(AlgoryToken _token, AlgoryCrowdsale _crowdsale) {
        require(address(_token) != 0x0 && address(_crowdsale) != 0x0);
        token = _token;
        crowdsale = _crowdsale;
    }

    function isSane() public constant returns (bool) {
        return token.releaseAgent() == address(this) && crowdsale.finalizeAgent() == address(this);
    }

    function finalizeCrowdsale() public {
        require(msg.sender == address(crowdsale));

        // Make token transferable
        token.releaseTokenTransfer();
    }

}