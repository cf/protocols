import BN = require("bn.js");
import { ExchangeTestUtil } from "./testExchangeUtil";
import { DepositInfo, RingInfo } from "./types";

contract("Exchange", (accounts: string[]) => {

  let exchangeTestUtil: ExchangeTestUtil;
  let exchangeId = 0;

  const getRandomInt = (max: number) => {
    return Math.floor(Math.random() * max);
  };

  const createRandomRing = () => {
    const ring: RingInfo = {
      orderA:
        {
          realmID: exchangeId,
          tokenS: "WETH",
          tokenB: "GTO",
          amountS: new BN(web3.utils.toWei("" + Math.random() % 100, "ether")),
          amountB: new BN(web3.utils.toWei("" + Math.random() % 100, "ether")),
          amountF: new BN(web3.utils.toWei("" + Math.random() % 100, "ether")),
        },
      orderB:
        {
          realmID: exchangeId,
          tokenS: "GTO",
          tokenB: "WETH",
          amountS: new BN(web3.utils.toWei("" + Math.random() % 100, "ether")),
          amountB: new BN(web3.utils.toWei("" + Math.random() % 100, "ether")),
          amountF: new BN(web3.utils.toWei("" + Math.random() % 100, "ether")),
        },
    };
    return ring;
  };

  const doRandomDeposit = async () => {
    const orderOwners = exchangeTestUtil.testContext.orderOwners;
    const keyPair = exchangeTestUtil.getKeyPairEDDSA();
    const owner = orderOwners[Number(getRandomInt(orderOwners.length))];
    const amount = new BN(web3.utils.toWei("" + Math.random() * 1000, "ether"));
    const token = exchangeTestUtil.getTokenAddress("LRC");
    return await exchangeTestUtil.deposit(exchangeId, owner,
                                          keyPair.secretKey, keyPair.publicKeyX, keyPair.publicKeyY,
                                          token, amount);
  };

  const doRandomOnchainWithdrawal = async (depositInfo: DepositInfo) => {
    await exchangeTestUtil.requestWithdrawalOnchain(
      exchangeId,
      depositInfo.accountID,
      depositInfo.token,
      new BN(Math.random() * 1000),
      depositInfo.owner,
    );
  };

  const doRandomOffchainWithdrawal = (depositInfo: DepositInfo) => {
    exchangeTestUtil.requestWithdrawalOffchain(
      exchangeId,
      depositInfo.accountID,
      depositInfo.token,
      new BN(Math.random() * 1000),
      "LRC",
      new BN(0),
      0,
      exchangeTestUtil.wallets[exchangeId][0].walletAccountID,
    );
  };

  const doRandomOrderCancellation = (depositInfo: DepositInfo) => {
    exchangeTestUtil.cancelOrderID(
      exchangeId,
      depositInfo.accountID,
      getRandomInt(2 ** 8),
      getRandomInt(2 ** 14),
      exchangeTestUtil.wallets[exchangeId][0].walletAccountID,
      1,
      new BN(0),
      0,
    );
  };

  const createExchange = async (bDataAvailability: boolean) => {
    exchangeId = await exchangeTestUtil.createExchange(
      exchangeTestUtil.testContext.stateOwners[0], true, bDataAvailability,
    );
  };

  const bVerify = true;
  const verify = async () => {
    if (bVerify) {
      await exchangeTestUtil.verifyPendingBlocks(exchangeId);
    }
  };

  before( async () => {
    exchangeTestUtil = new ExchangeTestUtil();
    await exchangeTestUtil.initialize(accounts);
  });

  describe("Permutations", function() {
    this.timeout(0);

    it("Ring Settlement", async () => {
      const bDataAvailabilities = [true, false];
      for (const bDataAvailability of bDataAvailabilities) {
        await createExchange(bDataAvailability);
        const blockSizes = exchangeTestUtil.ringSettlementBlockSizes;
        for (const blockSize of blockSizes) {
          const rings: RingInfo[] = [];
          for (let i = 0; i < blockSize; i++) {
            rings.push(createRandomRing());
          }
          for (const ring of rings) {
            await exchangeTestUtil.setupRing(ring);
            await exchangeTestUtil.sendRing(exchangeId, ring);
          }
          await exchangeTestUtil.commitDeposits(exchangeId);
          await exchangeTestUtil.commitRings(exchangeId);
        }
        await verify();
      }
    });

    it("Deposit", async () => {
      await createExchange(false);
      const blockSizes = exchangeTestUtil.depositBlockSizes;
      for (const blockSize of blockSizes) {
        for (let i = 0; i < blockSize; i++) {
          await doRandomDeposit();
        }
        await exchangeTestUtil.commitDeposits(exchangeId);
      }
      await verify();
    });

    it("Onchain withdrawal", async () => {
      await createExchange(false);

      // Do some deposits
      const numDeposits = 8;
      const deposits: DepositInfo[] = [];
      for (let i = 0; i < numDeposits; i++) {
        deposits.push(await doRandomDeposit());
      }
      await exchangeTestUtil.commitDeposits(exchangeId);

      const blockSizes = exchangeTestUtil.onchainWithdrawalBlockSizes;
      for (const blockSize of blockSizes) {
        for (let i = 0; i < blockSize; i++) {
          const randomDeposit = deposits[getRandomInt(numDeposits)];
          await doRandomOnchainWithdrawal(randomDeposit);
        }
        await exchangeTestUtil.commitOnchainWithdrawalRequests(exchangeId);
      }
      await verify();
    });

    it("Offchain withdrawal", async () => {
      const bDataAvailabilities = [true, false];
      for (const bDataAvailability of bDataAvailabilities) {
        await createExchange(bDataAvailability);

        // Do some deposits
        const numDeposits = 8;
        const deposits: DepositInfo[] = [];
        for (let i = 0; i < numDeposits; i++) {
          deposits.push(await doRandomDeposit());
        }
        await exchangeTestUtil.commitDeposits(exchangeId);

        const blockSizes = exchangeTestUtil.offchainWithdrawalBlockSizes;
        for (const blockSize of blockSizes) {
          for (let i = 0; i < blockSize; i++) {
            const randomDeposit = deposits[getRandomInt(numDeposits)];
            await doRandomOffchainWithdrawal(randomDeposit);
          }
          await exchangeTestUtil.commitOffchainWithdrawalRequests(exchangeId);
        }
        await verify();
      }
    });

    it("Order Cancellation", async () => {
      const bDataAvailabilities = [true, false];
      for (const bDataAvailability of bDataAvailabilities) {
        await createExchange(bDataAvailability);

        // Do some deposits
        const numDeposits = 8;
        const deposits: DepositInfo[] = [];
        for (let i = 0; i < numDeposits; i++) {
          deposits.push(await doRandomDeposit());
        }
        await exchangeTestUtil.commitDeposits(exchangeId);

        const blockSizes = exchangeTestUtil.orderCancellationBlockSizes;
        for (const blockSize of blockSizes) {
          for (let i = 0; i < blockSize; i++) {
            const randomDeposit = deposits[getRandomInt(numDeposits)];
            await doRandomOrderCancellation(randomDeposit);
          }
          await exchangeTestUtil.commitCancels(exchangeId);
        }
        await verify();
      }
    });

  });
});