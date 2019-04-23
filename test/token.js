const RewardsToken = artifacts.require('../contracts/RewardsToken.sol');
const Utils = require('./helpers/utils').Utils;

contract('RewardsToken', (accounts) => {
    let tokenInstance;

    before(async () => {
        tokenInstance = await RewardsToken.deployed();

        // unfreeze tokens
        await tokenInstance.unfreeze();
    });

    describe("ERC20-Default functions", async () => {
        it("verify constructors", async () => {
            const tokenName = await tokenInstance.name();
            assert.equal(tokenName.toString(), "Rewards Cash");
            const tokenSymbol = await tokenInstance.symbol();
            assert.equal(tokenSymbol.toString(), "RWRD");
            const decimals = await tokenInstance.decimals();
            assert.strictEqual(decimals.toNumber(), 18);
            await tokenInstance.mint(accounts[0], 10000);
            const totalSupply = await tokenInstance.totalSupply();
            assert.equal(totalSupply.toNumber(), 10000);
        });
        it('should not be able to transfer ether directly to the token contract', async () => {
            try {
                await web3.eth.sendTransaction({
                    from: accounts[0],
                    to: tokenInstance.address,
                    value: web3.utils.toWei('10', 'Ether')
                });
            } catch (error) {
                Utils.ensureException(error);
            }
        });
        it('should be able to transfer right amount of tokens', async () => {
            const balanceBefore = await tokenInstance.balanceOf(accounts[1]);
            assert.strictEqual(balanceBefore.toNumber(), 0, 'Balance before transfer is wrong; should be 0');
            await tokenInstance.transfer(accounts[1], 10000, {from: accounts[0]});
            const balanceAfter = await tokenInstance.balanceOf(accounts[1]);
            assert.strictEqual(balanceAfter.toNumber(), 10000, 'Balance after transfer is wrong; should be 10000');
        });
        it('should be able to approve right amount of tokens', async () => {
            const allowanceBeforeApproval = await tokenInstance.allowance(accounts[1], accounts[2]);
            assert.strictEqual(allowanceBeforeApproval.toNumber(), 0, 'Allowance before approval is wrong; should be 0');
            await tokenInstance.approve(accounts[2], 10000, {from: accounts[1]});
            const allowanceAfterApproval = await tokenInstance.allowance(accounts[1], accounts[2]);
            assert.strictEqual(allowanceAfterApproval.toNumber(), 10000, 'Allowance after approval is wrong; should be 10000');
        });
        it('should be able to increase right approval amount of tokens', async () => {
            const allowanceBeforeIncrease = await tokenInstance.allowance(accounts[1], accounts[2]);
            assert.strictEqual(allowanceBeforeIncrease.toNumber(), 10000, 'Allowance before increase is wrong; should be 10000');
            await tokenInstance.increaseApproval(accounts[2], 10000, {from: accounts[1]});
            const allowanceAfterIncrease = await tokenInstance.allowance(accounts[1], accounts[2]);
            assert.strictEqual(allowanceAfterIncrease.toNumber(), 20000, 'Allowance after increase is wrong; should be 20000');
        });
        it('should be able to decrease right approval amount of tokens', async () => {
            const allowanceBeforeDecrease = await tokenInstance.allowance(accounts[1], accounts[2]);
            assert.strictEqual(allowanceBeforeDecrease.toNumber(), 20000, 'Allowance before decrease is wrong; should be 20000');
            await tokenInstance.decreaseApproval(accounts[2], 10000, {from: accounts[1]});
            const allowanceAfterDecrease = await tokenInstance.allowance(accounts[1], accounts[2]);
            assert.strictEqual(allowanceAfterDecrease.toNumber(), 10000, 'Allowance after decrease is wrong; should be 10000');
        });
        it('should be able to transfer right amount of tokens from account1 to account0', async () => {
            const beneficiaryBalanceBefore = await tokenInstance.balanceOf(accounts[0]);
            assert.strictEqual(beneficiaryBalanceBefore.toNumber(), 0, 'Balance before transfer from is wrong; should be 0');
            await tokenInstance.transferFrom(accounts[1], accounts[0], 10000, {from: accounts[2]});
            const beneficiaryBalanceAfter = await tokenInstance.balanceOf(accounts[0]);
            assert.strictEqual(beneficiaryBalanceAfter.toNumber(), 10000, 'Balance after transfer from is wrong; should be 10000');
        });
    });

    describe("Non-ERC20 functions", async () => {
        it('should be able to mint right amount of tokens', async () => {
            const balanceBeforeMint = await tokenInstance.balanceOf(accounts[2]);
            assert.strictEqual(balanceBeforeMint.toNumber(), 0, 'Balance before mint is wrong; should be 0');
            await tokenInstance.mint(accounts[2], 10000);
            const balanceAfterMint = await tokenInstance.balanceOf(accounts[2]);
            assert.strictEqual(balanceAfterMint.toNumber(), 10000, 'Balance After mint is wrong; should be 10000');
        });
        it('should be able to burn right amount of tokens', async () => {
            await tokenInstance.mint(accounts[3], 20000);
            const balanceBeforeBurn = await tokenInstance.balanceOf(accounts[3]);
            assert.strictEqual(balanceBeforeBurn.toNumber(), 20000, 'Balance before burn is wrong; should be 20000');
            await tokenInstance.burn(10000, {from: accounts[3]});
            const balanceAfterBurn = await tokenInstance.balanceOf(accounts[3]);
            assert.strictEqual(balanceAfterBurn.toNumber(), 10000, 'Balance after burn is wrong; should be 10000');
        });
        it('should be able to lock minting', async () => {
            let finished = await tokenInstance.mintingFinished();
            assert.equal(finished, false, 'MintingFinished should be false');
            await tokenInstance.finishMinting();
            finished = await tokenInstance.mintingFinished();
            assert.equal(finished, true, 'MintingFinished should be true');
        });
        it('should be able to unlock minting', async () => {
            let finished = await tokenInstance.mintingFinished();
            assert.equal(finished, true, 'MintingFinished should be true');
            await tokenInstance.startMinting();
            finished = await tokenInstance.mintingFinished();
            assert.equal(finished, false, 'MintingFinished should be false');
        });
        it('should be able to revoke right amount of tokens', async () => {
            const balanceBeforeRevoke = await tokenInstance.balanceOf(accounts[3]);
            assert.strictEqual(balanceBeforeRevoke.toNumber(), 10000, 'Balance before revoke is wrong; should be 10000');
            await tokenInstance.revoke(accounts[3], 5000);
            const balanceAfterRevoke = await tokenInstance.balanceOf(accounts[3]);
            assert.strictEqual(balanceAfterRevoke.toNumber(), 5000, 'Balance after revoke is wrong; should be 5000');
        });
        it('should be able to freeze tokens', async () => {
            let frozen = await tokenInstance.frozen();
            assert.equal(frozen, false, 'Frozen should be false');
            await tokenInstance.freeze();
            frozen = await tokenInstance.frozen();
            assert.equal(frozen, true, 'frozen should be true');
            try {
                await tokenInstance.transfer(accounts[0], 5000, {from: accounts[3]});
            } catch (error) {
                Utils.ensureException(error);
            }
        });
        it('should be able to unfreeze tokens', async () => {
            let frozen = await tokenInstance.frozen();
            assert.equal(frozen, true, 'Frozen should be true');
            await tokenInstance.unfreeze();
            frozen = await tokenInstance.frozen();
            assert.equal(frozen, false, 'Frozen should be false');
            const balanceBeforeTranster = await tokenInstance.balanceOf(accounts[3]);
            assert.strictEqual(balanceBeforeTranster.toNumber(), 5000, 'Balance before transfer is wrong; should be 5000');
            await tokenInstance.transfer(accounts[0], 5000, {from: accounts[3]});
            const balanceAfterTransfer = await tokenInstance.balanceOf(accounts[3]);
            assert.strictEqual(balanceAfterTransfer.toNumber(), 0, 'Balance after transfer is wrong; should be 0');
        });
    });

    describe('Events', async () => {
        it('should be able to track Transfer event', async () => {
            await tokenInstance.mint(accounts[4], 10000);
            const result = await tokenInstance.transfer(accounts[5], 5000, {from: accounts[4]});
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'Transfer');
            assert.equal(event.args._from, accounts[4]);
            assert.equal(event.args._to, accounts[5]);
            assert.equal(Number(event.args._value), 5000);
        });
        it('should be able to track Approval event', async () => {
            const result = await tokenInstance.approve(accounts[5], 5000, {from: accounts[4]});
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'Approval');
            assert.equal(event.args._owner, accounts[4]);
            assert.equal(event.args._spender, accounts[5]);
            assert.equal(Number(event.args._value), 5000);
        });
        it('should be able to track Burned event', async () => {
            const result = await tokenInstance.burn(5000, {from: accounts[5]});
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'Burned');
            assert.equal(event.args._burner, accounts[5]);
            assert.equal(Number(event.args._burnedAmount), 5000);
        });
        it('should be able to track Revoke event', async () => {
            const result = await tokenInstance.revoke(accounts[4], 5000);
            assert.lengthOf(result.logs, 2);
            const event = result.logs[0];
            assert.equal(event.event, 'Revoke');
            assert.equal(event.args._from, accounts[4]);
            assert.equal(Number(event.args._value), 5000);
        });
        it('should be able to track MintFinished event', async () => {
            const result = await tokenInstance.finishMinting();
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'MintFinished');
        });
        it('should be able to track MintStarted event', async () => {
            const result = await tokenInstance.startMinting();
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'MintStarted');
        });
        it('should be able to track Freeze event', async () => {
            const result = await tokenInstance.freeze();
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'Freeze');
        });
        it('should be able to track Unfreeze event', async () => {
            const result = await tokenInstance.unfreeze();
            assert.lengthOf(result.logs, 1);
            const event = result.logs[0];
            assert.equal(event.event, 'Unfreeze');
        });
    });
});