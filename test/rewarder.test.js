const { ether, time } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');

const FlashLoanerPool = contract.fromArtifact('FlashLoanerPool');
const RewarderPool = contract.fromArtifact('RewarderPool');
const BossToken = contract.fromArtifact('BossToken');
const RewardToken = contract.fromArtifact('RewardToken');
const AccountingToken = contract.fromArtifact('AccountingToken');

const { expect } = require('chai');

describe('The rewarder', function () {

    const [deployer, anyango, bobo, coder, duckduck, ...otherAccounts] = accounts;
    const users = [anyango, bobo, coder, duckduck];

    const TOKENS_IN_LENDER_POOL = ether('1000000');

    before(async function () {
        /** SETUP SCENARIO */
        this.liquidityToken = await BossToken.new({ from: deployer });
        this.flashLoanPool = await FlashLoanerPool.new(this.liquidityToken.address, { from: deployer });

        // Set initial token balance of the pool offering flash loans
        await this.liquidityToken.transfer(this.flashLoanPool.address, TOKENS_IN_LENDER_POOL, { from: deployer });

        this.rewarderPool = await TheRewarderPool.new(this.liquidityToken.address, { from: deployer });
        this.rewardToken = await RewardToken.at(await this.rewarderPool.rewardToken());
        this.accountingToken = await AccountingToken.at(await this.rewarderPool.accToken());

        // Anyango, Bobo, Coder and Duckduck deposit 100 tokens each
        for (let i = 0; i < users.length; i++) {
            const amount = ether('100');
            await this.liquidityToken.transfer(users[i], amount, { from: deployer });
            await this.liquidityToken.approve(this.rewarderPool.address, amount, { from: users[i] });
            await this.rewarderPool.deposit(amount, { from: users[i] });
            expect(
                await this.accountingToken.balanceOf(users[i])
            ).to.be.bignumber.eq(amount);
        }
        expect(await this.accountingToken.totalSupply()).to.be.bignumber.eq(ether('400'));
        expect(await this.rewardToken.totalSupply()).to.be.bignumber.eq('0');

        // Advance time 4 days so that depositors can get rewards
        await time.increase(time.duration.days(5));
        
        // Each depositor gets 25 reward tokens
        for (let i = 0; i < users.length; i++) {
            await this.rewarderPool.distributeRewards({ from: users[i] });
            expect(
                await this.rewardToken.balanceOf(users[i])
            ).to.be.bignumber.eq(ether('25'));
        }
        expect(await this.rewardToken.totalSupply()).to.be.bignumber.eq(ether('100'));
        
        // Two rounds should have occurred so far
        expect(
            await this.rewarderPool.roundNumber()
        ).to.be.bignumber.eq('2');
    });

    it('Time has advanced to 5 days', async function () {
        /* Advance time 5 days so that depositors can get rewards */
        await time.increase(time.duration.days(5));
    });

    after(async function () {
        // Only one round should have taken place
        expect(
            await this.rewarderPool.roundNumber()
        ).to.be.bignumber.eq('3');

        // Users should get more rewards this round
        for (let i = 0; i < users.length; i++) {
            await this.rewarderPool.distributeRewards({ from: users[i] });
            expect(
                await this.rewardToken.balanceOf(users[i])
            ).to.be.bignumber.eq(ether('25'));
        }
        
        // Rewards must have been issued to user account
        expect(await this.rewardToken.totalSupply()).to.be.bignumber.gt(ether('100'));
        expect(await this.rewardToken.balanceOf(users[i])).to.be.bignumber.gt('0');
    });
});
