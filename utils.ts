export const RPC_ENDPOINT_URL = process.env.RPC_URL || "";
  
export interface PriceUpdate {
  dex: string;
  pair: string;
  slot: number;
  bidSize: number;
  askSize: number;
  askPrice: number;
  bidPrice: number;
  timestamp: number | null;
}

export interface OrcaPoolMonitorCallback {
  (priceUpdate: PriceUpdate): void;
}

export interface PriceFeedConsumer {
  processPriceUpdate(priceUpdate: PriceUpdate): void;
}
