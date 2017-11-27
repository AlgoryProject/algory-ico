const tokenContract = artifacts.require('./token/AlgoryToken.sol');

const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

import isEventTriggered from './helpers/isEventTriggered'


contract('Test Algory Token', function(accounts) {
    const expectedTotalSupply = new BigNumber(75000000 * 10**18);
    let algory;

    beforeEach(async function() {
        algory = await tokenContract.new();
    });

    it("should set expected total supply after deploy", async function() {
        let totalSupply = await algory.totalSupply();
        totalSupply.should.be.bignumber.equal(expectedTotalSupply);
    });
    it("should set expected name after deploy", async function() {
        let name = await algory.name();
        assert.equal(name.valueOf(), 'Algory');
    });
    it("should set expected symbol after deploy", async function() {
        let symbol = await algory.symbol();
        assert.equal(symbol.valueOf(), 'ALG');
    });
    it("should set expected decimals after deploy", async function() {
        let decimals = await algory.decimals();
        assert.equal(decimals.valueOf(), 18);
    });
    it("should set upgrade master address after deploy", async function() {
        let upgradeMaster = await algory.upgradeMaster();
        assert.equal(upgradeMaster.valueOf(), accounts[0]);
        assert.notEqual(upgradeMaster.valueOf(), accounts[1]);
        assert.notEqual(upgradeMaster.valueOf(), accounts[2]);
    });
    it("should set unreleased flag after deploy", async function() {
        let isReleased = await algory.released();
        assert.equal(isReleased.valueOf(), false);
    });
    it("should change token information (name, symbol)", async function() {
        let {logs} = await algory.setTokenInformation('Algory2', 'ALG2');
        let newSymbol = await algory.symbol();
        let newName = await algory.name();
        assert.ok(isEventTriggered(logs, 'UpdatedTokenInformation'));
        assert.equal(newSymbol.valueOf(), 'ALG2');
        assert.equal(newName.valueOf(), 'Algory2');
    });
    it("should assign total supply to owner", async function() {
        let ownerBallance = await algory.balanceOf(accounts[0]);
        ownerBallance.should.be.bignumber.equal(expectedTotalSupply);
    });
    it("shouldn't be upgraded before release", async function() {
        let canUpgrade = await algory.canUpgrade();
        assert.equal(canUpgrade.valueOf(), false);
    });
});
