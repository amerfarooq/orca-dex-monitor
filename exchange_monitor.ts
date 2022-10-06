import { PriceFeedConsumer } from "../utils";
import { Connection } from "@solana/web3.js";
import { OrcaPoolMonitor } from "./pool_monitor";
import { OrcaPoolConfig, getOrca, Network, Orca } from "@orca-so/sdk";

export class OrcaExchangeMonitor {
  private orca: Orca;
  private connection: Connection;
  private feedConsumer: PriceFeedConsumer;
  private tokensToKeep?: Set<string>;
  private tokensToFilter?: Set<string>;
  private tokenPairAddresses: Map<string, string>;

  constructor(
    rpcURL: string,
    feedConsumer: PriceFeedConsumer,
    tokensToKeep?: Array<string>,
    tokensToFilter?: Array<string>
  ) {
    if (tokensToKeep && tokensToFilter) {
      throw new Error(
        "tokensToKeep and tokensToFilter cannot both be specified at the same time!"
      );
    }
    this.feedConsumer = feedConsumer;
    this.tokensToKeep = new Set(tokensToKeep);
    this.tokensToFilter = new Set(tokensToFilter);
    this.tokenPairAddresses = this.getTokenPairAddresses();
    this.connection = new Connection(rpcURL, "confirmed");
    this.orca = getOrca(this.connection, Network.MAINNET);
  }

  public startMonitoring() {
    for (const [tokenName, tokenAddress] of this.tokenPairAddresses.entries()) {
      new OrcaPoolMonitor(
        this.connection,
        this.orca.getPool(tokenAddress as OrcaPoolConfig),
        tokenName,
        this.feedConsumer.processPriceUpdate
      ).startMonitoring();
    }
  }

  private getTokenPairAddresses(): Map<string, string> {
    function enumKeys<O extends object, K extends keyof O = keyof O>(
      obj: O
    ): K[] {
      return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
    }
    const tokenPairAddresses: Map<string, string> = new Map();
    for (const tokenPairName of enumKeys(OrcaPoolConfig)) {
      if (
        (!this.tokensToFilter && !this.tokensToKeep) ||
        (this.tokensToFilter && !this.tokensToFilter.has(tokenPairName)) ||
        (this.tokensToKeep && this.tokensToKeep.has(tokenPairName))
      ) {
        tokenPairAddresses.set(tokenPairName, OrcaPoolConfig[tokenPairName]);
      }
    }
    return tokenPairAddresses;
  }
}
