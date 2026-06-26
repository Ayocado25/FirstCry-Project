'use strict';

const { query } = require('../config/database');
const { success, paginate, getOffset, formatDate } = require('../utils/response');
const notificationService = require('../services/notification.service');
const summaryService = require('../services/summary.service');
const logger = require('../utils/logger');

/**
 * POST /api/notifications/send-daily
 * Generate summaries and send to parents
 */
async function sendDailySummaries(req, res, next) {
  try {
    const { date, classroom_id, child_ids, channels } = req.body;
    const targetDate = date ? formatDate(new Date(date)) : formatDate(new Date());

    // Fetch all complete routines for the date
    const conditions = [`dr.date = $1`, `dr.is_complete = TRUE`, `c.deleted_at IS NULL`];
    const params = [targetDate];
    let idx = 2;

    if (classroom_id) { conditions.push(`c.classroom_id = $${idx++}`); params.push(classroom_id); }
    if (child_ids?.length) { conditions.push(`dr.child_id = ANY($${idx++}::uuid[])`); params.push(child_ids); }

    const routinesResult = await query(
      `SELECT dr.id, dr.child_id, dr.overall_mood, dr.general_notes, dr.summary_text,
              c.full_name AS child_name, c.date_of_birth,
              p.full_name AS parent_name, p.email AS parent_email, p.whatsapp_number
       FROM daily_routines dr
       JOIN children c ON c.id = dr.child_id
       LEFT JOIN parents p ON p.id = c.primary_parent_id
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    const results = { sent: 0, failed: 0, skipped: 0, details: [] };

    for (const routine of routinesResult.rows) {
      // Generate summary if not already done
      let summaryText = routine.summary_text;
      if (!summaryText) {
        const [meals, naps, activities] = await Promise.all([
          query('SELECT * FROM meal_logs WHERE routine_id = $1', [routine.id]),
          query('SELECT * FROM nap_logs WHERE routine_id = $1', [routine.id]),
          query('SELECT * FROM activity_logs WHERE routine_id = $1', [routine.id]),
        ]);
        summaryText = summaryService.generateDailySummary({
          child: { full_name: routine.child_name, date_of_birth: routine.date_of_birth },
          routine: { overall_mood: routine.overall_mood, general_notes: routine.general_notes, date: targetDate },
          meals: meals.rows,
          naps: naps.rows,
          activities: activities.rows,
        });
        await query('UPDATE daily_routines SET summary_text = $1 WHERE id = $2', [summaryText, routine.id]);
      }

      if (!routine.parent_email && !routine.whatsapp_number) {
        results.skipped++;
        results.details.push({ child: routine.child_name, status: 'skipped', reason: 'No contact info' });
        continue;
      }

      const sendResults = [];

      // Email
      if (channels.includes('email') && routine.parent_email) {
        try {
          await notificationService.sendEmail({
            to: routine.parent_email,
            subject: `${routine.child_name}'s Day at Intellitots — ${targetDate}`,
            html: notificationService.buildDailySummaryEmailHtml({
              parentName: routine.parent_name,
              childName: routine.child_name,
              date: targetDate,
              summaryText,
            }),
          });
          await _logNotification(routine.child_id, 'email', routine.parent_email,
            `${routine.child_name}'s Daily Summary`, summaryText, 'sent');
          sendResults.push('email:sent');
        } catch (err) {
          logger.error(`Email failed for ${routine.child_name}:`, err.message);
          await _logNotification(routine.child_id, 'email', routine.parent_email,
            `${routine.child_name}'s Daily Summary`, summaryText, 'failed', err.message);
          sendResults.push('email:failed');
        }
      }

      // WhatsApp
      if (channels.includes('whatsapp') && routine.whatsapp_number) {
        try {
          await notificationService.sendWhatsApp({
            to: routine.whatsapp_number,
            body: notificationService.buildDailySummaryWhatsAppText({
              childName: routine.child_name,
              date: targetDate,
              summaryText,
            }),
          });
          await _logNotification(routine.child_id, 'whatsapp', routine.whatsapp_number,
            null, summaryText, 'sent');
          sendResults.push('whatsapp:sent');
        } catch (err) {
          logger.error(`WhatsApp failed for ${routine.child_name}:`, err.message);
          sendResults.push('whatsapp:failed');
        }
      }

      const allSent = sendResults.every((r) => r.endsWith(':sent'));
      if (allSent) {
        results.sent++;
        await query('UPDATE daily_routines SET summary_sent_at = NOW() WHERE id = $1', [routine.id]);
      } else {
        results.failed++;
      }

      results.details.push({
        child: routine.child_name,
        status: allSent ? 'sent' : 'partial',
        channels: sendResults,
      });
    }

    return success(res, results, 200,
      `Notifications processed: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped.`
    );
  } catch (err) {
    next(err);
  }
}

async function _logNotification(childId, channel, recipient, subject, body, status, errorMsg = null) {
  await query(
    `INSERT INTO notifications (child_id, channel, recipient, subject, body, status, sent_at, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [childId, channel, recipient, subject, body, status,
      status === 'sent' ? new Date() : null, errorMsg]
  );
}

/**
 * GET /api/notifications/history
 */
async function getNotificationHistory(req, res, next) {
  try {
    const { page = 1, limit = 50, child_id, status, channel } = req.query;
    const offset = getOffset(page, limit);

    const conditions = [];
    const params = [];
    let idx = 1;

    if (child_id) { conditions.push(`n.child_id = $${idx++}`); params.push(child_id); }
    if (status) { conditions.push(`n.status = $${idx++}`); params.push(status); }
    if (channel) { conditions.push(`n.channel = $${idx++}`); params.push(channel); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      query(
        `SELECT n.*, c.full_name AS child_name
         FROM notifications n
         LEFT JOIN children c ON c.id = n.child_id
         ${where}
         ORDER BY n.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM notifications n ${where}`, params),
    ]);

    return success(res, paginate(data.rows, parseInt(count.rows[0].count), page, limit));
  } catch (err) {
    next(err);
  }
}

module.exports = { sendDailySummaries, getNotificationHistory };
