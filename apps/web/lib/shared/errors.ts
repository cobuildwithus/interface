export type ErrorLike =
  | Error
  | string
  | { message?: string | null; status?: number | string | null; code?: string | number | null }
  | null
  | undefined;
