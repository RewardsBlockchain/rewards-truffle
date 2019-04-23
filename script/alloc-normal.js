const fs = require('fs');
const csv = require('fast-csv');
const BigNumber = require('bignumber.js');
const dotenv = require('dotenv');
const CoreApp = require('./core-app').CoreApp;
const truffle = require('../truffle');
dotenv.config();

const coreApp = new CoreApp(truffle.networks[process.env.TRUFFLE_NETWORK_ALIAS], process.env.TRUFFLE_NETWORK_ALIAS);
const distInstance = coreApp.distributionContract;

let alloc = [];

async function setAllocation() {
    console.log(`
    ----------------------------------------------------------
    -------------- Starting Manual Allocations ---------------
    ----------------------------------------------------------
    `);
    await coreApp.getAccounts();

    alloc.map(async (item) => {
        console.log(`\nStart allocation for ${item.address}, for amount ${item.amount}`);
        await allocTokens(item.address, coreApp.web3.utils.toWei(item.amount, 'ether'));
    });

    //console.log(`All done! very good`);
}

function allocTokens(address, amount) {
    return new Promise((resolve, reject) => {
        distInstance.methods.allocNormalUser(address, amount).send({
            from: coreApp.owner,
            gas: 5000000
        })
            .on('error', function (error) {
                console.log('Send.on.Error: ' + error);
                //reject(error);
            })
            .on('transactionHash', function (transactionHash) {
                console.log(`Transaction hash: \n${transactionHash.toString()}`);
            })
            .on('receipt', function (receipt) {
                console.log(receipt.contractAddress);
                resolve(receipt.contractAddress);
            })
            .on('confirmation', function (confNumber, receipt) {
            })
            .then(function (newContractInstance) {
              console.log(newContractInstance.options.address);
            })
    })
}

function checkVestingValidation(data) {
    if (data.length !== 2) {
        console.log(`Invalid Length of Params`);
        return false;
    }
    if (!coreApp.web3.utils.isAddress(data[0])) {
        console.log(`Invalid Address: ${data[0]}`);
        return false;
    }
    if (Number(data[1]) < 0) {
        console.log(`Invalid Amount: ${data[1]}`);
        return false;
    }

    console.log(data);
    return data;
}

function readFile() {
    let stream = fs.createReadStream("data/data_for_normal.csv");

    let count = 0;
    let invalidCount = 0;

    console.log(`
    -----------------------------------------------------------
    ----------- Parsing data_for_normal.csv File --------------
    -----------------------------------------------------------
    `);

    let csvStream = csv()
        .on('data', function (data) {
            data = checkVestingValidation(data);
            if (data) {
                alloc.push({
                    address: data[0],
                    amount: data[1]
                });
            } else {
                invalidCount++;
            }
            count++;
        })
        .on('end', function () {
            console.log(`Finished Parsing CSV File`);
            console.log(`Parsed ${count} addresses`);
            console.log(`Failed to parse ${invalidCount} addresses`);

            setAllocation();
        });

    stream.pipe(csvStream);
}

readFile();