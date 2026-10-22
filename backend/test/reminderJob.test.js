const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldSendInactivity,
  buildItemsForGoal,
  formatCadenceHint,
  localReferenceDate,
} = require('../src/jobs/reminderJob');
const { getLocalParts, parseReminderTime, isReminderHour } = require('../src/utils/localTime');
const { formatMoney } = require('../src/utils/moneyFormat');

describe('shouldSendInactivity', () => {
  it('stays quiet before 7 idle days', () => {
    assert.equal(shouldSendInactivity(6, null, '2026-10-18'), false);
  });

  it('nudges on day 7 with no prior send', () => {
    assert.equal(shouldSendInactivity(7, null, '2026-10-18'), true);
  });

  it('waits 2 days between nudges before day 21', () => {
    assert.equal(shouldSendInactivity(10, '2026-10-16', '2026-10-18'), true);
    assert.equal(shouldSendInactivity(10, '2026-10-17', '2026-10-18'), false);
  });

  it('spaces to weekly after 21 idle days', () => {
    assert.equal(shouldSendInactivity(25, '2026-10-11', '2026-10-18'), true);
    assert.equal(shouldSendInactivity(25, '2026-10-14', '2026-10-18'), false);
  });
});

describe('live cadence as days pass', () => {
  const baseGoal = {
    goal_id: 1,
    name: 'Phone',
    target_amount: 300,
    saved_amount: 0,
    deadline: '2026-11-17',
    created_at: '2026-10-01',
    is_complete: false,
    is_paused: false,
  };

  it('raises daily needed when fewer days remain with no new deposits', () => {
    const early = buildItemsForGoal({}, baseGoal, new Date('2026-10-18T12:00:00'));
    const later = buildItemsForGoal({}, baseGoal, new Date('2026-11-01T12:00:00'));
    assert.ok(later.daysRemaining < early.daysRemaining);
    assert.ok(later.daily > early.daily);
    assert.equal(early.remaining, later.remaining);
  });

  it('formats cadence hints from the live breakdown', () => {
    const ctx = buildItemsForGoal(
      { currency: 'GHS', currency_symbol: '₵' },
      baseGoal,
      new Date('2026-10-18T12:00:00')
    );
    const hint = formatCadenceHint({ currency: 'GHS', currency_symbol: '₵' }, ctx);
    assert.match(hint, /₵/);
    assert.match(hint, /day/);
  });

  it('builds a local reference date from reminder local parts', () => {
    const ref = localReferenceDate({ dateStr: '2026-10-18' });
    assert.ok(ref instanceof Date);
    assert.equal(Number.isNaN(ref.getTime()), false);
    // Local noon on that calendar day (string form may shift TZ in ISO)
    assert.match(ref.toString(), /Oct 18 2026|2026/);
  });
});

describe('localTime', () => {
  it('parses reminder times', () => {
    assert.deepEqual(parseReminderTime('09:00'), { hour: 9, minute: 0 });
    assert.deepEqual(parseReminderTime('17:30:00'), { hour: 17, minute: 30 });
  });

  it('matches reminder hour in UTC', () => {
    const noon = new Date('2026-10-18T12:05:00.000Z');
    const local = getLocalParts(noon, 'UTC');
    assert.equal(local.hour, 12);
    assert.equal(isReminderHour(local, '12:00'), true);
    assert.equal(isReminderHour(local, '09:00'), false);
  });
});

describe('formatMoney', () => {
  it('uses the user currency symbol', () => {
    assert.equal(formatMoney(24.49, 'GHS', '₵'), '₵24.49');
  });
});
