// Accept only operational fields; never log cookies, URLs, email bodies, or input.
export function logEvent(
  event: string,
  fields: { requestId?: string; status?: number; method?: string; route?: string; routeType?: string; digest?: string; error?: string; durationMs?: number; count?: number; hops?: number; trueClientIp?: boolean } = {},
) {
  console.info(
    JSON.stringify({ event, ...fields, timestamp: new Date().toISOString() }),
  );
}
