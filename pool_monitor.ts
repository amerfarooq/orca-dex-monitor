import Decimal from "decimal.js";
import { OrcaPoolMonitorCallback } from "../utils";
import { Connection, AccountInfo, Context } from "@solana/web3.js";
import { deserializeAccount, OrcaPool, OrcaPoolToken } from "@orca-so/sdk";

export class OrcaPoolMonitor {
  private pair: string;
  private connection: Connection;
  private pool: OrcaPool;
  private tokenA: OrcaPoolToken;
  private tokenB: OrcaPoolToken;
  private callback: OrcaPoolMonitorCallback;

  private tokenASubscriptionID: number = 0;
  private tokenBSubscriptionID: number = 0;
  private tokenAAmount!: Decimal;
  private tokenBAmount!: Decimal;
  private tokenAUpdateSlot: number = 0;
  private tokenBUpdateSlot: number = 0;
  private tokenAAmountEmitted!: Decimal;
  private tokenBAmountEmitted!: Decimal;

  constructor(
    connection: Connection,
    pool: OrcaPool,
    pair: string,
    callback: OrcaPoolMonitorCallback
  ) {
    this.pair = pair;
    this.pool = pool;
    this.connection = connection;
    this.callback = callback;

    this.tokenA = this.pool.getTokenA();
    this.tokenB = this.pool.getTokenB();
  }

  public startMonitoring() {
    this.tokenASubscriptionID = this.connection.onAccountChange(
      this.tokenA.addr,
      this.updateTokenA.bind(this)
    );
    this.tokenBSubscriptionID = this.connection.onAccountChange(
      this.tokenB.addr,
      this.updateTokenB.bind(this)
    );
  }

  public async stopMonitoring() {
    await this.connection.removeAccountChangeListener(
      this.tokenASubscriptionID
    );
    await this.connection.removeAccountChangeListener(
      this.tokenBSubscriptionID
    );
  }

  private async emitPriceUpdate() {
    if (this.tokenAUpdateSlot !== this.tokenBUpdateSlot) return;

    if (
      this.tokenAAmountEmitted &&
      this.tokenAAmountEmitted.eq(this.tokenAAmount) &&
      this.tokenBAmountEmitted.eq(this.tokenBAmount)
    ) {
      return;
    }
    this.tokenAAmountEmitted = this.tokenAAmount;
    this.tokenBAmountEmitted = this.tokenBAmount;

    const timestamp = await this.connection.getBlockTime(this.tokenAUpdateSlot);
    const price = this.tokenBAmount
      .div(this.tokenAAmount)
      .toDecimalPlaces(this.tokenB.scale)
      .toNumber();

    this.callback({
      dex: "Orca",
      pair: this.pair,
      bidPrice: price,
      askPrice: price,
      bidSize: this.tokenAAmount.toNumber(),
      askSize: this.tokenBAmount.toNumber(),
      timestamp: timestamp,
      slot: this.tokenAUpdateSlot,
    });
  }

  private updateTokenA(accountInfo: AccountInfo<Buffer>, context: Context) {
    const tokenAccount = deserializeAccount(accountInfo.data);
    if (tokenAccount) {
      this.tokenAAmount = new Decimal(tokenAccount.amount.toString()).div(
        10 ** this.tokenA.scale
      );
      this.tokenAUpdateSlot = context.slot;
      this.emitPriceUpdate();
    }
  }

  private updateTokenB(accountInfo: AccountInfo<Buffer>, context: Context) {
    const tokenAccount = deserializeAccount(accountInfo.data);
    if (tokenAccount) {
      this.tokenBAmount = new Decimal(tokenAccount.amount.toString()).div(
        10 ** this.tokenB.scale
      );
      this.tokenBUpdateSlot = context.slot;
      this.emitPriceUpdate();
    }
  }
}
