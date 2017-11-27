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
const EVMThrow = require('./helpers/EVMThrow.js');

contract('Test Algory Crowdsale Preparing State', function(accounts) {
    const multisigWallet = accounts[accounts.length-1];
    const beneficiary = accounts[0];

    let crowdsale, pricingStrategy, finalizeAgent, algory;
    let whitelistWeiRaised = new BigNumber(0);

    before(async function() {
        const presaleStartsAt = latestTime() + duration.days(10);
        const startsAt = presaleStartsAt + duration.days(10);
        const endsAt = startsAt + duration.days(10);
        
        algory = await tokenContract.deployed();
        pricingStrategy = await pricingStrategyContract.deployed();
        finalizeAgent = await finalizeAgentContract.deployed();
        crowdsale = await crowdsaleContract.new(
            algory.address,
            beneficiary,
            pricingStrategy.address,
            multisigWallet,
            presaleStartsAt,
            startsAt,
            endsAt);
        await algory.setReleaseAgent(finalizeAgent.address);
        await algory.setTransferAgent(beneficiary, true);
        await algory.approve(crowdsale.address, constants.totalSupply);
        await crowdsale.prepareCrowdsale();
    });
    
    it("should in preparing state", async function () {
        const state = await crowdsale.getState();
        state.should.be.bignumber.equal(1);
    });

    it("should replace multisig wallet", async function () {
        const anotherWalletAddress = accounts[7];
        await crowdsale.setMultisigWallet(anotherWalletAddress);
        const currentWallet = await crowdsale.multisigWallet();

        assert.equal(currentWallet, anotherWalletAddress);
    });

    it("shouldn't set invalid multisig wallet", async function () {
        await crowdsale.setMultisigWallet(0x0)
            .should.be.rejectedWith(EVMThrow);
    });

    it("should set finalize agent", async function () {
        const newAgent = await finalizeAgentContract.new(algory.address, crowdsale.address);
        await algory.setReleaseAgent(newAgent.address);
        await crowdsale.setFinalizeAgent(newAgent.address);
        const currentAgent = await crowdsale.finalizeAgent();

        assert.equal(currentAgent, newAgent.address);
    });

    it("shouldn't set invalid finalize agent", async function () {
        let invalidFinalizeAgent = await finalizeAgentContract.new('0x1', '0x2');
        await crowdsale.setFinalizeAgent(invalidFinalizeAgent.address)
            .should.be.rejectedWith(EVMThrow);

        await crowdsale.setFinalizeAgent('0x777')
            .should.be.rejectedWith(EVMThrow)
    });

    it("should replace pricing strategy to another", async function () {
        let anotherPricingStrategy = await pricingStrategyContract.new();
        await crowdsale.setPricingStrategy(anotherPricingStrategy.address);
        let currentPricingStrategy = await crowdsale.pricingStrategy();
        assert.equal(currentPricingStrategy, anotherPricingStrategy.address);
    });

    it("shouldn't set invalid pricing strategy", async function () {
        await crowdsale.setPricingStrategy(0x7)
            .should.be.rejectedWith(EVMThrow)
    });

    it("should set presale, start and end dates", async function () {
        const presaleStartsAt = latestTime() + duration.days(77);
        const startsAt = presaleStartsAt + duration.days(77);
        const endsAt = startsAt + duration.days(77);

        let result= await crowdsale.setEndsAt(endsAt);
        assert.ok(isEventTriggered(result.logs, 'TimeBoundaryChanged'));

        result = await crowdsale.setStartsAt(startsAt);
        assert.ok(isEventTriggered(result.logs, 'TimeBoundaryChanged'));

        result = await crowdsale.setPresaleStartsAt(presaleStartsAt);
        assert.ok(isEventTriggered(result.logs, 'TimeBoundaryChanged'));

        const currentPresaleStart = await crowdsale.presaleStartsAt();
        const currentStart = await crowdsale.startsAt();
        const currentEnd = await crowdsale.endsAt();

        assert.equal(currentPresaleStart, presaleStartsAt);
        assert.equal(currentStart, startsAt);
        assert.equal(currentEnd, endsAt);
    });

    it("shouldn't set invalid presale, start and end dates", async function () {
        const currentStart = await crowdsale.startsAt();
        const currentEnd = await crowdsale.endsAt();

        //Invalid dates
        let invalidEndsAt = currentStart - duration.days(1);
        let invalidStartsAt = currentEnd + duration.days(20);
        let invalidPresaleStartsAt = currentEnd + duration.days(55);

        await crowdsale.setEndsAt(invalidEndsAt)
            .should.be.rejectedWith(EVMThrow);

        await crowdsale.setStartsAt(invalidStartsAt)
            .should.be.rejectedWith(EVMThrow);

        await crowdsale.setPresaleStartsAt(invalidPresaleStartsAt)
            .should.be.rejectedWith(EVMThrow);

    });

    it("should set participant to whitelist ", async function () {
        const participant1 = accounts[11];
        const value1 = ether(10);
        const participant2 = accounts[12];
        const value2 = ether(290);

        let result = await crowdsale.setEarlyParticipantWhitelist(participant1, value1);
        assert.ok(isEventTriggered(result.logs, 'Whitelisted'));
        let participant1CurrentValue = await crowdsale.earlyParticipantWhitelist(participant1);
        participant1CurrentValue.should.be.bignumber.equal(value1);
        whitelistWeiRaised = whitelistWeiRaised.plus(value1);

        result = await crowdsale.setEarlyParticipantWhitelist(participant2, value2);
        assert.ok(isEventTriggered(result.logs, 'Whitelisted'));
        let participant2CurrentValue = await crowdsale.earlyParticipantWhitelist(participant2);
        participant2CurrentValue.should.be.bignumber.equal(value2);
        whitelistWeiRaised = whitelistWeiRaised.plus(value2);

        let currentWhitelistedWeiRaised = await crowdsale.whitelistWeiRaised();
        currentWhitelistedWeiRaised.should.be.bignumber.equal(whitelistWeiRaised);

        let invalidParticipantValue = await crowdsale.earlyParticipantWhitelist('0x98798798798798');
        invalidParticipantValue.should.be.bignumber.equal(0);

    });

    it("should proper increase whitelist", async function () {
        const participant1 = accounts[17];
        const value1 = ether(10);
        const value2 = ether(290);

        let result = await crowdsale.setEarlyParticipantWhitelist(participant1, value1);
        assert.ok(isEventTriggered(result.logs, 'Whitelisted'));
        let participant1CurrentValue = await crowdsale.earlyParticipantWhitelist(participant1);
        participant1CurrentValue.should.be.bignumber.equal(value1);
        whitelistWeiRaised = whitelistWeiRaised.plus(value1);

        result = await crowdsale.setEarlyParticipantWhitelist(participant1, value2);
        assert.ok(isEventTriggered(result.logs, 'Whitelisted'));
        let participant2CurrentValue = await crowdsale.earlyParticipantWhitelist(participant1);
        participant2CurrentValue.should.be.bignumber.equal(value2);
        whitelistWeiRaised = whitelistWeiRaised.minus(value1).plus(value2);

        let currentWhitelistedWeiRaised = await crowdsale.whitelistWeiRaised();
        currentWhitelistedWeiRaised.should.be.bignumber.equal(whitelistWeiRaised);
    });

    it("shouldn't set invalid participant to whitelist ", async function () {
        const invalidParticipant = 0x0;
        await crowdsale.setEarlyParticipantWhitelist(invalidParticipant, ether(20))
            .should.be.rejectedWith(EVMThrow);
    });

    it("shouldn't set invalid value participant to whitelist ", async function () {
        let participant = '0x665465456';
        await crowdsale.setEarlyParticipantWhitelist(participant, 0)
            .should.be.rejectedWith(EVMThrow);
    });

    it("shouldn't set participant to whitelist with exceeded value", async function () {
        let participant = '0x665465456';
        let value = constants.expectedPresaleMaxValue.plus(1);
        await crowdsale.setEarlyParticipantWhitelist(participant, value)
            .should.be.rejectedWith(EVMThrow);
    });

    it("should load participants to whitelist from array", async function () {
        let participantsAddress = [
            accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]
        ];
        let participantsValues = [
            ether(100), ether(50), ether(50), ether(200), ether(300)
        ];

        let {logs} = await crowdsale.loadEarlyParticipantsWhitelist(participantsAddress, participantsValues);
        assert.ok(isEventTriggered(logs, 'Whitelisted'));

        let currentParticipantValue = new BigNumber(0);
        for (let i=0; i<participantsAddress.length; i++) {
            currentParticipantValue = await crowdsale.earlyParticipantWhitelist(participantsAddress[i]);
            currentParticipantValue.should.be.bignumber.equal(participantsValues[i]);
        }
    });

    it("shouldn't set participant to whitelist when it is full", async function () {
        const whitelistFull = constants.expectedTranches[1].amount;
        let participantsAddress = [];
        let participantsValues = [];
        let currentWhitelistedWeiRaised = await crowdsale.whitelistWeiRaised();
        let i = 0;
        while (currentWhitelistedWeiRaised.lessThanOrEqualTo(whitelistFull)) {
            participantsAddress[i] = 0x3453453451 + i;
            participantsValues[i] = ether(100);
            currentWhitelistedWeiRaised = currentWhitelistedWeiRaised.plus(participantsValues[i]);
            i++;
        }
        //Fill whitelist
        await crowdsale.loadEarlyParticipantsWhitelist(participantsAddress, participantsValues);
        currentWhitelistedWeiRaised = await crowdsale.whitelistWeiRaised();
        currentWhitelistedWeiRaised.should.be.bignumber.least(whitelistFull);

        //Special case: whitelist can be fill to I tranche + 300 ETH - 1
        currentWhitelistedWeiRaised.should.be.bignumber.lessThan(whitelistFull.plus(constants.expectedPresaleMaxValue));

        await crowdsale.setEarlyParticipantWhitelist('0x8789876757545454', ether(1))
            .should.be.rejectedWith(EVMThrow);

    });

    it("shouldn't allow to buy tokens by anyone in preparing state", async function () {
        await crowdsale.sendTransaction({from: accounts[17], value: ether(1)})
            .should.be.rejectedWith(EVMThrow);
        // check also whitelisted account
        await crowdsale.sendTransaction({from: accounts[2], value: ether(1)})
            .should.be.rejectedWith(EVMThrow);
    });

    it("shouldn't allow to finalize crowdsale in preparing state", async function () {
        await crowdsale.finalize()
            .should.be.rejectedWith(EVMThrow);
    });

    it("shouldn't allow to set refunding state in preparing state", async function () {
        await crowdsale.allowRefunding(true)
            .should.be.rejectedWith(EVMThrow);
    });

    it("shouldn't allow to refund in preparing state", async function () {
        await crowdsale.refund({from: accounts[8]})
            .should.be.rejectedWith(EVMThrow);
    });

    it("should preallocate part of tokens to company, devs and bounty", async function () {
        let balanceOfDevs = await algory.balanceOf(constants.devsAddress);
        let balanceOfComapny = await algory.balanceOf(constants.companyAddress);
        let balanceOfBounty = await algory.balanceOf(constants.bountyAddress);

        balanceOfDevs.should.be.bignumber.equal(constants.devsTokens);
        balanceOfComapny.should.be.bignumber.equal(constants.companyTokens);
        balanceOfBounty.should.be.bignumber.equal(constants.bountyTokens);
    });

    it("shouldn't prepare crowdsale when all tokens has not approved", async function () {
        const presaleStartsAt = latestTime() + duration.days(10);
        const startsAt = presaleStartsAt + duration.days(10);
        const endsAt = startsAt + duration.days(10);

        let algory2 = await tokenContract.new();
        crowdsale = await crowdsaleContract.new(
            algory2.address,
            beneficiary,
            pricingStrategy.address,
            multisigWallet,
            presaleStartsAt,
            startsAt,
            endsAt);
        await algory.setReleaseAgent(finalizeAgent.address);
        await algory.setTransferAgent(beneficiary, true);
        // await algory.approve(crowdsale.address, constants.totalSupply);
        await crowdsale.prepareCrowdsale()
            .should.be.rejectedWith(EVMThrow);
    });
});
