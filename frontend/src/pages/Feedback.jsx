import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MessageSquare } from 'lucide-react';
import { submitFeedback } from '../utils/api';

const CATEGORIES = [
  { value: 'bug',         label: '🐞 Bug report' },
  { value: 'suggestion',  label: '💡 Suggestion' },
  { value: 'compliment',  label: '👏 Compliment' },
  { value: 'question',    label: '❓ Question' },
  { value: 'other',       label: '📝 Other' },
];

const initialState = {
  category: 'suggestion',
  rating: 0,
  subject: '',
  message: '',
};

export default function Feedback() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setRating = (n) => setForm((prev) => ({ ...prev, rating: prev.rating === n ? 0 : n }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) {
      toast.error('Please enter a message.');
      return;
    }
    setLoading(true);
    try {
      await submitFeedback({
        category: form.category,
        rating: form.rating || undefined,
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
      });
      toast.success('Thanks for your feedback — we have received it!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Your feedback could not be sent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.badge}><MessageSquare size={14} /> SouthSwift Feedback</div>
          <h1 style={styles.title}>Tell us what you think</h1>
          <p style={styles.subtitle}>
            Your feedback goes straight to the SouthSwift team on Slack. We read every message.
          </p>
        </div>

        <form onSubmit={submit} style={styles.form}>
          <label style={styles.field}>
            <span style={styles.label}>Type</span>
            <select value={form.category} onChange={(e) => update('category', e.target.value)} style={styles.input}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          <div style={styles.field}>
            <span style={styles.label}>How would you rate your experience? (optional)</span>
            <div style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  style={{
                    ...styles.star,
                    ...(n <= form.rating ? styles.starActive : {}),
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>Subject (optional)</span>
            <input
              value={form.subject}
              onChange={(e) => update('subject', e.target.value)}
              style={styles.input}
              placeholder="Short summary"
              maxLength={200}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Message</span>
            <textarea
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
              style={styles.textarea}
              rows={6}
              placeholder="What's on your mind?"
              maxLength={2000}
              required
            />
            <span style={styles.counter}>{form.message.length}/2000</span>
          </label>

          <div style={styles.actions}>
            <button type="button" onClick={() => navigate(-1)} style={styles.secondaryBtn} disabled={loading}>
              Cancel
            </button>
            <button type="submit" style={styles.primaryBtn} disabled={loading}>
              {loading ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const G = '#1B4332';
const GOLD = '#C8963C';

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #f5f6f2 0%, #eef6ef 100%)', padding: '48px 20px' },
  card: { maxWidth: 640, margin: '0 auto', background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 20px 55px rgba(0,0,0,0.08)' },
  header: { marginBottom: 24 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eaf6ea', color: G, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: 900, color: '#111', margin: '10px 0 8px' },
  subtitle: { color: '#666', fontSize: 14, margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 700, color: '#333' },
  input: { border: '1px solid #dfe3de', borderRadius: 10, padding: '12px 14px', fontSize: 14 },
  textarea: { border: '1px solid #dfe3de', borderRadius: 10, padding: '12px 14px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' },
  counter: { fontSize: 11, color: '#999', alignSelf: 'flex-end' },
  stars: { display: 'flex', gap: 6 },
  star: { background: 'none', border: 'none', fontSize: 30, lineHeight: 1, cursor: 'pointer', color: '#D1D5DB', padding: 0 },
  starActive: { color: GOLD },
  actions: { display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  primaryBtn: { background: GOLD, color: 'white', border: 'none', borderRadius: 10, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { background: '#f3f5f2', color: '#222', border: 'none', borderRadius: 10, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' },
};

