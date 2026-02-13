export function pluralize(count: number, singular: string, plural: string = `${singular}s`) {
  return Math.abs(count) === 1 ? singular : plural;
}
