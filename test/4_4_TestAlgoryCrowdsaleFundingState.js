'use strict';

let crowdsaleContract = artifacts.require('./crowdsale/AlgoryCrowdsale.sol');
let tokenContract = artifacts.require('./token/AlgoryToken.sol');
let pricingStrategyContract = artifacts.require('./crowdsale/AlgoryPricingStrategy.sol');
let finalizeAgentContract = artifacts.require('./crowdsale/AlgoryFinalizeAgent.sol');

const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

import latestTime from './helpers/latestTime'
import ether from './helpers/ether'
import {duration} from './helpers/duration'
import {constants} from './helpers/constants'
import isEventTriggered from './helpers/isEventTriggered'
import buyTokensAndValidateSale from './helpers/buyTokensAndValidateSale'
import buyAllTokensInTranche from './helpers/buyAllTokensInTranche'
const EVMThrow = require('./helpers/EVMThrow');


contract('Test Algory Crowdsale Funding State', function(accounts) {
    const beneficiary = accounts[0];
    const multisigWallet = accounts[accounts.length-1];

    let crowdsale, pricingStrategy, finalizeAgent, algory;
    let initMultisigBalance;

    before(async function() {
        let presaleStartsAt = latestTime() + duration.minutes(10);
        const startsAt = presaleStartsAt + duration.days(10);
        const endsAt = startsAt + duration.days(10);

        algory = await tokenContract.new();
        pricingStrategy = await pricingStrategyContract.deployed();
        crowdsale = await crowdsaleContract.new(
            algory.address,
            beneficiary,
            pricingStrategy.address,
            multisigWallet,
            presaleStartsAt,
            startsAt,
            endsAt);
        finalizeAgent = await finalizeAgentContract.new(algory.address, crowdsale.address);
        await algory.setReleaseAgent(finalizeAgent.address);
        await crowdsale.setFinalizeAgent(finalizeAgent.address);
        await algory.setTransferAgent(beneficiary, true);
        await algory.approve(crowdsale.address, constants.totalSupply);
        await crowdsale.prepareCrowdsale();

        await crowdsale.setPresaleStartsAt(latestTime() - duration.days(3));
        await crowdsale.setStartsAt(latestTime());
        initMultisigBalance = await web3.eth.getBalance(multisigWallet);
    });

    it("should be in funding state", async function () {
        const state = await crowdsale.getState();
        state.should.be.bignumber.equal(3);
    });
    
    it("should replace multisig wallet if investment count is less than 6", async function () {
        const anotherWalletAddress = accounts[7];
        await crowdsale.setMultisigWallet(anotherWalletAddress);
        let currentWallet = await crowdsale.multisigWallet();

        assert.equal(currentWallet, anotherWalletAddress);

        await crowdsale.setMultisigWallet(multisigWallet);
        currentWallet = await crowdsale.multisigWallet();

        assert.equal(currentWallet, multisigWallet);
    });

    it("should replace pricing strategy to another in pause state", async function () {
        let anotherPricingStrategy = await pricingStrategyContract.new();
        await crowdsale.pause();
        await crowdsale.setPricingStrategy(anotherPricingStrategy.address);
        await crowdsale.unpause();
        let currentPricingStrategy = await crowdsale.pricingStrategy();
        assert.equal(currentPricingStrategy, anotherPricingStrategy.address);
    });

    it("shouldn't set start date", async function () {
        let startsAt = latestTime() + duration.days(1);
        await crowdsale.setStartsAt(startsAt)
            .should.be.rejectedWith(EVMThrow)

    });

    it("should set end dates", async function () {
        let endsAt = latestTime() + duration.days(100);
        let result= await crowdsale.setEndsAt(endsAt);
        assert.ok(isEventTriggered(result.logs, 'TimeBoundaryChanged'));

        const currentEnd = await crowdsale.endsAt();
        assert.equal(currentEnd, endsAt);
    });

    it("shouldn't allow to finalize algoryCrowdsale in funding state", async function () {
        await crowdsale.finalize()
            .should.be.rejectedWith(EVMThrow)
    });

    it("shouldn't allow to set refunding in funding state", async function () {
        await crowdsale.allowRefunding(true)
            .should.be.rejectedWith(EVMThrow)
    });

    it("shouldn't allow to refund in funding state", async function () {
        await crowdsale.refund({from: accounts[8]})
            .should.be.rejectedWith(EVMThrow)
    });

    it("should allow to buy some tokens by everyone in I tranche", async function () {
        let currentRate = new BigNumber(1200);

        let investor = accounts[1];
        let valueToBuy = ether(4);
        let expectedAmountOfTokens = valueToBuy.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedAmountOfTokens);

        let investor2 = accounts[2];
        let valueToBuy2 = ether(6);
        let expectedAmountOfTokens2 = valueToBuy2.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor2, valueToBuy2, expectedAmountOfTokens2);

        let investor3 = accounts[3];
        let valueToBuy3 = ether(3);
        let expectedAmountOfTokens3 = valueToBuy3.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor3, valueToBuy3, expectedAmountOfTokens3);

        let investor4 = accounts[4];
        let valueToBuy4 = ether(1);
        let expectedAmountOfTokens4 = valueToBuy4.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor4, valueToBuy4, expectedAmountOfTokens4);

        let investor5 = accounts[5];
        let valueToBuy5 = ether(3);
        let expectedAmountOfTokens5 = valueToBuy5.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor5, valueToBuy5, expectedAmountOfTokens5);

        let investor6 = accounts[6];
        let valueToBuy6 = ether(2);
        let expectedAmountOfTokens6 = valueToBuy6.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor6, valueToBuy6, expectedAmountOfTokens6);

    });

    it("shouldn't replace multisig wallet if investment count is grater than 5", async function () {
        let anotherWallet = accounts[15];
        let currentInvestorCount = await crowdsale.investorCount();
        currentInvestorCount.should.be.bignumber.above(5);
        await crowdsale.setMultisigWallet(anotherWallet)
            .should.be.rejectedWith(EVMThrow);

    });

    it("should buy all tokens in I tranche", async function () {
        await buyAllTokensInTranche(crowdsale, algory, accounts, 0);
    });

    it("should reached in multisig wallet hard cap = 10 000 ETH after I tranche", async function () {
        let multisigBalance = await web3.eth.getBalance(multisigWallet);
        let multisigAddress = await crowdsale.multisigWallet();
        assert.equal(multisigAddress, multisigWallet);
        multisigBalance.should.be.bignumber.equal(initMultisigBalance.plus(ether(10000)));
    });

    it("shouldn't buy tokens for I tranche rate after limit exceed", async function () {
        let investor = accounts[21];
        //allow last transaction in I tranche rate (weiAmount <= tranche.amount) -> (10000ETH <= 10000ETH)
        let valueToBuy = ether(1);
        let expectedValueOfTokens =  valueToBuy.times(constants.expectedTranches[0].rate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedValueOfTokens);

        valueToBuy = ether(20);
        expectedValueOfTokens =  valueToBuy.times(constants.expectedTranches[1].rate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedValueOfTokens);
    });

    it("should allow to buy some tokens by everyone in II tranche", async function () {
        let currentRate = new BigNumber(1100);

        let investor = accounts[1];
        let valueToBuy = ether(4);
        let expectedAmountOfTokens = valueToBuy.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedAmountOfTokens);

        let investor2 = accounts[2];
        let valueToBuy2 = ether(6);
        let expectedAmountOfTokens2 = valueToBuy2.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor2, valueToBuy2, expectedAmountOfTokens2);

        let investor3 = accounts[3];
        let valueToBuy3 = ether(3);
        let expectedAmountOfTokens3 = valueToBuy3.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor3, valueToBuy3, expectedAmountOfTokens3);
    });

    it("should buy all tokens in II tranche", async function () {
        await buyAllTokensInTranche(crowdsale, algory, accounts, 1);
    });

    it("should reached in multisig wallet hard cap = 24 000 ETH after II tranche", async function () {
        let multisigBalance = await web3.eth.getBalance(multisigWallet);
        let multisigAddress = await crowdsale.multisigWallet();
        assert.equal(multisigAddress, multisigWallet);
        multisigBalance.should.be.bignumber.equal(initMultisigBalance.plus(ether(24000)));
    });

    it("shouldn't buy tokens for II tranche rate after limit exceed", async function () {
        let investor = accounts[21];
        //allow last transaction in II tranche rate (weiAmount <= tranche.amount) -> (25000ETH <= 25000ETH)
        let valueToBuy = ether(1);
        let expectedValueOfTokens =  valueToBuy.times(constants.expectedTranches[1].rate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedValueOfTokens);

        valueToBuy = ether(20);
        expectedValueOfTokens =  valueToBuy.times(constants.expectedTranches[2].rate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedValueOfTokens);
    });

    it("should allow to buy some tokens by everyone in III tranche", async function () {
        let currentRate = new BigNumber(1050);

        let investor = accounts[1];
        let valueToBuy = ether(4);
        let expectedAmountOfTokens = valueToBuy.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedAmountOfTokens);

        let investor2 = accounts[2];
        let valueToBuy2 = ether(6);
        let expectedAmountOfTokens2 = valueToBuy2.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor2, valueToBuy2, expectedAmountOfTokens2);

        let investor3 = accounts[3];
        let valueToBuy3 = ether(3);
        let expectedAmountOfTokens3 = valueToBuy3.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor3, valueToBuy3, expectedAmountOfTokens3);
    });

    it("should buy all tokens in III tranche", async function () {
        await buyAllTokensInTranche(crowdsale, algory, accounts, 2);
    });

    it("should reached in multisig wallet hard cap = 40 000 ETH after III tranche", async function () {
        let multisigBalance = await web3.eth.getBalance(multisigWallet);
        let multisigAddress = await crowdsale.multisigWallet();
        assert.equal(multisigAddress, multisigWallet);
        multisigBalance.should.be.bignumber.equal(initMultisigBalance.plus(ether(40000)));
    });

    it("shouldn't buy tokens for III tranche rate after limit exceed", async function () {
        let investor = accounts[21];
        //allow last transaction in II tranche rate (weiAmount <= tranche.amount) -> (50000ETH <= 50000ETH)
        let valueToBuy = ether(1);
        let expectedValueOfTokens =  valueToBuy.times(constants.expectedTranches[2].rate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedValueOfTokens);

        valueToBuy = ether(20);
        expectedValueOfTokens =  valueToBuy.times(constants.expectedTranches[3].rate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedValueOfTokens);
    });

    it("should allow to buy some tokens by everyone in IV tranche", async function () {
        let currentRate = new BigNumber(1000);

        let investor = accounts[1];
        let valueToBuy = ether(4);
        let expectedAmountOfTokens = valueToBuy.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedAmountOfTokens);

        let investor2 = accounts[2];
        let valueToBuy2 = ether(6);
        let expectedAmountOfTokens2 = valueToBuy2.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor2, valueToBuy2, expectedAmountOfTokens2);

        let investor3 = accounts[3];
        let valueToBuy3 = ether(3);
        let expectedAmountOfTokens3 = valueToBuy3.times(currentRate);
        await buyTokensAndValidateSale(crowdsale, algory, investor3, valueToBuy3, expectedAmountOfTokens3);
    });

    it("should buy all tokens in IV tranche", async function () {
        await buyAllTokensInTranche(crowdsale, algory, accounts, 3);
    });

    it("shouldn't buy tokens after all has been sold", async function () {
        crowdsale.sendTransaction({from: accounts[28], value: ether(20)})
            .should.be.rejectedWith(EVMThrow);
    });
    it("should has 0 tokens left after all has been sold", async function () {
        let currentTokensLeft = await crowdsale.getTokensLeft();
        currentTokensLeft.should.be.bignumber.equal(0);
    });

    it("should be in success state after all tokens sold", async function () {
        let state = await crowdsale.getState();
        state.should.be.bignumber.equal(4);
    });

    it("should reached in multisig wallet hard cap = 60 000 ETH (-10 ETH) after crowdsale", async function () {
        let multisigBalance = await web3.eth.getBalance(multisigWallet);
        let multisigAddress = await crowdsale.multisigWallet();
        assert.equal(multisigAddress, multisigWallet);
        multisigBalance.should.be.bignumber.above(initMultisigBalance.plus(ether(60000).minus(ether(10))));
    });

    it("shouldn't has in multisig wallet more than 60 000 ETH after crowdsale", async function () {
        let multisigBalance = await web3.eth.getBalance(multisigWallet);
        let multisigAddress = await crowdsale.multisigWallet();
        assert.equal(multisigAddress, multisigWallet);
        multisigBalance.should.be.bignumber.below(initMultisigBalance.plus(ether(60000).plus(1)));
    });
});
