const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { shouldSendInactivity } = require('../src/jobs/reminderJob');
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
