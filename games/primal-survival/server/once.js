/* Cache a promise, but only once it has resolved.
 *
 * `p = p || build()` looks equivalent and is not: if build() rejects, the
 * rejected promise is cached, and on a warm serverless instance every later
 * request replays that same failure until the instance is recycled. A single
 * cold-start blip becomes an outage for whoever keeps landing on it.
 */
export function cacheOnSuccess(build) {
  let pending = null;
  return function () {
    if (!pending) {
      pending = build();
      /* drop it on failure so the next caller genuinely retries */
      pending.catch(() => { pending = null; });
    }
    return pending;
  };
}
