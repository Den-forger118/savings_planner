/**
 * Local calendar parts for a Date in an IANA timezone (falls back to UTC).
 */
function getLocalParts(date = new Date(), timeZone = 'UTC') {
  const zone = timeZone && String(timeZone).trim() ? String(timeZone).trim() : 'UTC';

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    }).formatToParts(date);

    const pick = (type) => parts.find((part) => part.type === type)?.value;
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    const hour = Number.parseInt(pick('hour'), 10);
    const minute = Number.parseInt(pick('minute'), 10);
    const weekday = pick('weekday');

    return {
      timeZone: zone,
      dateStr: `${year}-${month}-${day}`,
      hour: Number.isFinite(hour) ? hour : 0,
      minute: Number.isFinite(minute) ? minute : 0,
      weekday,
      isMonday: weekday === 'Mon',
    };
  } catch {
    return getLocalParts(date, 'UTC');
  }
}

/** Parse Postgres TIME / "HH:MM" / "HH:MM:SS" into { hour, minute }. */
function parseReminderTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { hour: value.getUTCHours(), minute: value.getUTCMinutes() };
  }

  const raw = String(value || '09:00').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return { hour: 9, minute: 0 };
  }

  const hour = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));
  return { hour, minute };
}

function isReminderHour(localParts, reminderTime) {
  const wanted = parseReminderTime(reminderTime);
  return localParts.hour === wanted.hour;
}

module.exports = {
  getLocalParts,
  parseReminderTime,
  isReminderHour,
};
