pragma solidity ^0.4.15;

import './InvestmentPolicyCrowdsale.sol';
import './PricingStrategy.sol';
import '../token/CrowdsaleToken.sol';
import './FinalizeAgent.sol';
import '../math/SafeMath.sol';

contract AlgoryCrowdsale is InvestmentPolicyCrowdsale {

    /* Max investment count when we are still allowed to change the multisig address */
    uint constant public MAX_INVESTMENTS_BEFORE_MULTISIG_CHANGE = 5;

    using SafeMath for uint;

    /* The token we are selling */
    CrowdsaleToken public token;

    /* How we are going to price our offering */
    PricingStrategy public pricingStrategy;

    /* Post-success callback */
    FinalizeAgent public finalizeAgent;

    /* tokens will be transfered from this address */
    address public multisigWallet;

    /* The party who holds the full token pool and has approve()'ed tokens for this crowdsale */
    address public beneficiary;

    /* the UNIX timestamp start date of the presale */
    uint public presaleStartsAt;

    /* the UNIX timestamp start date of the crowdsale */
    uint public startsAt;

    /* the UNIX timestamp end date of the crowdsale */
    uint public endsAt;

    /* the number of tokens already sold through this contract*/
    uint public tokensSold = 0;

    /* How many wei of funding we have raised */
    uint public weiRaised = 0;

    /** How many wei we have in whitelist declarations*/
    uint public whitelistWeiRaised = 0;

    /* Calculate incoming funds from presale contracts and addresses */
    uint public presaleWeiRaised = 0;

    /* How many distinct addresses have invested */
    uint public investorCount = 0;

    /* How much wei we have returned back to the contract after a failed crowdfund. */
    uint public loadedRefund = 0;

    /* How much wei we have given back to investors.*/
    uint public weiRefunded = 0;

    /* Has this crowdsale been finalized */
    bool public finalized = false;

    /* Allow investors refund theirs money */
    bool public allowRefund = false;

    // Has tokens preallocated */
    bool private isPreallocated = false;

    /** How much ETH each address has invested to this crowdsale */
    mapping (address => uint256) public investedAmountOf;

    /** How much tokens this crowdsale has credited for each investor address */
    mapping (address => uint256) public tokenAmountOf;

    /** Addresses and amount in weis that are allowed to invest even before ICO official opens. */
    mapping (address => uint) public earlyParticipantWhitelist;

    /** State machine
     *
     * - Preparing: All contract initialization calls and variables have not been set yet
     * - PreFunding: We have not passed start time yet, allow buy for whitelisted participants
     * - Funding: Active crowdsale
     * - Success: Passed end time or crowdsale is full (all tokens sold)
     * - Finalized: The finalized has been called and successfully executed
     * - Refunding: Refunds are loaded on the contract for reclaim.
     */
    enum State{Unknown, Preparing, PreFunding, Funding, Success, Failure, Finalized, Refunding}

    // A new investment was made
    event Invested(address investor, uint weiAmount, uint tokenAmount, uint128 customerId);

    // Refund was processed for a contributor
    event Refund(address investor, uint weiAmount);

    // Address early participation whitelist status changed
    event Whitelisted(address addr, uint value);

    // Crowdsale time boundary has changed
    event TimeBoundaryChanged(string timeBoundary, uint timestamp);

    /** Modified allowing execution only if the crowdsale is currently running.  */
    modifier inState(State state) {
        require(getState() == state);
        _;
    }

    function AlgoryCrowdsale(address _token, address _beneficiary, PricingStrategy _pricingStrategy, address _multisigWallet, uint _presaleStart, uint _start, uint _end) public {
        owner = msg.sender;
        token = CrowdsaleToken(_token);
        beneficiary = _beneficiary;

        presaleStartsAt = _presaleStart;
        startsAt = _start;
        endsAt = _end;

        require(now < presaleStartsAt && presaleStartsAt <= startsAt && startsAt < endsAt);

        setPricingStrategy(_pricingStrategy);
        setMultisigWallet(_multisigWallet);

        require(beneficiary != 0x0 && address(token) != 0x0);
        assert(token.balanceOf(beneficiary) == token.totalSupply());

    }


    function prepareCrowdsale() onlyOwner external {
        require(!isPreallocated);
        assert(isAllTokensApproved());
        preallocateTokens();
        isPreallocated = true;
    }

    /**
     * Allow to send money and get tokens.
     */
    function() payable {
        assert(!requireCustomerId); // Crowdsale needs to track participants for thank you email
        assert(!requiredSignedAddress); // Crowdsale allows only server-side signed participants
        investInternal(msg.sender, 0);
    }

    // ONLY BY OWNER

    function setFinalizeAgent(FinalizeAgent agent) onlyOwner external{
        finalizeAgent = agent;
        require(finalizeAgent.isFinalizeAgent());
        require(finalizeAgent.isSane());
    }

    function setPresaleStartsAt(uint presaleStart) inState(State.Preparing) onlyOwner external {
        require(presaleStart <= startsAt && presaleStart < endsAt);
        presaleStartsAt = presaleStart;
        TimeBoundaryChanged('presaleStartsAt', presaleStartsAt);
    }

    function setStartsAt(uint start) onlyOwner external {
        require(presaleStartsAt < start && start < endsAt);
        State state = getState();
        assert(state == State.Preparing || state == State.PreFunding);
        startsAt = start;
        TimeBoundaryChanged('startsAt', startsAt);
    }

    function setEndsAt(uint end) onlyOwner external {
        require(end > startsAt && end > presaleStartsAt);
        endsAt = end;
        TimeBoundaryChanged('endsAt', endsAt);
    }

    /**
     * Set array of address and values to whitelist
     */
    function loadEarlyParticipantsWhitelist(address[] participantsArray, uint[] valuesArray) onlyOwner external {
        address participant = 0x0;
        uint value = 0;
        for (uint i = 0; i < participantsArray.length; i++) {
            participant = participantsArray[i];
            value = valuesArray[i];
            setEarlyParticipantWhitelist(participant, value);
        }
    }

    /**
     * Finalize a successful crowdsale.
     *
     * The owner can trigger a call the contract that provides post-crowdsale actions, like releasing the tokens.
     */
    function finalize() inState(State.Success) onlyOwner whenNotPaused external {
        // Already finalized
        require(!finalized);
        finalizeAgent.finalizeCrowdsale();
        finalized = true;
    }

    /** This is for manual allow refunding */
    function allowRefunding(bool val) onlyOwner external {
        State state = getState();
        assert(paused || state == State.Success || state == State.Failure || state == State.Refunding);
        allowRefund = val;
    }

    /**
     * Allow load refunds back on the contract for the refunding.
     * The team can transfer the funds back on the smart contract in the case when is set refunding mode
     */
    function loadRefund() inState(State.Failure) external payable {
        require(msg.value != 0);
        loadedRefund = loadedRefund.add(msg.value);
    }

    function refund() inState(State.Refunding) external {
        require(allowRefund);
        uint256 weiValue = investedAmountOf[msg.sender];
        require(weiValue != 0);
        investedAmountOf[msg.sender] = 0;
        weiRefunded = weiRefunded.add(weiValue);
        Refund(msg.sender, weiValue);
        msg.sender.transfer(weiValue);
    }

    function setPricingStrategy(PricingStrategy _pricingStrategy) onlyOwner public {
        State state = getState();
        if (state == State.PreFunding || state == State.Funding) {
            require(paused);
        }
        pricingStrategy = _pricingStrategy;
        require(pricingStrategy.isPricingStrategy());
    }

    function setMultisigWallet(address wallet) onlyOwner public {
        require(wallet != 0x0);
        assert(investorCount <= MAX_INVESTMENTS_BEFORE_MULTISIG_CHANGE);
        multisigWallet = wallet;
    }

    /**
     * Allow addresses to do early participation.
     */
    function setEarlyParticipantWhitelist(address participant, uint value) onlyOwner public {
        require(value != 0 && participant != 0x0);
        require(value <= pricingStrategy.getPresaleMaxValue());
        assert(!pricingStrategy.isPresaleFull(whitelistWeiRaised));
        earlyParticipantWhitelist[participant] = value;
        whitelistWeiRaised = whitelistWeiRaised.add(value);
        Whitelisted(participant, value);
    }

    function getTokensLeft() public constant returns (uint) {
        return token.allowance(beneficiary, this);
    }

    /**
     * We are sold out when our approve pool becomes empty.
     */
    function isCrowdsaleFull() public constant returns (bool) {
        return getTokensLeft() == 0;
    }


    /**
     * Crowdfund state machine management.
     */
    function getState() public constant returns (State) {
        if(finalized) return State.Finalized;
        else if (!isPreallocated) return State.Preparing;
        else if (address(finalizeAgent) == 0) return State.Preparing;
        else if (block.timestamp < presaleStartsAt) return State.Preparing;
        else if (block.timestamp >= presaleStartsAt && block.timestamp < startsAt) return State.PreFunding;
        else if (block.timestamp <= endsAt && block.timestamp >= startsAt && !isCrowdsaleFull()) return State.Funding;
        else if (!allowRefund && isCrowdsaleFull()) return State.Success;
        else if (!allowRefund && block.timestamp > endsAt) return State.Success;
        else if (allowRefund && weiRaised > 0 && loadedRefund >= weiRaised) return State.Refunding;
        else return State.Failure;
    }


    /** Check is crowdsale can be able to transfer all tokens from beneficiary */
    function isAllTokensApproved() private constant returns (bool) {
        return getTokensLeft() == token.totalSupply() - tokensSold
                && token.transferAgents(beneficiary);
    }


    function isBreakingCap(uint tokenAmount) private constant returns (bool limitBroken) {
        return tokenAmount > getTokensLeft();
    }


    function investInternal(address receiver, uint128 customerId) whenNotPaused internal{
        State state = getState();
        require(state == State.PreFunding || state == State.Funding);
        uint weiAmount = msg.value;
        uint tokenAmount = 0;


        if (state == State.PreFunding) {
            require(earlyParticipantWhitelist[receiver] > 0);
            require(weiAmount <= earlyParticipantWhitelist[receiver]);
            assert(!pricingStrategy.isPresaleFull(presaleWeiRaised));
        }

        tokenAmount = pricingStrategy.getAmountOfTokens(weiAmount, weiRaised);
        require(tokenAmount > 0);
        if (investedAmountOf[receiver] == 0) {
            investorCount++;
        }

        investedAmountOf[receiver] = investedAmountOf[receiver].add(weiAmount);
        tokenAmountOf[receiver] = tokenAmountOf[receiver].add(tokenAmount);
        weiRaised = weiRaised.add(weiAmount);
        tokensSold = tokensSold.add(tokenAmount);

        if (state == State.PreFunding) {
            presaleWeiRaised = presaleWeiRaised.add(weiAmount);
            earlyParticipantWhitelist[receiver] = earlyParticipantWhitelist[receiver].sub(weiAmount);
        }

        require(!isBreakingCap(tokenAmount));

        assignTokens(receiver, tokenAmount);

        require(multisigWallet.send(weiAmount));

        Invested(receiver, weiAmount, tokenAmount, customerId);
    }

    /**
     * Transfer tokens from approve() pool to the buyer.
     *
     * Use approve() given to this crowdsale to distribute the tokens.
     */
    function assignTokens(address receiver, uint tokenAmount) private {
        require(token.transferFrom(beneficiary, receiver, tokenAmount));
    }

    /**
     * Preallocate tokens for developers, company and bounty
     */
    function preallocateTokens() private {
//        TODO: replace to real address
        uint multiplier = 10 ** 18;
        assignTokens(0x58FC33aC6c7001925B4E9595b13B48bA73690a39, 6450000 * multiplier); // developers
        assignTokens(0x78534714b6b02996990cd567ebebd24e1f3dfe99, 6400000 * multiplier); // company
        assignTokens(0xd64a60de8A023CE8639c66dAe6dd5f536726041E, 2400000 * multiplier); // bounty
    }

}