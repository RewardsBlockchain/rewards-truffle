const RewardsToken = artifacts.require('../contracts/RewardsToken.sol');
const VestingVault = artifacts.require('../contracts/VestingVault.sol');
const RewardsTokenDistribution = artifacts.require('../contracts/RewardsTokenDistribution.sol');
const Utils = require('./helpers/utils').Utils;
const BigNumber = require('bignumber.js');

contract('RewardsTokenDistribution', (accounts) => {
    let tokenInstance;
    let vestingVaultInstance;
    let tokenDistributionInstance;
    let currentTime;
    let vestingAmount;
    let scheduleAmounts;
    let scheduleTimes;
    let sumAmount;
    before(async () => {
        tokenInstance = await RewardsToken.deployed();
        vestingVaultInstance = await VestingVault.deployed();
        tokenDistributionInstance = await RewardsTokenDistribution.deployed();

        // unfreeze tokens
        await tokenInstance.unfreeze();

        await tokenInstance.transferOwnership(tokenDistributionInstance.address);
        await vestingVaultInstance.transferOwnership(tokenDistributionInstance.address);

        currentTime = Math.round((new Date().getTime())/1000); // unix time stamp
        vestingAmount = new BigNumber(Math.pow(10, 20));
        scheduleAmounts = [
            new BigNumber(Math.pow(10, 20)),
            new BigNumber(Math.pow(10, 20)),
            new BigNumber(Math.pow(10, 20))
        ];
        sumAmount = 3 * Math.pow(10, 20);
    });

    describe('Grant and Claim Functions', async () => {
        it('should be able to allocate  normal user manually', async () => {
            const balanceBeforeAlloc = await tokenInstance.balanceOf(accounts[0]);
            console.log(balanceBeforeAlloc)
            assert.strictEqual(balanceBeforeAlloc.toString(), '0', 'Balance before alloc is wrong; should be 0');
            await tokenDistributionInstance.allocNormalUser(accounts[0], vestingAmount.toString());
            const balanceAfterAlloc = await tokenInstance.balanceOf(accounts[0]);
            assert.strictEqual(balanceAfterAlloc.toString(), vestingAmount.toString(), 'Balance after alloc is wrong; should be ' + vestingAmount);
        });
        it('should be able to allocate and claim according to default vesting', async () => {
            await tokenDistributionInstance.allocVestedUser(accounts[1], vestingAmount, currentTime - 5000, 4000, 3000, [], [],1);
            const balanceBeforeClaim = await tokenInstance.balanceOf(accounts[1]);
            assert.strictEqual(balanceBeforeClaim.toString(), '0', 'Balance before claim is wrong; should be 0');
            await vestingVaultInstance.claim({from: accounts[1]});
            const balanceAfterClaim = await tokenInstance.balanceOf(accounts[1]);
            assert.strictEqual(balanceAfterClaim.toString(), vestingAmount.toString(), 'Balance after claim is wrong; should be ' + vestingAmount.toNumber());
        });
        it('should be able to allocate and claim according to scheduled vesting', async () => {
            scheduleTimes = [currentTime - 3000, currentTime - 2000, currentTime - 1000];
            await tokenDistributionInstance.allocVestedUser(accounts[2], 0, 0, 0, 0, scheduleTimes, scheduleAmounts,2)
            const balanceBeforeClaim = await tokenInstance.balanceOf(accounts[2]);
            assert.strictEqual(balanceBeforeClaim.toString(), '0', 'Balance before claim is wrong; should be 0');
            await vestingVaultInstance.claim({from: accounts[2]});
            const balanceAfterClaim = await tokenInstance.balanceOf(accounts[2]);
            assert.strictEqual(balanceAfterClaim.toString(), sumAmount.toString(), 'Balance after claim is wrong; should be ' + sumAmount);
        });

    });

    describe('Events', async () => {
        it('should be able to track TokenMinted event', async () => {
            const result = await tokenDistributionInstance.allocNormalUser(accounts[3], vestingAmount);
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'TokenMinted');
            assert.equal(event.args._to, accounts[3]);
            assert.strictEqual(event.args._value.toString(), vestingAmount.toString());
        });
        it('should be able to track MintingFinished event', async () => {
            const result = await tokenDistributionInstance.finalize();
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'MintingFinished');
        });
    });
});