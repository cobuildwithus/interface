export const BASE_CHAIN_ID = 8453;

// Wrapped ETH on Base
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

// Default ETH price fallback (USD)
export const DEFAULT_ETH_PRICE_USDC = 3000;

export const contracts = {
  CobuildSwap: "0x5d09ddd53feffc52f5139a59246ced560d8c45df",
  CobuildSwapImpl: "0xe5e248e5877cc4d71986ec6fc2b4cc321c80a23e",
  CobuildToken: "0x1bf077855a17b4dd12eb3ade29d94cff27fe56d0",
  USDCBase: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  ZoraFactory: "0x777777751622c0d3258f214F9DF38E35BF45baF3",
  ZoraFactoryImpl: "0x0e2ea62e5377d46fef114a60afbe3d5ea7490577",
  CreatorCoinImpl: "0x88cc4e08c7608723f3e44e17ac669fb43b6a8313",
  UniswapStateView: "0xa3c0c9b65bad0b08107aa264b0f3db444b867a71",
  ZoraToken: "0x1111111111166b7fe7bd91427724b487980afc69",
  UniswapV3ZoraUsdcPool: "0xedc625b74537ee3a10874f53d170e9c17a906b9c",
  FlowDeployerImpl: "0xd9725b54b5dc4d61a3e9dfe669955f0239f62e92",
  FlowDeployer: "0x62953560766ac1be810e6ef13ab3736f8e2c8a41",
  USDCPermitAdmin: "0x9108f3c347d642b900602c543e061aee9e8e271f",
  CobuildFlowManager: "0xb9d58f3575bf264cf705c15fcfa06eb4afdcea64",
  CobuildFlowAllocator: "0x279adb5201ee14f717560cfaa560e4648f037dc3",
  CustomFlowImpl: "0x78ff09aa6f39a3749cea6bff613fbc9aca988080",
  // Juicebox v5 contracts on Base
  JBDirectory: "0x0061e516886a0540f63157f112c0588ee0651dcf",
  JBMultiTerminal: "0x2db6d704058e552defe415753465df8df0361846",
  JBController: "0x27da30646502e2f642be5281322ae8c394f7668a",
  JBPermissions: "0x04fD6913d6c32D8C216e153a43C04b1857a7793d",
  JBTerminalStore: "0xfE33B439Ec53748C87DcEDACb83f05aDd5014744",
  // Revnet contracts on Base
  REVDeployer: "0x2cA27BDe7e7D33E353b44c27aCfCf6c78ddE251d",
  REVLoans: "0x1880D832aa283d05b8eAB68877717E25FbD550Bb",
  JBTokens: "0x4d0edd347fb1fa21589c1e109b3474924be87636",
} as const;
