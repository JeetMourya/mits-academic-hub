/**
 * Backend regression tests - IUMS and MongoDB are stubbed; no network is used.
 * Run: npm test
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const ResultFetcher = require('../api/utils/ResultFetcher');
const Student = require('../api/models/Student');
const Admin = require('../api/models/Admin');
const ActivityLog = require('../api/models/ActivityLog');
const { resolveExamSession } = require('../api/utils/batchHelper');

// ---- stubs -----------------------------------------------------------------
const fetchedUrls = [];
let iumsGrades = [
  { code: 'IT101', name: 'Maths', grade: 'AA' },
  { code: 'IT102', name: 'Physics', grade: 'FL' },
];
ResultFetcher.prototype.fetchFromUrl = async function (url) {
  fetchedUrls.push(url);
  return {
    success: true,
    data: { studentName: 'TEST STUDENT', enrollmentNumber: 'BTIT24O1040', sgpa: 7.5, status: 'Pass', subjects: iumsGrades },
  };
};

let store = null;
let saveCount = 0;
Student.findOne = async () => store;
Student.prototype.save = async function () { store = this; saveCount += 1; return this; };
Admin.findOne = () => ({ select: async () => null });
ActivityLog.create = async () => ({});

const app = require('../api/server');
let server; let base;

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(base + urlPath, {
      method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...headers },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { /* not json */ }
        resolve({ status: res.statusCode, headers: res.headers, body: raw, json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

before(() => new Promise((resolve) => {
  server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); });
}));
after(() => new Promise((resolve) => server.close(resolve)));

describe('Trusted session resolution', () => {
  it('derives Regular session from the batch timeline', () => {
    assert.equal(resolveExamSession(2024, 1, 'Regular').sessionCode, '112024');
  });
  it('uses the verified Ex session for batch 2024 semester 1', () => {
    assert.equal(resolveExamSession(2024, 1, 'Ex').sessionCode, '112025');
  });
  it('refuses to invent Ex sessions for unverified semesters/batches', () => {
    assert.equal(resolveExamSession(2024, 2, 'Ex').ok, false);
    assert.equal(resolveExamSession(2025, 1, 'Ex').ok, false);
  });
});

describe('POST /api/results/fetch', () => {
  it('rejects a browser-supplied session code that differs from the trusted one', async () => {
    const before = fetchedUrls.length;
    const r = await request('POST', '/api/results/fetch', {
      enrollmentNumber: 'BTIT24O1040', semesterNumber: 1, examType: 'Ex', sessionCode: '999999',
    });
    assert.equal(r.status, 400);
    assert.equal(fetchedUrls.length, before, 'IUMS must not be called');
  });

  it('returns a clear error (no guessing) when Ex mapping is unverified', async () => {
    const before = fetchedUrls.length;
    const r = await request('POST', '/api/results/fetch', { enrollmentNumber: 'BTIT24O1040', semesterNumber: 2, examType: 'Ex' });
    assert.equal(r.status, 400);
    assert.match(r.json.message, /not available/);
    assert.equal(fetchedUrls.length, before);
  });

  it('rejects unknown exam types and bad semesters', async () => {
    const a = await request('POST', '/api/results/fetch', { enrollmentNumber: 'BTIT24O1040', semesterNumber: 1, examType: 'Supply' });
    const b = await request('POST', '/api/results/fetch', { enrollmentNumber: 'BTIT24O1040', semesterNumber: 9 });
    assert.equal(a.status, 400);
    assert.equal(b.status, 400);
  });

  it('fetches Regular with the derived session and returns attempt metadata', async () => {
    const r = await request('POST', '/api/results/fetch', { enrollmentNumber: 'btit24o1040', semesterNumber: 1, examType: 'Regular' });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.examType, 'Regular');
    assert.equal(r.json.data.sessionCode, '112024');
    assert.equal(r.json.data.attemptNumber, 1);
    assert.match(fetchedUrls.at(-1), /U4bJdzw70jtQ5d=112024/);
  });

  it('shows failed grades with 0 points instead of N/A and flags them', async () => {
    const r = await request('POST', '/api/results/fetch', { enrollmentNumber: 'BTIT24O1040', semesterNumber: 1, examType: 'Regular' });
    const fl = r.json.data.subjects.find((s) => s.grade === 'FL');
    assert.equal(fl.gradePoint, '0');
    assert.equal(fl.passed, false);
    assert.equal(r.json.data.subjects.find((s) => s.grade === 'AA').gradePoint, '9');
  });

  it('stores Ex as a separate attempt and never overwrites Regular', async () => {
    const r = await request('POST', '/api/results/fetch', { enrollmentNumber: 'BTIT24O1040', semesterNumber: 1, examType: 'Ex' });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.sessionCode, '112025');
    assert.equal(r.json.data.attemptNumber, 2);
    assert.match(fetchedUrls.at(-1), /U4bJdzw70jtQ5d=112025/);

    const sem1 = store.results.filter((x) => x.semesterNumber === 1);
    assert.equal(sem1.length, 2);
    const regular = sem1.find((x) => x.examType === 'Regular');
    const ex = sem1.find((x) => x.examType === 'Ex');
    assert.equal(regular.sessionCode, '112024');
    assert.equal(regular.attemptNumber, 1);
    assert.equal(ex.sessionCode, '112025');
  });

  it('refetching the same attempt updates it instead of adding a duplicate', async () => {
    await request('POST', '/api/results/fetch', { enrollmentNumber: 'BTIT24O1040', semesterNumber: 1, examType: 'Ex' });
    assert.equal(store.results.filter((x) => x.semesterNumber === 1).length, 2);
  });
});

describe('Admin authentication hardening', () => {
  it('no longer accepts the hardcoded demo credentials', async () => {
    const r = await request('POST', '/api/auth/login', { email: 'admin@admin.com', password: 'admin123' });
    assert.equal(r.status, 401);
    assert.ok(!r.body.includes('demo-jwt-token'));
  });
  it('rejects the old demo token on /me and on protected routes', async () => {
    const h = { Authorization: 'Bearer demo-jwt-token-12345' };
    assert.equal((await request('GET', '/api/auth/me', null, h)).status, 401);
    assert.equal((await request('GET', '/api/students', null, h)).status, 401);
    assert.equal((await request('GET', '/api/results/student/BTIT24O1040', null, h)).status, 401);
  });
  it('/me requires a token', async () => {
    assert.equal((await request('GET', '/api/auth/me')).status, 401);
  });
});

describe('Static serving and encoding', () => {
  it('does not expose source, tests, backups or package files', async () => {
    for (const p of ['/package.json', '/api/server.js', '/tests/academic.test.js', '/api/server.js.backup', '/js/app.js.backup', '/.env', '/.env.example']) {
      const r = await request('GET', p);
      assert.notEqual(r.status, 200, `${p} must not be served`);
    }
  });
  it('removed the unauthenticated debug endpoints', async () => {
    assert.equal((await request('GET', '/test-iums')).status, 404);
    assert.equal((await request('GET', '/debug-network')).status, 404);
  });
  it('serves pages and scripts as UTF-8', async () => {
    const page = await request('GET', '/');
    const js = await request('GET', '/js/app.js');
    assert.equal(page.status, 200);
    assert.match(page.headers['content-type'], /charset=utf-8/i);
    assert.match(js.headers['content-type'], /charset=utf-8/i);
  });
  it('keeps the legacy links.json fallback reachable', async () => {
    assert.equal((await request('GET', '/data/links.json')).status, 200);
  });
});

describe('Search history (examType-aware)', () => {
  function loadHistory() {
    const mem = {};
    const sandbox = {
      window: {},
      localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } },
      document: { getElementById: () => null },
      console,
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'history.js'), 'utf8'), sandbox);
    return { H: sandbox.window.MITSHistory, mem };
  }

  it('keeps Regular and Ex entries for the same enrollment + semester separate', () => {
    const { H } = loadHistory();
    H.add({ enrollment: 'BTIT24O1040', semesterId: '1', examType: 'Regular' });
    H.add({ enrollment: 'BTIT24O1040', semesterId: '1', examType: 'Ex' });
    const items = H.read();
    assert.equal(items.length, 2);
    assert.equal(JSON.stringify(Array.from(items, (i) => i.examType).sort()), JSON.stringify(['Ex', 'Regular']));
  });

  it('treats legacy entries without examType as Regular and removes only the matching type', () => {
    const { H, mem } = loadHistory();
    mem.mits_search_history = JSON.stringify([
      { enrollment: 'BTIT24O1040', semesterId: '1', semesterName: 'Semester 1', timestamp: 1 },
    ]);
    H.add({ enrollment: 'BTIT24O1040', semesterId: '1', examType: 'Ex' });
    H.remove('BTIT24O1040', '1', 'Ex');
    const items = H.read();
    assert.equal(items.length, 1);
    assert.equal(items[0].examType, undefined);
  });
});
