'use strict';

let crowdsaleContract = artifacts.require('./crowdsale/AlgoryCrowdsale.sol');
let tokenContract = artifacts.require('./token/AlgoryToken.sol');
let pricingStrategyContract = artifacts.require('./crowdsale/AlgoryPricingStrategy.sol');
let multisigWalletContract = artifacts.require('./wallet/MultisigWallet.sol');
let finalizeAgentContract = artifacts.require('./crowdsale/AlgoryFinalizeAgent.sol');

const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

import latestTime from './helpers/latestTime'
import {duration} from './helpers/duration'
const EVMThrow = require('./helpers/EVMThrow');


contract('Test Algory Crowdsale Initializing', function(accounts) {
    let crowdsale, algory, multisigWallet, pricingStrategy, finalizeAgent;
    const beneficiary = accounts[0];
    const totalSupply = new BigNumber(120000000 * 10**18);
    const presaleStart = latestTime() + duration.minutes(10);
    const start = presaleStart + duration.minutes(10);
    const end = start + duration.hours(1);

    before(async function() {
        algory = await tokenContract.deployed();
        multisigWallet = await multisigWalletContract.deployed();
        pricingStrategy = await pricingStrategyContract.deployed();
        finalizeAgent = await finalizeAgentContract.deployed();
        crowdsale = await crowdsaleContract.new(
            algory.address,
            beneficiary,
            pricingStrategy.address,
            multisigWallet.address,
            presaleStart,
            start,
            end);
        await algory.approve(crowdsale.address, totalSupply);
    });

    it("should set expected owner, token, beneficiary, pricing strategy, multisig wallet, presale start, crowdsale start, crowdsale end", async function() {
        algory = await tokenContract.deployed();
        const owner = await crowdsale.owner();
        const crowdsaleToken = await crowdsale.token();
        const beneficiaryAddress = await crowdsale.beneficiary();
        const pricingStrategyAddress = await crowdsale.pricingStrategy();
        const multisigWalletAddress = await crowdsale.multisigWallet();
        const crowdsalePresaleStart = await crowdsale.presaleStartsAt();
        const crowdsaleStart = await crowdsale.startsAt();
        const crowdsaleEnd = await crowdsale.endsAt();

        assert.equal(owner, accounts[0]);
        assert.equal(crowdsaleToken, algory.address);
        assert.equal(beneficiaryAddress, beneficiary);
        assert.equal(pricingStrategyAddress, pricingStrategy.address);
        assert.equal(multisigWalletAddress, multisigWallet.address);
        assert.equal(crowdsalePresaleStart, presaleStart);
        assert.equal(crowdsaleStart, start);
        assert.equal(crowdsaleEnd, end);
    });

    it("shouldn't create crowdsale with invalid dates", async function () {
        const presaleStart = latestTime() - duration.minutes(10);
        const start = presaleStart + duration.minutes(15);
        const end = start - duration.hours(1);
        await crowdsaleContract.new(
            algory.address,
            beneficiary,
            pricingStrategy.address,
            multisigWallet.address,
            presaleStart,
            start,
            end).should.be.rejectedWith(EVMThrow)
    });

    it("shouldn't create crowdsale with invalid token address", async function () {
        const presaleStart = latestTime() + duration.minutes(10);
        const start = presaleStart + duration.minutes(10);
        const end = start + duration.hours(1);
        await crowdsaleContract.new(
            0x0,
            beneficiary,
            pricingStrategy.address,
            multisigWallet.address,
            presaleStart,
            start,
            end).should.be.rejectedWith(EVMThrow)
    });

    it("shouldn't create crowdsale with invalid beneficiary address", async function () {
        const presaleStart = latestTime() + duration.minutes(10);
        const start = presaleStart + duration.minutes(10);
        const end = start + duration.hours(1);
        await crowdsaleContract.new(
            algory.address,
            0x0,
            pricingStrategy.address,
            multisigWallet.address,
            presaleStart,
            start,
            end).should.be.rejectedWith(EVMThrow)
    });

    it("shouldn't create crowdsale when beneficiary has not all tokens", async function () {
        const presaleStart = latestTime() + duration.minutes(10);
        const start = presaleStart + duration.minutes(10);
        const end = start + duration.hours(1);
        const anotherBeneficiary = accounts[7];
        await crowdsaleContract.new(
            algory.address,
            anotherBeneficiary,
            pricingStrategy.address,
            multisigWallet.address,
            presaleStart,
            start,
            end).should.be.rejectedWith(EVMThrow)
    });

    it("shouldn't allow refunding", async function () {
        const allowRefund = await crowdsale.allowRefund();
        allowRefund.should.be.false;
    });

    it("shouldn't be finalized", async function () {
        const finalized = await crowdsale.finalized();
        finalized.should.be.false;
    });

    it("should has all token for sell", async function () {
        const tokensLeft = await crowdsale.getTokensLeft();
        const totalSupply = await algory.totalSupply();
        tokensLeft.should.be.bignumber.equal(totalSupply);
    });

    it("shouldn't be full", async function () {
        const isFull = await crowdsale.isCrowdsaleFull();
        isFull.should.be.false;
    });
});
