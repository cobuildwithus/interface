import "server-only";

export type Result<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export type OkResult<T> = Extract<Result<T>, { ok: true }>;
export type ErrorResult = Extract<Result<never>, { ok: false }>;
