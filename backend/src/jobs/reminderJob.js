const cron = require('node-cron');
const calculationModel = require('../models/calculationModel');
const reminderModel = require('../models/reminderModel');
const { getLocalParts, isReminderHour } = require('../utils/localTime');
const { formatMoney } = require('../utils/moneyFormat');
const { sendReminderDigest, isMailConfigured } = require('../utils/mailer');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateStr(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw.slice(0, 10);
}

/** Days idle → first nudge at 7, then every 2 days until 21, then weekly. */
function shouldSendInactivity(daysIdle, lastSendDate, localDateStr) {
  if (daysIdle < 7) return false;

  const lastStr = toDateStr(lastSendDate);
  if (!lastStr) return true;

  const last = new Date(`${lastStr}T12:00:00Z`);
  const today = new Date(`${localDateStr}T12:00:00Z`);
  const daysSinceSend = Math.floor((today - last) / MS_PER_DAY);

  if (daysSinceSend < 1) return false;
  if (daysIdle < 21) return daysSinceSend >= 2;
  return daysSinceSend >= 7;
}

function daysBetweenDates(fromDate, toDateStr) {
  const from = new Date(fromDate);
  const to = new Date(`${toDateStr}T12:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.max(0, Math.floor((to - from) / MS_PER_DAY));
}

function money(user, amount) {
  return formatMoney(amount, user.currency || 'USD', user.currency_symbol || null);
}

function buildItemsForGoal(user, goal) {
  const breakdown = calculationModel.getGoalBreakdown(goal, 0);
  const daysRemaining = breakdown.days_remaining;
  const remaining = breakdown.remaining_amount;
  const daily = breakdown.savings_needed.daily;
  const behind = Math.max(0, calculationModel.roundToTwo(
    (breakdown.expected_saved_by_now || 0) - (breakdown.saved_amount || 0)
  ));

  return {
    goal,
    breakdown,
    daysRemaining,
    remaining,
    daily,
    behind,
    onTrack: breakdown.on_track,
  };
}

async function collectDigestLines(user, goals, local, frequency) {
  const lines = [];
  const claimKinds = [];

  const primary = goals[0];
  const isDigestDay = frequency === 'daily' || (frequency === 'weekly' && local.isMonday);

  if (isDigestDay && primary) {
    const already = await reminderModel.hasSent({
      userId: user.user_id,
      kind: frequency === 'weekly' ? 'weekly_summary' : 'daily_nudge',
      sendDate: local.dateStr,
      goalId: null,
    });

    if (!already) {
      if (frequency === 'weekly') {
        const behindGoals = goals
          .map((goal) => {
            const ctx = buildItemsForGoal(user, goal);
            return ctx.behind > 0 ? ctx : null;
          })
          .filter(Boolean);

        if (behindGoals.length > 0) {
          behindGoals.forEach((ctx) => {
            lines.push(
              `You're ${money(user, ctx.behind)} behind on ${ctx.goal.name}`
            );
          });
        } else {
          lines.push('All active goals are on pace this week — keep it up.');
        }
        claimKinds.push({ kind: 'weekly_summary', goalId: null });
      } else {
        const ctx = buildItemsForGoal(user, primary);
        if (ctx.daily > 0 && ctx.remaining > 0) {
          lines.push(
            `Save ${money(user, ctx.daily)} today for ${primary.name}`
          );
        } else if (ctx.remaining <= 0) {
          lines.push(`${primary.name} is ready to mark complete — open QUANT to finish it.`);
        } else {
          lines.push(`A quick check-in on ${primary.name} keeps your plan on track.`);
        }
        claimKinds.push({ kind: 'daily_nudge', goalId: null });
      }
    }
  }

  for (const goal of goals) {
    const ctx = buildItemsForGoal(user, goal);
    const daysIdle = daysBetweenDates(goal.last_deposit_at || goal.created_at, local.dateStr);

    const lastInactivity = await reminderModel.getLastSendDate({
      userId: user.user_id,
      kind: 'inactivity',
      goalId: goal.goal_id,
    });

    if (shouldSendInactivity(daysIdle, lastInactivity, local.dateStr)) {
      const alreadyToday = await reminderModel.hasSent({
        userId: user.user_id,
        kind: 'inactivity',
        sendDate: local.dateStr,
        goalId: goal.goal_id,
      });
      if (!alreadyToday) {
        if (daysIdle >= 7 && !lastInactivity) {
          lines.push(
            `It's been ${daysIdle} days with no deposit toward ${goal.name}. A small start counts.`
          );
        } else {
          lines.push(
            `Still no deposit on ${goal.name} (${daysIdle} days). QUANT is waiting when you're ready.`
          );
        }
        claimKinds.push({ kind: 'inactivity', goalId: goal.goal_id });
      }
    }

    for (const milestone of [7, 3, 1]) {
      if (ctx.daysRemaining !== milestone) continue;
      const kind = `deadline_${milestone}`;
      const already = await reminderModel.hasSent({
        userId: user.user_id,
        kind,
        sendDate: local.dateStr,
        goalId: goal.goal_id,
      });
      // Also skip if we already sent this milestone on another day
      const ever = await reminderModel.getLastSendDate({
        userId: user.user_id,
        kind,
        goalId: goal.goal_id,
      });
      if (already || ever) continue;

      lines.push(
        milestone === 1
          ? `Tomorrow is the deadline for ${goal.name}`
          : `${milestone} days until your ${goal.name} deadline`
      );
      claimKinds.push({ kind, goalId: goal.goal_id });
    }

    if (
      ctx.daysRemaining <= 7
      && ctx.daysRemaining > 0
      && ctx.remaining > 0
      && !ctx.onTrack
    ) {
      const kind = 'goal_at_risk';
      const already = await reminderModel.hasSent({
        userId: user.user_id,
        kind,
        sendDate: local.dateStr,
        goalId: goal.goal_id,
      });
      if (!already) {
        lines.push(
          `Critical — you need ${money(user, ctx.remaining)} in ${ctx.daysRemaining} day${ctx.daysRemaining === 1 ? '' : 's'} for ${goal.name}`
        );
        claimKinds.push({ kind, goalId: goal.goal_id });
      }
    }
  }

  return { lines, claimKinds };
}

async function processUser(user, now = new Date()) {
  const frequency = String(user.reminder_frequency || 'daily').toLowerCase();
  if (frequency === 'off' || user.email_notifications === false) {
    return { skipped: true, reason: 'disabled' };
  }

  const local = getLocalParts(now, user.timezone || 'UTC');
  if (!isReminderHour(local, user.reminder_time)) {
    return { skipped: true, reason: 'wrong_hour' };
  }

  const digestAlready = await reminderModel.hasSent({
    userId: user.user_id,
    kind: 'scheduled_digest',
    sendDate: local.dateStr,
    goalId: null,
  });
  if (digestAlready) {
    return { skipped: true, reason: 'already_sent' };
  }

  const goals = await reminderModel.getActiveGoalsForUser(user.user_id);
  if (goals.length === 0) {
    return { skipped: true, reason: 'no_goals' };
  }

  const { lines, claimKinds } = await collectDigestLines(user, goals, local, frequency);

  // Weekly users: still allow critical-only digests on non-Mondays
  if (lines.length === 0) {
    return { skipped: true, reason: 'nothing_to_say' };
  }

  const claimed = await reminderModel.recordSend({
    userId: user.user_id,
    kind: 'scheduled_digest',
    sendDate: local.dateStr,
    goalId: null,
  });

  // Race: another worker claimed the digest slot
  if (!claimed) {
    return { skipped: true, reason: 'race_lost' };
  }

  const result = await sendReminderDigest(user, lines);
  if (result?.error || result?.skipped) {
    console.warn(
      `[reminders] Digest not delivered for user ${user.user_id}:`,
      result?.error || 'mail not configured'
    );
  }

  for (const claim of claimKinds) {
    await reminderModel.recordSend({
      userId: user.user_id,
      kind: claim.kind,
      sendDate: local.dateStr,
      goalId: claim.goalId,
    });
  }

  return { sent: true, lineCount: lines.length };
}

async function runReminderJob(now = new Date()) {
  if (!isMailConfigured()) {
    console.warn('[reminders] Mail not configured — skipping scheduled run');
    return { processed: 0, sent: 0, skipped: 0 };
  }

  const users = await reminderModel.getReminderEligibleUsers();
  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      const outcome = await processUser(user, now);
      if (outcome.sent) sent += 1;
      else skipped += 1;
    } catch (err) {
      console.error(`[reminders] Failed for user ${user.user_id}:`, err.message);
      skipped += 1;
    }
  }

  console.log(`[reminders] Run complete — processed ${users.length}, sent ${sent}, skipped ${skipped}`);
  return { processed: users.length, sent, skipped };
}

let scheduledTask = null;

function startReminderCron() {
  if (scheduledTask) return scheduledTask;

  // Every hour at minute 0 — matches reminder_time by local hour
  scheduledTask = cron.schedule('0 * * * *', () => {
    runReminderJob().catch((err) => {
      console.error('[reminders] Cron run failed:', err.message);
    });
  });

  console.log('[reminders] Cron scheduled (hourly at :00)');
  return scheduledTask;
}

module.exports = {
  runReminderJob,
  startReminderCron,
  processUser,
  shouldSendInactivity,
};
