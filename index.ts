import { RPC_ENDPOINT_URL } from "./utils";
import { RedPandaConsumer } from "./consumers/red_panda";
import { OrcaExchangeMonitor } from "./feed/exchange_monitor";

(() => {
  const orcaExchangeMonitor = new OrcaExchangeMonitor(
    RPC_ENDPOINT_URL,
    new RedPandaConsumer()
  );
  orcaExchangeMonitor.startMonitoring();
})();