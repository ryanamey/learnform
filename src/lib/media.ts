/** Audio examples from Prieto, Rhythmic Synchronicity (2020): 188 numbered tracks. */
export const PRIETO_EXAMPLES = 188;

/** URL of one example, served to signed-in users only. */
export function prietoAudioUrl(n: number) {
  return `/api/media/prieto/${n}`;
}
