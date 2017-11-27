'use strict';

let pricingStrategyContract = artifacts.require('./crowdsale/AlgoryPricingStrategy.sol');

const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

import ether from './helpers/ether'
import EVMThrow from './helpers/EVMThrow'

contract('Test Algory Pricing Strategy', function(accounts) {
    const expectedPresaleMaxValue = ether(300);
    const expectedTranches = [
        {amount: 0, rate: 1200},
        {amount: ether(10000), rate: 1100},
        {amount: ether(24000), rate: 1050},
        {amount: ether(40000), rate: 1000},
    ];

    let pricingStrategy;

    beforeEach(async function() {
        pricingStrategy = await pricingStrategyContract.new();
    });

    it("should get proper presale max value per one investor", async function () {
        let presaleMaxValue = await pricingStrategy.getPresaleMaxValue();
        presaleMaxValue.should.be.bignumber.equal(expectedPresaleMaxValue);
    });
    it("should get proper tranches", async function () {
        let tranchesCount = await pricingStrategy.trancheCount();
        assert.equal(tranchesCount, expectedTranches.length);

        let tranche0 = await pricingStrategy.getTranche(0);
        tranche0[0].should.be.bignumber.equal(expectedTranches[0].amount);
        tranche0[1].should.be.bignumber.equal(expectedTranches[0].rate);

        let tranche1 = await pricingStrategy.getTranche(1);
        tranche1[0].should.be.bignumber.equal(expectedTranches[1].amount);
        tranche1[1].should.be.bignumber.equal(expectedTranches[1].rate);

        let tranche2 = await pricingStrategy.getTranche(2);
        tranche2[0].should.be.bignumber.equal(expectedTranches[2].amount);
        tranche2[1].should.be.bignumber.equal(expectedTranches[2].rate);

        let tranche3 = await pricingStrategy.getTranche(3);
        tranche3[0].should.be.bignumber.equal(expectedTranches[3].amount);
        tranche3[1].should.be.bignumber.equal(expectedTranches[3].rate);

    });
    it("shouldn't get tranche out of range", async function () {
        await pricingStrategy.getTranche(4)
            .should.be.rejectedWith(EVMThrow)
    });

    it("should check is presale full", async function () {
        let isPresaleFull = await pricingStrategy.isPresaleFull(expectedTranches[1].amount);
        isPresaleFull.should.be.false;

        const outOfTranche1 = expectedTranches[1].amount.plus(1);
        isPresaleFull = await pricingStrategy.isPresaleFull(outOfTranche1);
        isPresaleFull.should.be.true;

    });
    it("shouldn't allow to send money to this contract", async function () {
        await pricingStrategy.sendTransaction({from: accounts[1], value: ether(1)})
            .should.be.rejectedWith(EVMThrow)
    });
    it("should get proper rate", async function () {
        let weiRaised = ether(77);
        let currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[0].rate);

        weiRaised = ether(11000);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[1].rate);

        weiRaised = ether(26000);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[2].rate);

        weiRaised = ether(50001);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[3].rate);

        weiRaised = ether(10000);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[0].rate);

        weiRaised = ether(10001);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[1].rate);

        weiRaised = ether(24000);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[1].rate);

        weiRaised = ether(24001);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[2].rate);

        weiRaised = ether(24001);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[2].rate);

        weiRaised = ether(40001);
        currentRate = await pricingStrategy.getCurrentRate(weiRaised);
        currentRate.should.be.bignumber.equal(expectedTranches[3].rate);
    });
    it("should get proper amount of tokens in I tranche", async function () {
        const weiRaised = ether(77); // I tranche

        let valueToBuy = ether(7);
        let expectedAmountOfTokens = valueToBuy.times(expectedTranches[0].rate);
        let amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = ether(856);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[0].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(6 * 10**6);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[0].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(7700000);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[0].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(77);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[0].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = ether(1);
        expectedAmountOfTokens = new BigNumber(1200 * 10**18);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);
    });
    it("should get proper amount of tokens in II tranche", async function () {
        const weiRaised = ether(10001); // II tranche

        let valueToBuy = ether(7);
        let expectedAmountOfTokens = valueToBuy.times(expectedTranches[1].rate);
        let amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = ether(856);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[1].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(6 * 10**6);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[1].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(7700000);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[1].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(77);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[1].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = ether(1);
        expectedAmountOfTokens = new BigNumber(1100 * 10**18);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

    });
    it("should get proper amount of tokens in III tranche", async function () {
        const weiRaised = ether(24001); // III tranche

        let valueToBuy = ether(7);
        let expectedAmountOfTokens = valueToBuy.times(expectedTranches[2].rate);
        let amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = ether(856);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[2].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(6 * 10**6);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[2].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(7700000);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[2].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(77);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[2].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = ether(1);
        expectedAmountOfTokens = new BigNumber(1050 * 10**18);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);
    });
    it("should get proper amount of tokens in IV tranche", async function () {
        const weiRaised = ether(40001); // IV tranche

        let valueToBuy = ether(7);
        let expectedAmountOfTokens = valueToBuy.times(expectedTranches[3].rate);
        let amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = ether(856);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[3].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(6 * 10**6);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[3].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(7700000);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[3].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = new BigNumber(77);
        expectedAmountOfTokens = valueToBuy.times(expectedTranches[3].rate);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);

        valueToBuy = ether(1);
        expectedAmountOfTokens = new BigNumber(1000 * 10**18);
        amountOfTokens = await pricingStrategy.getAmountOfTokens(valueToBuy, weiRaised);
        amountOfTokens.should.be.bignumber.equal(expectedAmountOfTokens);
    });
    it("shouldn't get amount of tokens for 0 value", async function () {
        await pricingStrategy.getAmountOfTokens(0, 111)
            .should.be.rejectedWith(EVMThrow)
    });
});
