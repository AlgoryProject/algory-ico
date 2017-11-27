#! /bin/bash

./node_modules/.bin/truffle-flattener contracts/crowdsale/AlgoryPricingStrategy.sol > contracts/flattened/AlgoryPricingStrategy.sol
./node_modules/.bin/truffle-flattener contracts/crowdsale/AlgoryFinalizeAgent.sol > contracts/flattened/AlgoryFinalizeAgent.sol
./node_modules/.bin/truffle-flattener contracts/crowdsale/AlgoryCrowdsale.sol > contracts/flattened/AlgoryCrowdsale.sol
./node_modules/.bin/truffle-flattener contracts/token/AlgoryToken.sol > contracts/flattened/AlgoryToken.sol
./node_modules/.bin/truffle-flattener contracts/wallet/MultiSigWallet.sol > contracts/flattened/MultiSigWallet.sol