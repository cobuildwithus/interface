export const docsUrl =
  process.env.NEXT_PUBLIC_DOCS_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:5173" : "https://docs.co.build");
