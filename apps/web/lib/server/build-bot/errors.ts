import "server-only";

export class BuildBotAuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export class BuildBotPolicyError extends Error {}

export class BuildBotConfigError extends Error {}
