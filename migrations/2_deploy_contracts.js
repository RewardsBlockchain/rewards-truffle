const RewardsToken = artifacts.require('RewardsToken');
const RewardsTokenDistribution = artifacts.require('RewardsTokenDistribution');
const VestingVault = artifacts.require('VestingVault');
const dotenv = require('dotenv');
const Web3 = require('web3');
dotenv.config();

module.exports = function (deployer, network) {
    if (network === 'remote') {
        const provider = new Web3.providers.HttpProvider(
            "https://" + process.env.GETH_REMOTE_URL,
            5000,
            process.env.GETH_USER,
            process.env.GETH_PASSWORD
        );

        const web3 = new Web3(provider);
        web3.personal.unlockAccount(web3.eth.accounts[0], process.env.PASSWORD);
    } else if (network === 'local') {
        const provider = new Web3.providers.HttpProvider("http://localhost:8545");
        const web3 = new Web3(provider);
        web3.personal.unlockAccount(web3.eth.accounts[0], process.env.PASSWORD);
    }

    deployer.deploy(RewardsToken).then(() => {
        console.log('--------------------------------------------------------');
        console.log('[RewardsToken] contract deployed: ', RewardsToken.address);
        return deployer.deploy(VestingVault, RewardsToken.address).then(() => {
            console.log('--------------------------------------------------------');
            console.log('[VestingVault] contract deployed: ', VestingVault.address);
            return deployer.deploy(RewardsTokenDistribution, RewardsToken.address, VestingVault.address).then(() => {
                console.log('--------------------------------------------------------');
                console.log('[RewardsTokenDistribution] contract deployed: ', RewardsTokenDistribution.address);
            });
        });
    });
};
