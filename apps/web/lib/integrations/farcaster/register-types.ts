export type RegisterInitResponse = {
  fid: number;
  deadline: number;
  typedData: {
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: `0x${string}`;
    };
    types: {
      EIP712Domain: { name: string; type: string }[];
      Transfer: { name: string; type: string }[];
    };
    primaryType: "Transfer";
    message: {
      fid: string;
      to: string;
      nonce: string;
      deadline: string;
    };
  };
};

export type RegisterCompleteResponse = {
  fid: number;
  username: string;
  signerUuid: string;
};
