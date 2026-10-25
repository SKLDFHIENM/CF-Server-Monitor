import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getServerDetail,
  clearServerDetailCache,
  clearAllCaches,
  getMetricsHistoryCache,
  setMetricsHistoryCache
} from '../src/utils/cache.js';
import { SERVER_DETAIL_CACHE_MAX_ENTRIES, METRICS_HISTORY_CACHE_MAX_ENTRIES } from '../src/utils/config.js';

function makeDb(first) {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        first
      };
    }
  };
}

test('getServerDetail falls back to the last known value when D1 throws', async (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  clearServerDetailCache();

  let failing = false;
  let reads = 0;
  const db = makeDb(async () => {
    reads++;
    if (failing) throw new Error('D1_ERROR');
    return { id: 'cache-fallback-server', history_partition_id: 7 };
  });

  const first = await getServerDetail(db, 'cache-fallback-server', true);
  assert.equal(first.history_partition_id, 7);

  failing = true;
  t.mock.timers.tick(121 * 1000);

  const fallback = await getServerDetail(db, 'cache-fallback-server', true);
  assert.equal(fallback.history_partition_id, 7);

  const repeatedFallback = await getServerDetail(db, 'cache-fallback-server', true);
  assert.equal(repeatedFallback.history_partition_id, 7);
  assert.equal(reads, 3, 'each stale read still attempts to refresh from D1');
});

test('getServerDetail rethrows when there is no cached value to fall back to', async () => {
  clearServerDetailCache();
  const db = makeDb(async () => {
    throw new Error('D1_ERROR');
  });

  await assert.rejects(() => getServerDetail(db, 'cache-no-entry-server', true), /D1_ERROR/);
});

test('server detail cache bounds entries for missing servers', async () => {
  clearServerDetailCache();
  let reads = 0;
  const db = makeDb(async () => {
    reads++;
    return null;
  });

  for (let i = 0; i <= SERVER_DETAIL_CACHE_MAX_ENTRIES; i++) {
    await getServerDetail(db, `missing-${i}`, true);
  }
  const initialReads = reads;
  await getServerDetail(db, `missing-${SERVER_DETAIL_CACHE_MAX_ENTRIES}`, true);
  assert.equal(reads, initialReads);
  await getServerDetail(db, 'missing-0', true);
  assert.equal(reads, initialReads + 1);
});

test('server detail writes preserve expired fallback values for other IDs', async (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  clearServerDetailCache();
  const db = makeDb(async () => ({ history_partition_id: 7 }));
  await getServerDetail(db, 'expired-server', true);
  t.mock.timers.tick(120 * 1000);
  await getServerDetail(db, 'fresh-server', true);

  const failingDb = makeDb(async () => { throw new Error('D1_ERROR'); });
  assert.equal((await getServerDetail(failingDb, 'expired-server', true)).history_partition_id, 7);
  assert.equal((await getServerDetail(failingDb, 'fresh-server', true)).history_partition_id, 7);

  clearServerDetailCache();
  await assert.rejects(() => getServerDetail(failingDb, 'expired-server', true), /D1_ERROR/);
});

test('server detail cache still bounds expired fallback values', async (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  clearServerDetailCache();
  const db = makeDb(async () => ({ history_partition_id: 7 }));
  for (let i = 0; i < SERVER_DETAIL_CACHE_MAX_ENTRIES; i++) {
    await getServerDetail(db, `stale-${i}`, true);
  }
  t.mock.timers.tick(120 * 1000);
  await getServerDetail(db, 'new-server', true);

  const failingDb = makeDb(async () => { throw new Error('D1_ERROR'); });
  await assert.rejects(() => getServerDetail(failingDb, 'stale-0', true), /D1_ERROR/);
  assert.equal((await getServerDetail(failingDb, 'stale-1', true)).history_partition_id, 7);
});

test('history cache bounds entries and keeps recently rewritten queries', () => {
  clearAllCaches();
  for (let i = 0; i < METRICS_HISTORY_CACHE_MAX_ENTRIES; i++) {
    setMetricsHistoryCache(`history-${i}`, 48, 'cpu', [{ cpu: i }]);
  }
  setMetricsHistoryCache('history-0', 48, 'cpu', [{ cpu: 999 }]);
  setMetricsHistoryCache('history-new', 48, 'cpu', [{ cpu: 1000 }]);

  assert.equal(getMetricsHistoryCache('history-1', 48, 'cpu'), undefined);
  assert.deepEqual(getMetricsHistoryCache('history-0', 48, 'cpu').data, [{ cpu: 999 }]);
  assert.deepEqual(getMetricsHistoryCache('history-new', 48, 'cpu').data, [{ cpu: 1000 }]);
});

test('history writes reclaim expired queries before evicting a valid long-range query', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  clearAllCaches();
  setMetricsHistoryCache('long-history', 48, 'cpu', []);
  for (let i = 1; i < METRICS_HISTORY_CACHE_MAX_ENTRIES; i++) {
    setMetricsHistoryCache(`short-history-${i}`, 0.167, 'cpu', []);
  }

  t.mock.timers.tick(60 * 1000);
  setMetricsHistoryCache('new-history', 48, 'cpu', []);
  assert.ok(getMetricsHistoryCache('long-history', 48, 'cpu'));
  assert.equal(getMetricsHistoryCache('short-history-1', 0.167, 'cpu'), undefined);

  t.mock.timers.tick(19 * 60 * 1000);
  assert.equal(getMetricsHistoryCache('long-history', 48, 'cpu'), undefined);
  assert.ok(getMetricsHistoryCache('new-history', 48, 'cpu'));
});
