const { postFeedbackToSlack } = require('../utils/slackFeedback');

const CATEGORIES = ['bug', 'suggestion', 'compliment', 'question', 'other'];
const MAX_MESSAGE = 2000;
const MAX_SUBJECT = 200;

// POST /api/feedback — auth-gated. Forwards the submission to Slack (Block Kit) and
// responds immediately. No DB row is written; Slack is the system of record.
const submitFeedback = async (req, res) => {
  const { category, rating, subject, message } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter a message.' });
  }
  if (message.length > MAX_MESSAGE) {
    return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE} characters).` });
  }
  const safeCategory = CATEGORIES.includes(category) ? category : 'other';

  let safeRating = null;
  if (rating !== undefined && rating !== null && rating !== '') {
    const n = Number(rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return res.status(400).json({ error: 'Rating must be a whole number between 1 and 5.' });
    }
    safeRating = n;
  }

  const safeSubject = typeof subject === 'string' ? subject.slice(0, MAX_SUBJECT) : '';

  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_FEEDBACK_CHANNEL) {
    console.error('Feedback submit blocked: Slack is not configured.');
    return res.status(503).json({ error: 'Feedback is temporarily unavailable. Please try again later.' });
  }

  try {
    const result = await postFeedbackToSlack({
      user:     req.user,
      category: safeCategory,
      rating:   safeRating,
      subject:  safeSubject,
      message:  message.trim(),
    });

    if (!result.ok) {
      console.error('Slack feedback post failed:', result.error);
      return res.status(502).json({ error: 'We could not deliver your feedback. Please try again later.' });
    }

    return res.status(201).json({ success: true, message: 'Thanks for your feedback — we have received it!' });
  } catch (err) {
    console.error('Feedback submit error:', err.message);
    return res.status(502).json({ error: 'We could not deliver your feedback. Please try again later.' });
  }
};

module.exports = { submitFeedback };

