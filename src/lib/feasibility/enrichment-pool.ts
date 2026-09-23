/** Max in-flight enrichment model calls. Keeps the first-run burst from emptying streams. */
export const ENRICHMENT_CONCURRENCY = 2;

type PoolJob = () => void;

export function createPromisePool(limit: number) {
  let active = 0;
  const queue: PoolJob[] = [];

  const pump = () => {
    while (active < limit && queue.length > 0) {
      const job = queue.shift();
      if (!job) return;
      active += 1;
      job();
    }
  };

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task().then(resolve, reject).finally(() => {
          active -= 1;
          pump();
        });
      });
      pump();
    });
  };
}

export const runInEnrichmentPool = createPromisePool(ENRICHMENT_CONCURRENCY);

/**
 * Run items in input order with at most `limit` workers.
 * This scheduler does not take enrichment-pool slots; model calls inside `fn`
 * acquire those themselves.
 */
export async function mapInEnrichmentOrder<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  limit = ENRICHMENT_CONCURRENCY
): Promise<R[]> {
  const results = new Array<R>(items.length);
  if (items.length === 0) return results;

  let cursor = 0;
  const workers = Math.min(Math.max(1, limit), items.length);

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]!, index);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
