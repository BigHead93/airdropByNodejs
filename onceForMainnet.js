//给一个固定地址转账
var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/<your token>'));
var fs = require('fs');
var Tx = require('ethereumjs-tx');
var csv = require('fast-csv');

// var allocData = new Array();
// var allocAmount = new Array();
// var countBase = 0;

var fromAddr = "<your wallet address>";
var fromAddrKey = "<wallet private key>";
var privateKey = new Buffer.from(fromAddrKey, 'hex');
var abi = "<abi >"
var contractAddress = "";
var gasPrice = web3.utils.toHex(15000000000); 
var gasLimit = web3.utils.toHex(60000);

// web3.eth.getTransactionCount(fromAddr).then(console.log);
// web3.eth.getBlockNumber(console.log);

var toAddr = "<target receiver's address>";
var transferAmount = 500 + "000000000000000000";
execute_contract(toAddr, transferAmount);

// function execute_contract(fromAddr, fromAddrKey, toAddr, contractAddr, gasPrice, gasLimit){
function execute_contract(toAddr, transferAmount){
// construct the contract
// refer the part 1 in this tutorial to get abi value of a contract
  var contract = new web3.eth.Contract(abi, contractAddress, {
      from: fromAddr, // default from address
  });
  
// construct Tx
web3.eth.getTransactionCount(fromAddr).then( function(nonce){
  // nonce = xxx;  <if you want to use specific nonce>
  console.log("nonce: " + nonce);
  var rawTx = {
      "from": fromAddr,
      "nonce": web3.utils.numberToHex(parseInt(nonce)),
      "gasPrice": gasPrice,
      "gasLimit": gasLimit,
      "to": contractAddress,
      "value": "0x0", // ether value, usually 0
      "data": contract.methods.transfer(toAddr, transferAmount).encodeABI(),
      "chainId": 0x01  // mainnet chain
  };

  // sign and send
  // var privateKey = new Buffer.from(fromAddrKey, 'hex');
  var tx = new Tx(rawTx);
  tx.sign(privateKey);
  var serializedTx = tx.serialize();
  // console.log(serializedTx.toString('hex'));

  web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('transactionHash', function(hash){
    console.log('Txn:' + hash);
  }).on('receipt', function(receipt){
     console.log('Receipt:' + receipt);
  });
  });
};