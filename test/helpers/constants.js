const BigNumber = web3.BigNumber;
import ether from './ether';

const expectedPresaleMaxValue = ether(300);
const expectedTranches = [
    {amount: 0, rate: 1200},
    {amount: ether(10000), rate: 1100},
    {amount: ether(24000), rate: 1050},
    {amount: ether(40000), rate: 1000},
];

export const constants = {
    totalSupply: new BigNumber(75000000 * 10**18),
    expectedPresaleMaxValue: expectedPresaleMaxValue,
    expectedTranches: expectedTranches,
    devsAddress: '0xc8337b3e03f5946854e6C5d2F5f3Ad0511Bb2599',
    devsTokens: new BigNumber(4300000 * 10**18),
    companyAddress: '0x354d755460A677B60A2B5e025A3b7397856b518E',
    companyTokens: new BigNumber(4100000 * 10**18),
    bountyAddress: '0x6AC724A02A4f47179A89d4A7532ED7030F55fD34',
    bountyTokens: new BigNumber(2400000 * 10**18),
    preallocatedTokens: function() {
        return this.devsTokens.plus(this.companyTokens).plus(this.bountyTokens);
    }
};

