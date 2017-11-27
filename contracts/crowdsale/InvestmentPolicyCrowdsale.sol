pragma solidity ^0.4.15;

import '../lifecycle/Pausable.sol';


/**
 * @title Investment Policy Abstract Contract
 *
 * @note based on TokenMarketNet
 *
 * Apache License, version 2.0 https://github.com/AlgoryProject/algory-ico/blob/master/LICENSE
 */
contract InvestmentPolicyCrowdsale is Pausable {

    /* Do we need to have unique contributor id for each customer */
    bool public requireCustomerId = false;

    /**
      * Do we verify that contributor has been cleared on the server side (accredited investors only).
      * This method was first used in FirstBlood crowdsale to ensure all contributors have accepted terms on sale (on the web).
      */
    bool public requiredSignedAddress = false;

    /* Server side address that signed allowed contributors (Ethereum addresses) that can participate the crowdsale */
    address public signerAddress;

    event InvestmentPolicyChanged(bool newRequireCustomerId, bool newRequiredSignedAddress, address newSignerAddress);

    /**
     * Set policy do we need to have server-side customer ids for the investments.
     *
     */
    function setRequireCustomerId(bool value) onlyOwner external{
        requireCustomerId = value;
        InvestmentPolicyChanged(requireCustomerId, requiredSignedAddress, signerAddress);
    }

    /**
     * Set policy if all investors must be cleared on the server side first.
     *
     * This is e.g. for the accredited investor clearing.
     *
     */
    function setRequireSignedAddress(bool value, address _signerAddress) external onlyOwner {
        requiredSignedAddress = value;
        signerAddress = _signerAddress;
        InvestmentPolicyChanged(requireCustomerId, requiredSignedAddress, signerAddress);
    }

    /**
     * Invest to tokens, recognize the payer and clear his address.
     */
    function buyWithSignedAddress(uint128 customerId, uint8 v, bytes32 r, bytes32 s) external payable {
        require(requiredSignedAddress);
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 hash = sha3(prefix, sha3(msg.sender));
        assert(ecrecover(hash, v, r, s) == signerAddress);
        require(customerId != 0);  // UUIDv4 sanity check
        investInternal(msg.sender, customerId);
    }

    /**
     * Invest to tokens, recognize the payer.
     *
     */
    function buyWithCustomerId(uint128 customerId) external payable {
        require(requireCustomerId);
        require(customerId != 0);
        investInternal(msg.sender, customerId);
    }


    function investInternal(address receiver, uint128 customerId) whenNotPaused internal;
}