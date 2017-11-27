
const BigNumber = web3.BigNumber;
require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();
import {constants} from './constants';
import buyTokensAndValidateSale from './buyTokensAndValidateSale'
import ether from './ether'

export default async function buyAllTokensInTranche(crowdsale, algory, accounts, numberOfTranche) {

    const tranches = constants.expectedTranches;

    let initWeiRaised = await crowdsale.weiRaised();
    let initTokensSold = await crowdsale.tokensSold();
    let initTokensLeft = await crowdsale.getTokensLeft();

    let nextTranche = numberOfTranche == tranches.length-1 ? tranches.length-1 : numberOfTranche+1;
    let valueToBuy = numberOfTranche == tranches.length-1
        ? initTokensLeft.dividedBy(10).dividedBy(tranches[nextTranche].rate)
        : tranches[nextTranche].amount.minus(initWeiRaised).dividedBy(10);
    let expectedAmountOfTokens = valueToBuy.times(tranches[numberOfTranche].rate);

    let expectedWeiRaised = initWeiRaised.plus(valueToBuy.times(10));
    let expectedTokensSold = initTokensSold.plus(expectedAmountOfTokens.times(10));
    let expectedTokensLeft = initTokensLeft.minus(expectedAmountOfTokens.times(10));
    let expectedWeiCap = numberOfTranche == tranches.length-1 ? ether(60000).minus(ether(10)): tranches[nextTranche].amount;

    let investor;
    for (let i=0; i<10; i++) {
        investor = accounts[10+i];
        await buyTokensAndValidateSale(crowdsale, algory, investor, valueToBuy, expectedAmountOfTokens)
    }

    let currentTokensLeft = await crowdsale.getTokensLeft();
    currentTokensLeft.should.be.bignumber.equal(expectedTokensLeft);

    let currentTokensSold = await crowdsale.tokensSold();
    currentTokensSold.should.be.bignumber.equal(expectedTokensSold);

    let currentWeiRaised = await crowdsale.weiRaised();
    currentWeiRaised.should.be.bignumber.equal(expectedWeiRaised);
    currentWeiRaised.should.be.bignumber.least(expectedWeiCap);

}