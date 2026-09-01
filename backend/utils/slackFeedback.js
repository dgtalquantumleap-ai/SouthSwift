const axios = require('axios');

// Slack renders &, < and > as special characters (links, HTML entities). User-submitted
// feedback must be escaped so someone can't inject a fake <http://…> link or break the
// Block Kit layout. This mirrors Slack's recommended escaping for mrkdwn text.
const escapeSlackMd = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Build a Block Kit message for a feedback submission. `user` is req.user
// ({ full_name, email, role }). All user-supplied fields are escaped.
const buildFeedbackBlocks = ({ user, category, rating, subject, message }) => {
  const name   = escapeSlackMd(user?.full_name || 'Unknown user');
  const email  = escapeSlackMd(user?.email || 'no email');
  const role   = escapeSlackMd(user?.role || 'unknown');
  const cat    = escapeSlackMd(category || 'other');
  const subj   = escapeSlackMd(subject || '');
  const msg    = escapeSlackMd(message || '');
  const stars  = typeof rating === 'number' && rating >= 1 && rating <= 5
    ? `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`
    : '—';

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':speech_balloon: New SouthSwift Feedback', emoji: true },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `*From:* ${name}  ·  \`${email}\`  ·  ${role}` },
        { type: 'mrkdwn', text: `*Submitted:* ${new Date().toUTCString()}` },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Category:*\n${cat}` },
        { type: 'mrkdwn', text: `*Rating:*\n${stars}` },
      ],
    },
  ];

  if (subj) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Subject:*\n${subj}` },
    });
  }

  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*Message:*\n${msg}` },
  });

  blocks.push({ type: 'divider' });

  const fallback = `New feedback from ${name} (${role}) — ${cat}: ${subj || msg}`.slice(0, 150);

  return { text: fallback, blocks };
};

// Post the feedback message to Slack. Returns the axios response data ({ ok, error, ts, channel }).
const postFeedbackToSlack = async ({ user, category, rating, subject, message }) => {
  const token   = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_FEEDBACK_CHANNEL;
  if (!token || !channel) {
    throw new Error('Slack is not configured (SLACK_BOT_TOKEN / SLACK_FEEDBACK_CHANNEL missing).');
  }

  const { text, blocks } = buildFeedbackBlocks({ user, category, rating, subject, message });
  const res = await axios.post(
    'https://slack.com/api/chat.postMessage',
    { channel, text, blocks },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' } }
  );
  return res.data;
};

module.exports = { escapeSlackMd, buildFeedbackBlocks, postFeedbackToSlack };

