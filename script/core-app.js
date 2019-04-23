const fs = require('fs');
const Web3 = require('web3');
const contract = require("truffle-contract");

// contract initiation
const RewardsToken = JSON.parse(fs.readFileSync('build/contracts/RewardsToken.json'));
const RewardsTokenDistribution = JSON.parse(fs.readFileSync('build/contracts/RewardsTokenDistribution.json'));
const VestingVault = JSON.parse(fs.readFileSync('build/contracts/VestingVault.json'));

const dotenv = require('dotenv');
dotenv.config();

class CoreApp {
    constructor(network, alias) {
        this.provider = alias !== 'development' ? network.provider() : new Web3.providers.HttpProvider("http://localhost:8545");
        this.web3 = new Web3(this.provider);
        this.gasPrice = process.env.GAS_PRICE;
        this.gasLimit = process.env.GAS_LIMIT;
        this.alias = alias;
        if (alias === 'development') {
            this.tokenAddress = process.env.DEVELOPMENT_TOKEN_ADDRESS;
            this.vaultAddress = process.env.DEVELOPMENT_VAULT_ADDRESS;
            this.distributionAddress = process.env.DEVELOPMENT_DISTRIBUTION_ADDRESS;
        }
        if (alias === 'ropsten') {
            this.tokenAddress = process.env.ROPSTEN_TOKEN_ADDRESS;
            this.vaultAddress = process.env.ROPSTEN_VAULT_ADDRESS;
            this.distributionAddress = process.env.ROPSTEN_DISTRIBUTION_ADDRESS;
        }
        if (alias === 'rinkeby') {
            this.tokenAddress = process.env.RINKEBY_TOKEN_ADDRESS;
            this.vaultAddress = process.env.RINKEBY_VAULT_ADDRESS;
            this.distributionAddress = process.env.RINKEBY_DISTRIBUTION_ADDRESS;
        }
        this.tokenContract = new this.web3.eth.Contract(RewardsToken.abi, this.tokenAddress);
        this.vestingVaultContract = new this.web3.eth.Contract(VestingVault.abi, this.vaultAddress);
        this.distributionContract = new this.web3.eth.Contract(RewardsTokenDistribution.abi, this.distributionAddress);
        // this.tokenContract = contract(RewardsToken);
        // this.vestingVaultContract = contract(VestingVault);
        // this.distributionContract = contract(RewardsTokenDistribution);
        // this.tokenContract.setProvider(this.provider);
        // this.vestingVaultContract.setProvider(this.provider);
        // this.distributionContract.setProvider(this.provider);
    }

    getAccounts() {
        return new Promise(async (resolve, reject) => {
            try {
                const accounts = await this.web3.eth.getAccounts();
                this.owner = accounts[0];
                if (this.alias !== 'development') { // don't have to unlock for ganache
                    this.web3.eth.personal.unlockAccount(accounts[0], process.env.PASSWORD);
                    this.web3.eth.personal.unlockAccount(accounts[1], process.env.PASSWORD);
                    this.web3.eth.personal.unlockAccount(accounts[2], process.env.PASSWORD);
                    this.web3.eth.personal.unlockAccount(accounts[3], process.env.PASSWORD);
                    this.web3.eth.personal.unlockAccount(accounts[4], process.env.PASSWORD);
                    this.web3.eth.personal.unlockAccount(accounts[5], process.env.PASSWORD);
                    this.web3.eth.personal.unlockAccount(accounts[6], process.env.PASSWORD);
                }
                return resolve(true);
            } catch (error) {
                return reject(error);
            }
        })
    }

    async transferOwnerships() {
        try {
            await this.getAccounts();
            await this.tokenContract.methods.transferOwnership(this.distributionAddress).send({
                from: this.owner,
                gasPrice: this.gasPrice
            });
            await this.vestingVaultContract.methods.transferOwnership(this.distributionAddress).send({
                from: this.owner,
                gasPrice: this.gasPrice
            });
            // check if ownership successfully transferred
            console.log(`TokenContract Owner is : ${await this.tokenContract.methods.owner().call()}`);
            console.log(`VestingVaultContract Owner is : ${await this.vestingVaultContract.methods.owner().call()}`);

            // const distInstance = await this.distributionContract.deployed();
            // const tokenInstance = await this.tokenContract.deployed();
            // const vestingVaultInstance = await this.vestingVaultContract.deployed();
            //
            // const distAddr = distInstance.address;
            // // transfer ownership to token distribution contract
            // await tokenInstance.transferOwnership(distAddr, {from: this.owner, gasPrice: this.gasPrice});
            // await vestingVaultInstance.transferOwnership(distAddr, {from: this.owner, gasPrice: this.gasPrice});
            //
            // // check if ownership successfully transferred
            // console.log(`TokenContract Owner is : ${await tokenInstance.owner()}`);
            // console.log(`VestingVaultContract Owner is : ${await vestingVaultInstance.owner()}`);
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }

    async transferBackOwnerships() {
        try {
            await this.getAccounts();
            await this.distributionContract.methods.transferBackTokenOwnership().send({from: this.owner});
            await this.distributionContract.methods.transferBackVestingVaultOwnership().send({from: this.owner});
            // check if ownership successfully transferred
            console.log(`TokenContract Owner is : ${await this.tokenContract.methods.owner().call()}`);
            console.log(`VestingVaultContract Owner is : ${await this.vestingVaultContract.methods.owner().call()}`);
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }

    async finalize() {
        try {
            await this.distributionContract.methods.finalize().send({from: this.owner});
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }
}

exports.CoreApp = CoreApp;