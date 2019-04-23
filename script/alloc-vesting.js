let fs = require('fs');
let csv = require('fast-csv');
let BigNumber = require('bignumber.js');
const dotenv = require('dotenv');
const CoreApp = require('./core-app').CoreApp;
const truffle = require('../truffle');
dotenv.config();

const coreApp = new CoreApp(truffle.networks[process.env.TRUFFLE_NETWORK_ALIAS], process.env.TRUFFLE_NETWORK_ALIAS);

let allocAddresses = []; // array of addresses
let allocAmounts = []; // array of amounts
let allocStarts = []; // array of starts
let allocCliffs = []; // array of cliff
let allocDurations = []; // array of duration
let allocScheduleTimes = []; // array of schedule times
let allocScheduleValues = []; // array of schedule values
let allocLevels = []; // array of batch levels

async function setAllocation() {
    console.log(`
    ----------------------------------------------------------
    -------------- Starting Vesting Allocations --------------
    ----------------------------------------------------------
    `);

    let distInstance = await coreApp.distributionContract;

    for (let i = 0; i < allocAddresses.length; i++) {
        try {
            console.log(`+ Start allocation for ${allocAddresses[i]} address`);

            let res = await distInstance.methods
                .allocVestedUser(
                    allocAddresses[i],
                    new BigNumber(allocAmounts[i] * Math.pow(10, 18)),
                    allocStarts[i],
                    allocDurations[i],
                    allocCliffs[i],
                    allocScheduleTimes[i],
                    allocScheduleValues[i],
                    allocLevels[i])
                .call({from: coreApp.owner, gas: 3000000});

            // console.log(`- Successfully allocated for ${allocAddresses[i]} . ${res.receipt.gasUsed} gas used.`);
        } catch (err) {
            console.log("ERROR", err);
        }
    }
}

function checkVestingValidation(data) {
    if (data.length !== 8) {
        console.log(`Invalid Length of Params`);
        return false;
    }
    if (!coreApp.web3.utils.isAddress(data[0])) {
        console.log(`Invalid Address: ${data[0]}`);
        return false;
    }
    if (Number(data[7]) !== 1 && Number(data[7]) !== 2) {
        console.log(`Invalid Level: ${Number(data[7])}`);
        return false;
    }
    if (Number(data[7]) === 1) {
        if (Number(data[1]) < 0) {
            console.log(`Invalid Amount: ${data[1]}`);
            return false;
        }
        if (Number(data[2]) < 0) {
            console.log(`Invalid Start: ${data[2]}`);
            return false;
        }
        if (Number(data[3]) < 0) {
            console.log(`Invalid Duration: ${data[3]}`);
            return false;
        }
        if (Number(data[4]) < 0) {
            console.log(`Invalid Cliff: ${data[4]}`);
            return false;
        }
        data[5] = [];
        data[6] = [];
    } else {
        let scheduleTimes = data[5].split(':');
        let scheduleValues = data[6].split(':');

        if (scheduleTimes.length !== scheduleValues.length) {
            console.log(`Invalid Length of Schedule}`);
            return false;
        }
        for (let i = 0; i < scheduleTimes.length; i++) {
            if (Number(scheduleTimes[i]) <= 0) {
                console.log(`Invalid ScheduleTime: ${scheduleTimes[i]}`);
                return false;
            }
            if (Number(scheduleValues[i]) <= 0) {
                console.log(`Invalid ScheduleValue: ${scheduleValues[4]}`);
                return false;
            }
            if (i > 0) {
                if (scheduleTimes[i] < scheduleTimes[i - 1]) {
                    console.log(`Invalid ScheduleTimes by ASC order: ${scheduleTimes[i - 1]}:${scheduleTimes[i]}`);
                    return false;
                }
            }
        }
        data[1] = 0;
        data[2] = 0;
        data[3] = 0;
        data[4] = 0;
        data[5] = scheduleTimes;
        data[6] = scheduleValues;
    }
    return data;
}

function readFile() {
    let stream = fs.createReadStream("data/data_for_vesting.csv");

    let count = 0;
    let invalidCount = 0;

    console.log(`
    -----------------------------------------------------------
    ----------- Parsing data_for_vesting.csv File -------------
    -----------------------------------------------------------
    `);

    let csvStream = csv()
        .on('data', function (data) {
            data = checkVestingValidation(data);
            if (data) {
                allocAddresses.push(data[0]);
                allocAmounts.push(data[1]);
                allocStarts.push(data[2]);
                allocDurations.push(data[3]);
                allocCliffs.push(data[4]);
                allocScheduleTimes.push(data[5]);
                allocScheduleValues.push(data[6]);
                allocLevels.push(data[7]);
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