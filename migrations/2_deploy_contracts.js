let multiSigWallet = artifacts.require('./wallet/MultiSigWallet.sol');
let token = artifacts.require('./token/AlgoryToken.sol');
let pricingStrategy = artifacts.require('./crowdsale/AlgoryPricingStrategy.sol');
let crowdsale = artifacts.require('./crowdsale/AlgoryCrowdsale.sol');
let finalizeAgent = artifacts.require('./crowdsale/AlgoryFinalizeAgent.sol');
let safeMath = artifacts.require('./math/SafeMath.sol');

function latestTime() {
    return web3.eth.getBlock('latest').timestamp;
}

const duration = {
    seconds: function(val) { return val},
    minutes: function(val) { return val * this.seconds(60) },
    hours:   function(val) { return val * this.minutes(60) },
    days:    function(val) { return val * this.hours(24) },
    weeks:   function(val) { return val * this.days(7) },
    years:   function(val) { return val * this.days(365)}
};

module.exports = function(deployer, network, accounts) {

    // MultiSigWallet
    const requiredConfirmations = 1;

    // Crowdsale
    const beneficiary = accounts[0];
    const presaleStart = latestTime() + duration.seconds(10);
    const start = presaleStart + duration.minutes(10);
    const end = start + duration.hours(1);

    // Deploy MultiSigWallet
    return deployer.deploy(multiSigWallet, [accounts[0], accounts[1], accounts[2]], requiredConfirmations)
    //Deploy SafeMathLib
    .then(function() {
        return deployer.deploy(safeMath)
    })
    //Link SafeMathLib
    .then(function() {
        return deployer.link(safeMath, [crowdsale, pricingStrategy, token]);
    })
    // Deploy Token
    .then(function() {
        return deployer.deploy(token);
    })
    // Deploy Pricing Strategy
    .then(function() {
        return deployer.deploy(pricingStrategy);
    })
    // Deploy Crowdsale
    .then(function() {
        return deployer.deploy(
            crowdsale,
            token.address,
            beneficiary,
            pricingStrategy.address,
            multiSigWallet.address,
            presaleStart,
            start,
            end
        );
    })
    //Deploy Finalize Agent
    .then(function() {
        return deployer.deploy(finalizeAgent, token.address, crowdsale.address);
    })
    .then(function() {
        console.log("\n\n\t------------------------ DEPLOYED CONTRACTS ------------------------\n\n");

        console.log("\tBeneficiary address: " + beneficiary.data);
        console.log("\tMultisig Wallet address: " + multiSigWallet.address);
        console.log("\tCrowdsale address: " + crowdsale.address);
        console.log("\tAlgory Token address: " + token.address);
        console.log("\tPricing Strategy address: " + pricingStrategy.address);
        console.log("\tFinalize Agent address: " + finalizeAgent.address + "\n");
    });
};

