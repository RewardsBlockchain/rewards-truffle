const RewardsToken = artifacts.require('../contracts/RewardsToken.sol');
const VestingVault = artifacts.require('../contracts/VestingVault.sol');
const Utils = require('./helpers/utils').Utils;
const BigNumber = require('bignumber.js');

contract('VestingVault', (accounts) => {
    let tokenInstance;
    let vestingVaultInstance;
    let currentTime;
    let vestingAmount;
    let scheduleAmounts;
    let scheduleTimes;
    let sumAmount;
    before(async () => {
        tokenInstance = await RewardsToken.deployed();
        vestingVaultInstance = await VestingVault.deployed();

        // unfreeze tokens
        await tokenInstance.unfreeze();

        currentTime = Math.round((new Date().getTime())/1000); // unix time stamp
        vestingAmount = new BigNumber(Math.pow(10, 20));
        scheduleAmounts = [
            new BigNumber(Math.pow(10, 20)),
            new BigNumber(Math.pow(10, 20)),
            new BigNumber(Math.pow(10, 20))
        ];
        sumAmount = new BigNumber(3 * Math.pow(10, 20));
    });

    describe('Grant and Claim Functions', async () => {

        it('should not be able to claim before default vesting start', async () => {
            await vestingVaultInstance.grant(accounts[0], vestingAmount, currentTime - 5000, 10000, 6000, [], [],1);
            await tokenInstance.mint(vestingVaultInstance.address, vestingAmount);
            const balanceBeforeClaim = await tokenInstance.balanceOf(accounts[0]);
            assert.strictEqual(balanceBeforeClaim.toString(), '0', 'Balance before claim is wrong; should be 0');
            try {
                await vestingVaultInstance.claim({from: accounts[0]});
            } catch (error) {
                Utils.ensureException(error);
            }
        });
        it('should be able to claim right amount of tokens during default vesting duration', async () => {
            await vestingVaultInstance.grant(accounts[1], vestingAmount, currentTime - 5000, 10000, 4000, [], [],1);
            await tokenInstance.mint(vestingVaultInstance.address, vestingAmount);
            const balanceBeforeClaim = await tokenInstance.balanceOf(accounts[1]);
            assert.strictEqual(balanceBeforeClaim.toString(), '0', 'Balance before claim is wrong; should be 0');
            await vestingVaultInstance.claim({from: accounts[1]});
            const balanceAfterClaim = await tokenInstance.balanceOf(accounts[1]);
            assert.isAbove(parseInt(balanceAfterClaim.toString()), 0, 'Balance after claim is wrong; should be greater than 0');

        });
        it('should be able to claim all vested tokens after default vesting duration', async () => {
            await vestingVaultInstance.grant(accounts[2], vestingAmount, currentTime - 5000, 4000, 3000, [], [],1);
            await tokenInstance.mint(vestingVaultInstance.address, vestingAmount);
            const balanceBeforeClaim = await tokenInstance.balanceOf(accounts[2]);
            assert.strictEqual(balanceBeforeClaim.toString(), '0', 'Balance before claim is wrong; should be 0');
            await vestingVaultInstance.claim({from: accounts[2]});
            const balanceAfterClaim = await tokenInstance.balanceOf(accounts[2]);
            assert.strictEqual(balanceAfterClaim.toString(), vestingAmount.toString(), 'Balance after claim is wrong; should be ' + vestingAmount.toNumber());
        });

        it('should not be able to claim before first scheduled vesting time', async () => {
            scheduleTimes = [currentTime + 1000, currentTime + 2000, currentTime + 3000];
            await vestingVaultInstance.grant(accounts[3], 0, 0, 0, 0, scheduleTimes, scheduleAmounts,2);
            await tokenInstance.mint(vestingVaultInstance.address, vestingAmount);
            const balanceBeforeClaim = await tokenInstance.balanceOf(accounts[3]);
            assert.strictEqual(balanceBeforeClaim.toString(), '0', 'Balance before claim is wrong; should be 0');
            try {
                await vestingVaultInstance.claim({from: accounts[3]});
            } catch (error) {
                Utils.ensureException(error);
            }
        });
        it('should be able to claim right amount of tokens during scheduled vesting times', async () => {
            scheduleTimes = [currentTime - 1000, currentTime, currentTime + 1000];
            await vestingVaultInstance.grant(accounts[4], 0, 0, 0, 0, scheduleTimes, scheduleAmounts,2);
            await tokenInstance.mint(vestingVaultInstance.address, sumAmount);
            const balanceBeforeClaim = await tokenInstance.balanceOf(accounts[4]);
            assert.strictEqual(balanceBeforeClaim.toString(), '0', 'Balance before claim is wrong; should be 0');
            await vestingVaultInstance.claim({from: accounts[4]});
            const balanceAfterClaim = await tokenInstance.balanceOf(accounts[4]);
            assert.isAbove(parseInt(balanceAfterClaim.toString()), 0, 'Balance after claim is wrong; should be greater than 0');
        });
        it('should be able to claim all vested tokens after last scheduled vesting time', async () => {
            scheduleTimes = [currentTime - 3000, currentTime - 2000, currentTime - 1000];
            await vestingVaultInstance.grant(accounts[5], 0, 0, 0, 0, scheduleTimes, scheduleAmounts,2)
            await tokenInstance.mint(vestingVaultInstance.address, sumAmount);
            const balanceBeforeClaim = await tokenInstance.balanceOf(accounts[5]);
            assert.strictEqual(balanceBeforeClaim.toString(), '0', 'Balance before claim is wrong; should be 0');
            await vestingVaultInstance.claim({from: accounts[5]});
            const balanceAfterClaim = await tokenInstance.balanceOf(accounts[5]);
            assert.strictEqual(balanceAfterClaim.toString(), sumAmount.toString(), 'Balance after claim is wrong; should be ' + sumAmount);
        });
    });

    describe('Events', async () => {
        it('should be able to track NewGrant event', async () => {
            await tokenInstance.mint(vestingVaultInstance.address, vestingAmount);
            const result = await vestingVaultInstance.grant(accounts[6], vestingAmount, currentTime - 5000, 4000, 3000, [], [],1);
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'NewGrant');
            assert.strictEqual(event.args._to, accounts[6]);
            assert.strictEqual(event.args._amount.toString(), vestingAmount.toString());
            assert.strictEqual(Number(event.args._start), currentTime - 5000);
            assert.strictEqual(Number(event.args._duration), 4000);
            assert.strictEqual(Number(event.args._cliff), 3000);
            assert.strictEqual(Number(event.args._level), 1);
        });
        it('should be able to track NewRelease event', async () => {
            const result = await vestingVaultInstance.claim({from: accounts[6]});
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'NewRelease');
            assert.strictEqual(event.args._holder, accounts[6]);
            assert.strictEqual(event.args._amount.toString(), vestingAmount.toString());
        });
        it('should be able to track BurnTokens event', async () => {
            const result = await vestingVaultInstance.burnRemainingTokens();
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'BurnTokens');
        });
        it('should be able to track WithdrawAll event', async () => {
            const result = await vestingVaultInstance.withdraw();
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'WithdrawAll');
        });
        it('should be able to track LockedVault event', async () => {
            const result = await vestingVaultInstance.lockVault();
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'LockedVault');
        });
    });
});