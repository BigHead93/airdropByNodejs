/**
* address + amount
* batch airdrop，address and amount are stored in csv file named: address_amount.csv
* result: create two csv file
* 	1. transHash.csv，store target address and TxHash
*	2. error.csv, store failed address 
*/
var Web3 = require("web3");
let fs =require("fs");
var Tx = require("ethereumjs-tx");
var csv = require("fast-csv");

var log4js = require('log4js');
log4js.configure('./config/log4js.json');
var logger = require('log4js').getLogger("csv_airdrop_with_amount");

var allocData = new Array();
var allocAmount = new Array();
var countbase = 0;

var	web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/<your_token>"));

var fromAddr = "";      //you wallet address
var fromAddrKey = "";  //wallet primary key
var abi = <contract abi content>;
var contractAddress  = "<contract address>";    //contract address
var privateKey = new Buffer.from(fromAddrKey, 'hex');

var gasPrice = 10000000000; //gas price
var gasLimit = 60000;  //gas limit

var contractInstance = new web3.eth.Contract(abi, contractAddress, {
      from: fromAddr, // default from address
  });

if(!fs.existsSync("transferTxHash")){
	fs.mkdirSync("transferTxHash");
}

var timeStamp = getTimeStamp();
var csvWriteStream = csv.createWriteStream({headers: true});
var writableStream = fs.createWriteStream("transferTxHash/" + timeStamp + "transHash.csv");
var csvErrorStream = csv.createWriteStream({headers: true});
var errorStream    = fs.createWriteStream("transferTxHash/" + timeStamp + "error.csv");
csvWriteStream.pipe(writableStream);
csvErrorStream.pipe(errorStream);

try{
	// you can transfer by getting the nonce by web3 or give the dedicate nonce base.
	var nonceBase = web3.eth.getTransactionCount(fromAddr).then((value) => {
		console.log("nonce: " + value);
		readFile(value);
	});
	// var nonceBase = <current nonce value>;
	// readFile(nonceBase);
}catch(err){
	console.error(err);
}


function readFile(nonceBase){
    var stream = fs.createReadStream("./address_amount.csv");

    var csvStream = csv()
    	.on("data", function(data){
     		var isAddress = web3.utils.isAddress(data[0]);
		    if(isAddress && data!=null && data!='' ){
		    	allocData.push(data[0]);
		    	allocAmount.push(data[1]);
		    }
	    })
	    .on("end", function(){
	    	var i = 0;
			allocData.forEach(function(alloc){
				try{
					var toAddress = JSON.stringify(alloc).substr(1, 42);
					var toAmount = allocAmount[i++];
			    	console.log('address: ' + toAddress + '\namount: ' + toAmount);
					setAllocation(nonceBase + countbase++, toAddress, toAmount);
				}catch(err){
					console.log("error: ", err);
				}
			})
	    });

    stream.pipe(csvStream);
}

function setAllocation(_nonce, _to, _amount){
	console.log('prepare for new transaction: %s %s', _to, _amount);
	var transfer_amount = _amount + '000000000000000000';  //10^18                       		//数量，16进制32位
	var noncehex = "0x" + _nonce.toString(16);
	var data = contractInstance.methods.transfer(_to, transfer_amount).encodeABI();
	// web3.eth.estimateGas({
	// 	"from" : fromAddr,
	// 	"nonce": noncehex,
	// 	"to"   : contractAddress,
	// 	"data" : data
	// }).then((value) => {
	// 	gasLimit = value > gasLimit ? value : gasLimit;
		console.log("gas limit: " + gasLimit);
		var signedTx = {
			"from"		: fromAddr,    			//from:your wallet address
			"nonce"		: noncehex, 
			"gasPrice"	: web3.utils.toHex(gasPrice),         
			"gasLimit"	: web3.utils.toHex(gasLimit),
			"to"		: contractAddress,      //to: contract address
			"value"		: "0x00",
			"data"		: data,
			"chainId"	: 1
		}

		var tx = new Tx(signedTx);
		tx.sign(privateKey, fromAddr);
		var serializedTx = tx.serialize();

		try{
			web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'),
				function(err, hash) {
			    if (!err) {
			    	console.log("-------------------");
			    	console.log("to: " + _to);
			        console.log("TxHash: " + hash);
			        csvWriteStream.write({
			        	address : _to,
			        	amount  : _amount,
			        	TxHash  : hash,
			        	gasLimit: gasLimit
			        });
			    } else {
			    	console.log("=====error occur=====");
			    	console.log("to: " + _to);
			        console.log("TxHash: " + hash);
			        console.log(err);
			        csvErrorStream.write({
			        	address : _to,
			        	amount  : _amount,
			        	TxHash  : hash
			        });
			    }
			}).on('receipt', function (receipt) {
				console.log('---receipt----');
				console.log(receipt);
			});
		}catch(err){
			console.log('ERROR: ' + err);
		}
	// });
}

// function sleep(numberMillis) {
//     var now = new Date();
//     var exitTime = now.getTime() + numberMillis;
//     while (true) {
//         now = new Date();
//         if (now.getTime() > exitTime)
//             return;
//     }
// }


// function toHex32(_decimal){
// 	if(typeof _decimal == 'string'){
// 		_decimal = parseInt(_decimal, 10);
// 	}
// 	let zeros = "00000000000000000000000000000000";
// 	let hex = _decimal.toString(16);
// 	let len0 = 32 - hex.length;
// 	return zeros.substr(0, len0) + hex;
// }

function format(n) { return n < 10 ? '0' + n : n }
function getTimeStamp(){
	var date = new Date();

	var time = date.getFullYear().toString() 
				+ format( date.getMonth() + 1) 
				+ format( date.getDate())
				+ "_" 
				+ format( date.getHours() ) 
				+ format( date.getMinutes() )
				+ format( date.getSeconds() );

	return time;
}

