import "server-only";

export class CliAuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export class CliPolicyError extends Error {}

export class CliConfigError extends Error {}
