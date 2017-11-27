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
    devsAddress: '0x58FC33aC6c7001925B4E9595b13B48bA73690a39',
    devsTokens: new BigNumber(4300000 * 10**18),
    companyAddress: '0x78534714b6b02996990cd567ebebd24e1f3dfe99',
    companyTokens: new BigNumber(4100000 * 10**18),
    bountyAddress: '0xd64a60de8A023CE8639c66dAe6dd5f536726041E',
    bountyTokens: new BigNumber(2400000 * 10**18),
    preallocatedTokens: function() {
        return this.devsTokens.plus(this.companyTokens).plus(this.bountyTokens);
    }
};

