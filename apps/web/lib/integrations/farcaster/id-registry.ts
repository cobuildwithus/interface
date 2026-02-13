export const ID_REGISTRY_ADDRESS = "0x00000000fc6c5f01fc30151999387bb99a9f489b" as const;

export const ID_REGISTRY_ABI = [
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
