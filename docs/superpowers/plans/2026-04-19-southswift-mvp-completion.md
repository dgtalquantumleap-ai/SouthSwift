# SouthSwift MVP Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining features of the SouthSwift MVP — messaging, image uploads, reviews, dispute resolution, real fund disbursement, pagination, and DB indexes.

**Architecture:** Full-stack Node.js/Express backend + React frontend. Backend uses PostgreSQL via `pg` pool, Cloudinary for images, Paystack for payments. Frontend uses React 18 with inline CSS styles, Axios via `src/utils/api.js`, and React Hot Toast. All new backend routes follow the existing pattern: controller function → route file → registered in `server.js`.

**Tech Stack:** Node.js, Express, PostgreSQL, React 18, Axios, Cloudinary, Paystack Transfers API, Multer, Lucide React, React Hot Toast

---

## File Map

### Backend — new/modified files
| File | Action | Purpose |
|------|--------|---------|
| `backend/controllers/dealController.js` | Modify | Fix `raiseDipute` typo → `raiseDispute` |
| `backend/routes/deals.js` | Modify | Fix import typo |
| `backend/routes/messages.js` | **Create** | Wire message routes |
| `backend/routes/reviews.js` | **Create** | Wire review routes |
| `backend/controllers/reviewController.js` | **Create** | Submit + fetch reviews, update agent rating |
| `backend/controllers/agentAdminController.js` | Modify | Add `resolveDispute` to adminController, add `submitVerificationWithDocs` to agentController |
| `backend/routes/admin.js` | Modify | Add dispute resolve route |
| `backend/routes/agents.js` | Modify | Add doc-upload route |
| `backend/middleware/upload.js` | **Create** | Multer + Cloudinary upload middleware |
| `backend/controllers/listingController.js` | Modify | Add image upload to create/update listing |
| `backend/routes/listings.js` | Modify | Add image upload route |
| `server.js` | Modify | Register `/api/messages` and `/api/reviews` routes |
| `backend/config/db.js` | Modify | Add DB indexes migration |

### Backend — Paystack Transfer
| File | Action | Purpose |
|------|--------|---------|
| `backend/controllers/agentAdminController.js` | Modify | `releaseFunds` calls Paystack Transfer API |

### Frontend — new/modified files
| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/utils/api.js` | Modify | Add message, review, upload API calls |
| `frontend/src/pages/DealDetail.jsx` | Modify | Add SwiftConnect chat UI + post-deal review form |
| `frontend/src/pages/Dashboard.jsx` | Modify | Add image upload to agent verification form |
| `frontend/src/pages/CreateListing.jsx` | Modify | Add image upload UI |
| `frontend/src/pages/AdminPanel.jsx` | Modify | Add disputes tab + fund disbursement status |
| `frontend/src/pages/Home.jsx` | Modify | Add pagination controls |

---

## Task 1: Fix Typo — `raiseDipute` → `raiseDispute`

**Files:**
- Modify: `backend/controllers/dealController.js:215`
- Modify: `backend/routes/deals.js:4`

- [ ] **Step 1: Fix function name in controller**

In `backend/controllers/dealController.js` line 215, change:
```js
const raiseDipute = async (req, res) => {
```
to:
```js
const raiseDispute = async (req, res) => {
```

And at the bottom (line 277), change the export:
```js
module.exports = { initiateDeal, verifyPayment, confirmMoveIn, raiseDispute, getMyDeals, getDeal };
```

- [ ] **Step 2: Fix import in route file**

In `backend/routes/deals.js` line 4, change:
```js
const { initiateDeal, verifyPayment, confirmMoveIn, raiseDipute, getMyDeals, getDeal } = require('../controllers/dealController');
```
to:
```js
const { initiateDeal, verifyPayment, confirmMoveIn, raiseDispute, getMyDeals, getDeal } = require('../controllers/dealController');
```

Line 12, change:
```js
router.post('/:id/dispute',    protect, raiseDipute);
```
to:
```js
router.post('/:id/dispute',    protect, raiseDispute);
```

- [ ] **Step 3: Verify server starts without error**

```bash
cd backend && node server.js
```
Expected: `🛡️  SouthSwift backend running on port 5000` with no crash.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/dealController.js backend/routes/deals.js
git commit -m "fix: correct raiseDispute typo in dealController and deals route"
```

---

## Task 2: Wire Messaging Routes (Backend)

**Files:**
- Create: `backend/routes/messages.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Create message route file**

Create `backend/routes/messages.js`:
```js
const express = require('express');
const router  = express.Router();
const { sendMessage, getMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.post('/send',       protect, sendMessage);
router.get('/:dealId',     protect, getMessages);

module.exports = router;
```

- [ ] **Step 2: Register route in server.js**

In `backend/server.js`, after line 11 (`const paymentRoutes = require('./routes/payments');`), add:
```js
const messageRoutes = require('./routes/messages');
```

After line 36 (`app.use('/api/payments', paymentRoutes);`), add:
```js
app.use('/api/messages', messageRoutes);
```

- [ ] **Step 3: Verify endpoint responds**

Start server, then:
```bash
curl -X GET http://localhost:5000/api/messages/test-deal-id \
  -H "Authorization: Bearer VALID_TOKEN"
```
Expected: `403 Not authorised.` or messages array (not 404).

- [ ] **Step 4: Commit**

```bash
git add backend/routes/messages.js backend/server.js
git commit -m "feat: wire SwiftConnect messaging routes to /api/messages"
```

---

## Task 3: Add Messaging UI to DealDetail (Frontend)

**Files:**
- Modify: `frontend/src/utils/api.js`
- Modify: `frontend/src/pages/DealDetail.jsx`

- [ ] **Step 1: Add message API calls to api.js**

In `frontend/src/utils/api.js`, add after the DEALS section:
```js
// ── MESSAGES ─────────────────────────────────────────────────────────────────
export const sendMessage  = (dealId, receiverId, content) =>
  API.post('/messages/send', { deal_id: dealId, receiver_id: receiverId, content });
export const getMessages  = (dealId) => API.get(`/messages/${dealId}`);
```

- [ ] **Step 2: Add chat state + fetch to DealDetail**

In `frontend/src/pages/DealDetail.jsx`, update imports at top to include the new API calls:
```js
import { getDeal, confirmMoveIn, raiseDispute, sendMessage, getMessages } from '../utils/api';
```
(Remove the unused bulk imports from the existing line 5–9 that import admin functions — those belong in AdminPanel only.)

Inside `DealDetail` component, add state after existing state declarations (after line 22):
```js
const [messages, setMessages] = useState([]);
const [msgText, setMsgText]   = useState('');
const [msgLoading, setML]     = useState(false);

const fetchMessages = () =>
  getMessages(id).then(r => setMessages(r.data)).catch(() => {});

useEffect(() => { fetchMessages(); }, [id]);
```

- [ ] **Step 3: Add chat UI to DealDetail render**

In `DealDetail`, inside the `<div style={ps.right}>` section, add a SwiftConnect chat card after the dispute card:

```jsx
{['escrow_held','docs_generated','movein_pending','completed','disputed'].includes(deal.status) && (
  <div style={ps.infoCard}>
    <h3 style={ps.cardTitle}><MessageSquare size={15}/> SwiftConnect</h3>
    <div style={{maxHeight:220, overflowY:'auto', marginBottom:10}}>
      {messages.length === 0
        ? <p style={{fontSize:12, color:'#888', textAlign:'center', padding:'20px 0'}}>No messages yet.</p>
        : messages.map(m => (
            <div key={m.id} style={{
              display:'flex', flexDirection:'column',
              alignItems: m.sender_id === user?.id ? 'flex-end' : 'flex-start',
              marginBottom:8
            }}>
              <div style={{
                background: m.sender_id === user?.id ? G : '#F3F4F6',
                color: m.sender_id === user?.id ? 'white' : '#111',
                padding:'8px 12px', borderRadius:10, fontSize:12.5, maxWidth:'80%'
              }}>
                {m.content}
              </div>
              <span style={{fontSize:10, color:'#999', marginTop:2}}>{m.sender_name}</span>
            </div>
          ))
      }
    </div>
    <div style={{display:'flex', gap:8}}>
      <input
        style={{...ps.input, flex:1, padding:'8px 10px'}}
        placeholder="Type a message..."
        value={msgText}
        onChange={e => setMsgText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !msgLoading && handleSendMessage()}
      />
      <button
        disabled={msgLoading || !msgText.trim()}
        onClick={handleSendMessage}
        style={{background:G, color:'white', border:'none', padding:'8px 14px',
                borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12,
                opacity: msgLoading ? 0.6 : 1}}
      >
        Send
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add handleSendMessage function**

Inside `DealDetail` component, add before the `return` statement:
```js
const handleSendMessage = async () => {
  if (!msgText.trim()) return;
  const receiverId = user?.id === deal.tenant_id ? deal.agent_id : deal.tenant_id;
  setML(true);
  try {
    await sendMessage(id, receiverId, msgText.trim());
    setMsgText('');
    await fetchMessages();
  } catch(err) {
    toast.error(err.response?.data?.error || 'Failed to send message.');
  }
  setML(false);
};
```

- [ ] **Step 5: Verify chat renders on deal page**

Start frontend dev server (`npm start` in `frontend/`), log in as a tenant with an active deal, navigate to `/deals/:id`. Confirm the SwiftConnect chat panel appears and messages can be sent.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/api.js frontend/src/pages/DealDetail.jsx
git commit -m "feat: add SwiftConnect chat UI to DealDetail with send/receive messages"
```

---

## Task 4: Image Upload Middleware (Backend)

**Files:**
- Create: `backend/middleware/upload.js`
- Modify: `backend/package.json` (ensure multer + cloudinary installed)

- [ ] **Step 1: Check packages installed**

```bash
cd backend && node -e "require('multer'); require('cloudinary'); console.log('OK')"
```
If error, install:
```bash
npm install multer cloudinary multer-storage-cloudinary
```

- [ ] **Step 2: Create upload middleware**

Create `backend/middleware/upload.js`:
```js
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const listingStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'southswift/listings', allowed_formats: ['jpg','jpeg','png','webp'] },
});

const agentDocStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'southswift/agent-docs',
    allowed_formats: ['jpg','jpeg','png','pdf'],
    public_id: `${req.user.id}-${file.fieldname}-${Date.now()}`,
  }),
});

const uploadListingImages = multer({ storage: listingStorage, limits: { files: 6 } })
  .array('images', 6);

const uploadAgentDocs = multer({ storage: agentDocStorage })
  .fields([
    { name: 'id_document', maxCount: 1 },
    { name: 'selfie',      maxCount: 1 },
  ]);

module.exports = { uploadListingImages, uploadAgentDocs };
```

- [ ] **Step 3: Add CLOUDINARY vars to .env.example**

In `backend/.env.example`, confirm these lines exist (add if missing):
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- [ ] **Step 4: Commit**

```bash
git add backend/middleware/upload.js backend/.env.example
git commit -m "feat: add Cloudinary multer upload middleware for listing images and agent docs"
```

---

## Task 5: Listing Image Upload Route (Backend + Frontend)

**Files:**
- Modify: `backend/controllers/listingController.js`
- Modify: `backend/routes/listings.js`
- Modify: `frontend/src/utils/api.js`
- Modify: `frontend/src/pages/CreateListing.jsx` (inside `DealDetail.jsx`)

- [ ] **Step 1: Read listingController to understand create function**

Open `backend/controllers/listingController.js` and find the `createListing` function. Add image handling by reading `req.files` after upload middleware runs.

In `backend/controllers/listingController.js`, find the `createListing` function and update the images line to use uploaded files:
```js
// Inside createListing, replace the images line in the INSERT with:
const images = req.files ? req.files.map(f => f.path) : (req.body.images || []);
```
Ensure the INSERT query uses this `images` variable instead of `req.body.images`.

- [ ] **Step 2: Add upload route in listings.js**

In `backend/routes/listings.js`, import upload middleware and wrap the create route:
```js
const { uploadListingImages } = require('../middleware/upload');
```

Find the `router.post('/', protect, ...)` line and update to:
```js
router.post('/', protect, (req, res, next) => {
  uploadListingImages(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, createListing);
```

- [ ] **Step 3: Add uploadListingImages API call to api.js**

In `frontend/src/utils/api.js`, replace the `createListing` export:
```js
export const createListing = (data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (k === 'images') {
      v.forEach(file => fd.append('images', file));
    } else if (Array.isArray(v)) {
      fd.append(k, JSON.stringify(v));
    } else {
      fd.append(k, v);
    }
  });
  return API.post('/listings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
```

- [ ] **Step 4: Add image upload UI to CreateListing**

In `frontend/src/pages/DealDetail.jsx` (where `CreateListing` lives), add image state inside the `CreateListing` component after the existing `form` state:
```js
const [images, setImages] = useState([]);
const [previews, setPreviews] = useState([]);
```

Add image selection handler:
```js
const handleImages = (e) => {
  const files = Array.from(e.target.files).slice(0, 6);
  setImages(files);
  setPreviews(files.map(f => URL.createObjectURL(f)));
};
```

Update `submit` to pass images:
```js
const data = {
  ...form,
  amenities: form.amenities ? form.amenities.split(',').map(a => a.trim()) : [],
  images,
};
const res = await createListing(data);
```

Add image upload field in the form JSX, after the amenities input:
```jsx
<div>
  <label style={ps.label}>Property Photos (up to 6)</label>
  <input type="file" accept="image/*" multiple onChange={handleImages}
    style={{...ps.input, padding:'6px'}} />
  {previews.length > 0 && (
    <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
      {previews.map((src, i) => (
        <img key={i} src={src} alt="" style={{width:80, height:60, objectFit:'cover', borderRadius:6, border:'1px solid #DDD'}} />
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 5: Verify image upload works**

Log in as agent, go to Create Listing, attach 2 images, submit. Check Cloudinary dashboard that images appear. Check listing detail page shows images.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/listingController.js backend/routes/listings.js \
        frontend/src/utils/api.js frontend/src/pages/DealDetail.jsx
git commit -m "feat: listing image upload via Cloudinary — backend route + frontend UI"
```

---

## Task 6: Agent Document Upload (Backend + Frontend)

**Files:**
- Modify: `backend/controllers/agentAdminController.js`
- Modify: `backend/routes/agents.js`
- Modify: `frontend/src/utils/api.js`
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Update submitVerification to handle file uploads**

In `backend/controllers/agentAdminController.js`, update `submitVerification`:
```js
submitVerification: async (req, res) => {
  const { nin, agency_name, bio } = req.body;
  if (!nin) return res.status(400).json({ error: 'NIN is required for verification.' });

  const id_document_url = req.files?.id_document?.[0]?.path || null;
  const selfie_url      = req.files?.selfie?.[0]?.path || null;

  try {
    await pool.query(`
      UPDATE agent_profiles
      SET nin=$1, agency_name=$2, bio=$3, id_document_url=$4, selfie_url=$5,
          verification_status='pending', updated_at=NOW()
      WHERE user_id=$6
    `, [nin, agency_name||null, bio||null, id_document_url, selfie_url, req.user.id]);
    res.json({ message: 'Verification request submitted. SouthSwift will review within 48 hours.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
},
```

- [ ] **Step 2: Wrap verify-request route with upload middleware**

In `backend/routes/agents.js`, import upload middleware:
```js
const { uploadAgentDocs } = require('../middleware/upload');
```

Find the `router.post('/verify-request', ...)` line and update to:
```js
router.post('/verify-request', protect, (req, res, next) => {
  uploadAgentDocs(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, agentController.submitVerification);
```

- [ ] **Step 3: Update submitVerification API call in api.js**

In `frontend/src/utils/api.js`, replace `submitVerification`:
```js
export const submitVerification = (data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => { if (v) fd.append(k, v); });
  return API.post('/agents/verify-request', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
```

- [ ] **Step 4: Add document upload fields to Dashboard verification form**

Open `frontend/src/pages/Dashboard.jsx` and find the agent verification form section. Add state for files:
```js
const [verDocs, setVerDocs] = useState({ id_document: null, selfie: null });
```

Add file inputs to the form JSX (after the bio textarea):
```jsx
<div>
  <label style={s.label}>Government ID Document *</label>
  <input type="file" accept="image/*,.pdf"
    onChange={e => setVerDocs(d => ({...d, id_document: e.target.files[0]}))}
    style={{...s.input, padding:'6px'}} />
  {verDocs.id_document && <span style={{fontSize:11,color:'#888'}}>✓ {verDocs.id_document.name}</span>}
</div>
<div>
  <label style={s.label}>Selfie with ID *</label>
  <input type="file" accept="image/*"
    onChange={e => setVerDocs(d => ({...d, selfie: e.target.files[0]}))}
    style={{...s.input, padding:'6px'}} />
  {verDocs.selfie && <span style={{fontSize:11,color:'#888'}}>✓ {verDocs.selfie.name}</span>}
</div>
```

Update the verification submit handler to include files:
```js
await submitVerification({ nin: verForm.nin, agency_name: verForm.agency_name, bio: verForm.bio,
                           id_document: verDocs.id_document, selfie: verDocs.selfie });
```

- [ ] **Step 5: Verify docs appear in admin pending agents panel**

Log in as agent, submit verification with NIN + 2 docs. Log in as admin, go to Admin Panel → Agents. Confirm `id_document_url` and `selfie_url` fields are populated for the pending agent.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/agentAdminController.js backend/routes/agents.js \
        frontend/src/utils/api.js frontend/src/pages/Dashboard.jsx
git commit -m "feat: agent document upload (ID + selfie) via Cloudinary in verification flow"
```

---

## Task 7: Reviews Backend

**Files:**
- Create: `backend/controllers/reviewController.js`
- Create: `backend/routes/reviews.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Create review controller**

Create `backend/controllers/reviewController.js`:
```js
const { pool } = require('../config/db');

// POST /api/reviews — tenant submits review after completed deal
const submitReview = async (req, res) => {
  const { deal_id, rating, comment } = req.body;
  if (!deal_id || !rating) return res.status(400).json({ error: 'deal_id and rating are required.' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5.' });

  try {
    const dealResult = await pool.query(
      "SELECT * FROM deals WHERE id=$1 AND tenant_id=$2 AND status='completed'",
      [deal_id, req.user.id]
    );
    if (!dealResult.rows.length)
      return res.status(403).json({ error: 'Only tenants of completed deals can leave reviews.' });

    const deal = dealResult.rows[0];

    const existing = await pool.query(
      'SELECT id FROM reviews WHERE deal_id=$1 AND reviewer_id=$2',
      [deal_id, req.user.id]
    );
    if (existing.rows.length)
      return res.status(400).json({ error: 'You have already reviewed this deal.' });

    await pool.query(
      'INSERT INTO reviews (deal_id, reviewer_id, agent_id, rating, comment) VALUES ($1,$2,$3,$4,$5)',
      [deal_id, req.user.id, deal.agent_id, rating, comment || null]
    );

    // Recalculate agent average rating
    const avgResult = await pool.query(
      'SELECT ROUND(AVG(rating)::numeric, 2) AS avg FROM reviews WHERE agent_id=$1',
      [deal.agent_id]
    );
    await pool.query(
      'UPDATE agent_profiles SET rating=$1 WHERE user_id=$2',
      [avgResult.rows[0].avg, deal.agent_id]
    );

    res.status(201).json({ message: 'Review submitted. Thank you!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/reviews/agent/:agentId — get reviews for an agent
const getAgentReviews = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.rating, r.comment, r.created_at,
             u.full_name AS reviewer_name
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      WHERE r.agent_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.agentId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { submitReview, getAgentReviews };
```

- [ ] **Step 2: Create review routes**

Create `backend/routes/reviews.js`:
```js
const express = require('express');
const router  = express.Router();
const { submitReview, getAgentReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/',                     protect, submitReview);
router.get('/agent/:agentId',                 getAgentReviews);

module.exports = router;
```

- [ ] **Step 3: Register in server.js**

In `backend/server.js`, after the messageRoutes import add:
```js
const reviewRoutes  = require('./routes/reviews');
```

After `app.use('/api/messages', messageRoutes);` add:
```js
app.use('/api/reviews',  reviewRoutes);
```

- [ ] **Step 4: Test endpoint**

```bash
curl http://localhost:5000/api/reviews/agent/SOME_AGENT_UUID
```
Expected: `[]` (empty array, not 404).

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/reviewController.js backend/routes/reviews.js backend/server.js
git commit -m "feat: reviews backend — submit review, get agent reviews, recalculate rating"
```

---

## Task 8: Reviews Frontend

**Files:**
- Modify: `frontend/src/utils/api.js`
- Modify: `frontend/src/pages/DealDetail.jsx`
- Modify: `frontend/src/pages/AgentProfile.jsx` (inside `DealDetail.jsx`)

- [ ] **Step 1: Add review API calls to api.js**

In `frontend/src/utils/api.js`, add after the messages section:
```js
// ── REVIEWS ───────────────────────────────────────────────────────────────────
export const submitReview     = (data)    => API.post('/reviews', data);
export const getAgentReviews  = (agentId) => API.get(`/reviews/agent/${agentId}`);
```

- [ ] **Step 2: Add review form to DealDetail**

In the `DealDetail` component, add state:
```js
const [reviewForm, setRF] = useState({ rating: 5, comment: '' });
const [reviewed, setReviewed] = useState(false);
```

Add review handler before the `return`:
```js
const handleReview = async () => {
  try {
    await submitReview({ deal_id: id, rating: reviewForm.rating, comment: reviewForm.comment });
    toast.success('Review submitted! ⭐');
    setReviewed(true);
  } catch(err) { toast.error(err.response?.data?.error || 'Failed to submit review.'); }
};
```

Add review card in the `<div style={ps.right}>` section, after the confirm move-in card:
```jsx
{deal.status === 'completed' && user?.id === deal.tenant_id && !reviewed && (
  <div style={{...ps.actionCard, background:'#FFFBEB', border:'1px solid #FDE68A'}}>
    <h3 style={{...ps.cardTitle, color:'#92400E'}}>⭐ Rate Your Agent</h3>
    <p style={{fontSize:12, color:'#78350F', marginBottom:10}}>
      How was your experience with {deal.agent_name}?
    </p>
    <div style={{display:'flex', gap:6, marginBottom:10}}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => setRF(f=>({...f, rating:n}))}
          style={{fontSize:22, background:'none', border:'none', cursor:'pointer',
                  opacity: n <= reviewForm.rating ? 1 : 0.3}}>
          ⭐
        </button>
      ))}
    </div>
    <textarea style={{...ps.textarea, borderColor:'#FDE68A'}}
      placeholder="Optional comment..."
      value={reviewForm.comment}
      onChange={e => setRF(f=>({...f, comment:e.target.value}))} />
    <button onClick={handleReview} style={{...ps.confirmBtn, background:'#92400E'}}>
      Submit Review
    </button>
  </div>
)}
```

- [ ] **Step 3: Show reviews on AgentProfile**

In the `AgentProfile` component (inside `DealDetail.jsx`), add state:
```js
const [reviews, setReviews] = useState([]);
```

Update the `useEffect` to also fetch reviews:
```js
useEffect(() => {
  getAgent(id).then(r => setAgent(r.data)).catch(() => {});
  getAgentReviews(id).then(r => setReviews(r.data)).catch(() => {});
}, [id]);
```

Add import at top of file:
```js
import { getDeal, confirmMoveIn, raiseDispute, sendMessage, getMessages,
         submitReview, getAgentReviews } from '../utils/api';
```

After the `agentBio` div in `AgentProfile`, add:
```jsx
{reviews.length > 0 && (
  <div style={{background:'white', borderRadius:12, padding:'20px', border:'1px solid #E5E7EB', marginTop:16}}>
    <h3 style={{fontSize:15, fontWeight:700, color:G, margin:'0 0 14px'}}>
      Tenant Reviews ({reviews.length})
    </h3>
    {reviews.map((r, i) => (
      <div key={i} style={{borderBottom:'1px solid #F3F4F6', paddingBottom:12, marginBottom:12}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
          <span style={{fontWeight:700, fontSize:13, color:'#111'}}>{r.reviewer_name}</span>
          <span style={{color:GOLD}}>{'⭐'.repeat(r.rating)}</span>
        </div>
        {r.comment && <p style={{fontSize:13, color:'#444', margin:0}}>{r.comment}</p>}
        <span style={{fontSize:10, color:'#999'}}>{new Date(r.created_at).toLocaleDateString('en-NG')}</span>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Verify end-to-end**

Log in as tenant with a completed deal. Navigate to deal, confirm review form shows. Submit a 4-star review. Navigate to agent profile, confirm review appears and agent rating updated.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/api.js frontend/src/pages/DealDetail.jsx
git commit -m "feat: review UI — rate agent after completed deal, show reviews on agent profile"
```

---

## Task 9: Dispute Resolution Admin UI

**Files:**
- Modify: `backend/controllers/agentAdminController.js`
- Modify: `backend/routes/admin.js`
- Modify: `frontend/src/utils/api.js`
- Modify: `frontend/src/pages/AdminPanel.jsx`

- [ ] **Step 1: Add resolveDispute to adminController**

In `backend/controllers/agentAdminController.js`, inside `adminController`, add after `releaseFunds`:
```js
// PUT /api/admin/deals/:id/resolve-dispute
resolveDispute: async (req, res) => {
  const { resolution, winner } = req.body;
  // winner: 'tenant' | 'agent' | 'split'
  if (!resolution || !winner)
    return res.status(400).json({ error: 'resolution text and winner required.' });
  if (!['tenant','agent','split'].includes(winner))
    return res.status(400).json({ error: 'winner must be tenant, agent, or split.' });

  try {
    const dealResult = await pool.query('SELECT * FROM deals WHERE id=$1', [req.params.id]);
    if (!dealResult.rows.length) return res.status(404).json({ error: 'Deal not found.' });
    const deal = dealResult.rows[0];
    if (deal.status !== 'disputed')
      return res.status(400).json({ error: 'Deal is not disputed.' });

    await pool.query(
      "UPDATE deals SET status='completed', notes=$1, funds_released_at=NOW(), updated_at=NOW() WHERE id=$2",
      [`DISPUTE RESOLVED: ${resolution} | Winner: ${winner}`, req.params.id]
    );

    // Notify both parties
    const { sendEmail } = require('./emailController');
    const tenantRes = await pool.query('SELECT email, full_name FROM users WHERE id=$1', [deal.tenant_id]);
    const agentRes  = await pool.query('SELECT email, full_name FROM users WHERE id=$1', [deal.agent_id]);
    const tenant = tenantRes.rows[0]; const agent = agentRes.rows[0];

    await sendEmail({
      to: tenant.email,
      subject: '🛡️ SouthSwift — Dispute Resolved',
      html: `<p>Dear ${tenant.full_name}, your dispute for deal ${deal.id.slice(0,8)} has been resolved.</p><p><strong>Resolution:</strong> ${resolution}</p>`,
    });
    await sendEmail({
      to: agent.email,
      subject: '🛡️ SouthSwift — Dispute Resolved',
      html: `<p>Dear ${agent.full_name}, the dispute for deal ${deal.id.slice(0,8)} has been resolved.</p><p><strong>Resolution:</strong> ${resolution}</p>`,
    });

    res.json({ message: 'Dispute resolved and parties notified.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
},
```

- [ ] **Step 2: Add resolveDispute route in admin.js**

Open `backend/routes/admin.js` and find the existing routes. Add:
```js
router.put('/deals/:id/resolve-dispute', protect, isAdmin, adminController.resolveDispute);
```

- [ ] **Step 3: Add resolveDispute to api.js**

In `frontend/src/utils/api.js`, add:
```js
export const resolveDispute = (dealId, data) =>
  API.put(`/admin/deals/${dealId}/resolve-dispute`, data);
```

- [ ] **Step 4: Add Disputes tab to AdminPanel**

In `frontend/src/pages/AdminPanel.jsx`, update the tabs array:
```js
{['dashboard','agents','deals','disputes'].map(t => (
```

Add state for disputed deals:
```js
const [disputes, setDisputes] = useState([]);
const [resForm, setResForm]   = useState({});
```

In `useEffect`, add:
```js
getAllDeals().then(r => {
  setDeals(r.data);
  setDisputes(r.data.filter(d => d.status === 'disputed'));
}).catch(() => {});
```

Add disputes tab content:
```jsx
{tab === 'disputes' && (
  <div>
    <h3 style={{color:G, marginBottom:16}}>Active Disputes ({disputes.length})</h3>
    {disputes.length === 0
      ? <p style={{color:'#888'}}>No active disputes.</p>
      : disputes.map(d => (
          <div key={d.id} style={{background:'#FFF7F7', borderRadius:10, padding:'16px 18px',
                                  marginBottom:14, border:'1px solid #FECACA'}}>
            <div style={{fontWeight:700, fontSize:14, color:'#111', marginBottom:4}}>
              {d.listing_title} — {d.city}
            </div>
            <div style={{fontSize:12, color:'#888', marginBottom:4}}>
              Tenant: {d.tenant_name} · Agent: {d.agent_name} · ₦{Number(d.rent_amount).toLocaleString()}
            </div>
            <div style={{fontSize:12, color:'#DC2626', marginBottom:10}}>
              <strong>Dispute:</strong> {d.dispute_reason}
            </div>
            <textarea
              placeholder="Enter resolution details..."
              value={resForm[d.id]?.resolution || ''}
              onChange={e => setResForm(f => ({...f, [d.id]: {...f[d.id], resolution: e.target.value}}))}
              style={{width:'100%', border:'1px solid #FECACA', borderRadius:8, padding:'8px',
                      fontSize:12, height:60, boxSizing:'border-box', marginBottom:8}}
            />
            <div style={{display:'flex', gap:8}}>
              {['tenant','agent','split'].map(w => (
                <button key={w} onClick={() => setResForm(f => ({...f, [d.id]: {...f[d.id], winner:w}}))}
                  style={{padding:'5px 12px', borderRadius:6, border:'1px solid #DDD',
                          background: resForm[d.id]?.winner === w ? G : 'white',
                          color: resForm[d.id]?.winner === w ? 'white' : '#444',
                          cursor:'pointer', fontSize:12, textTransform:'capitalize'}}>
                  {w}
                </button>
              ))}
              <button
                disabled={!resForm[d.id]?.resolution || !resForm[d.id]?.winner}
                onClick={async () => {
                  try {
                    await resolveDispute(d.id, resForm[d.id]);
                    toast.success('Dispute resolved');
                    getAllDeals().then(r => {
                      setDeals(r.data);
                      setDisputes(r.data.filter(x => x.status === 'disputed'));
                    });
                  } catch(err) { toast.error('Failed'); }
                }}
                style={{marginLeft:'auto', background:'#DC2626', color:'white', border:'none',
                        padding:'6px 14px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12}}>
                Resolve
              </button>
            </div>
          </div>
        ))
    }
  </div>
)}
```

Also add `resolveDispute` to the imports in `AdminPanel.jsx`:
```js
import { ..., resolveDispute } from '../utils/api';
```

- [ ] **Step 5: Verify dispute resolution**

Log in as tenant, raise a dispute on an escrow deal. Log in as admin, go to Admin → Disputes tab, enter resolution, pick winner = "tenant", click Resolve. Confirm deal status changes to `completed`.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/agentAdminController.js backend/routes/admin.js \
        frontend/src/utils/api.js frontend/src/pages/AdminPanel.jsx
git commit -m "feat: dispute resolution — admin resolves disputes with resolution text and winner decision"
```

---

## Task 10: Real Fund Disbursement via Paystack Transfer API

**Files:**
- Modify: `backend/controllers/agentAdminController.js`

- [ ] **Step 1: Understand Paystack Transfer API**

Paystack Transfer requires:
1. Create a Transfer Recipient (once per agent): `POST https://api.paystack.co/transferrecipient`
2. Initiate Transfer: `POST https://api.paystack.co/transfer`

The agent must have a bank account on record. For MVP, we'll accept `account_number` and `bank_code` from the admin UI when releasing funds, create the recipient, then transfer.

- [ ] **Step 2: Add bank details to agent_profiles table**

In `backend/config/db.js`, inside the `initDB` function, add a migration after the table creation block:

```js
// Add bank detail columns to agent_profiles if not exists
await client.query(`
  ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bank_code      VARCHAR(10),
  ADD COLUMN IF NOT EXISTS account_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS paystack_recipient_code VARCHAR(100);
`);
```

- [ ] **Step 3: Update releaseFunds in adminController**

In `backend/controllers/agentAdminController.js`, replace the `releaseFunds` method:
```js
releaseFunds: async (req, res) => {
  const axios = require('axios');
  const paystackHeaders = {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const dealResult = await pool.query(`
      SELECT d.*, ap.account_number, ap.bank_code, ap.account_name, ap.paystack_recipient_code,
             u.full_name AS agent_full_name
      FROM deals d
      JOIN agent_profiles ap ON ap.user_id = d.agent_id
      JOIN users u ON u.id = d.agent_id
      WHERE d.id = $1
    `, [req.params.id]);

    if (!dealResult.rows.length) return res.status(404).json({ error: 'Deal not found.' });
    const deal = dealResult.rows[0];

    if (!deal.account_number || !deal.bank_code)
      return res.status(400).json({ error: 'Agent has no bank account on record. Ask agent to update their profile.' });

    let recipientCode = deal.paystack_recipient_code;

    // Create recipient if not exists
    if (!recipientCode) {
      const recipRes = await axios.post('https://api.paystack.co/transferrecipient', {
        type:           'nuban',
        name:           deal.account_name || deal.agent_full_name,
        account_number: deal.account_number,
        bank_code:      deal.bank_code,
        currency:       'NGN',
      }, { headers: paystackHeaders });

      recipientCode = recipRes.data.data.recipient_code;

      // Save recipient code for future transfers
      await pool.query(
        'UPDATE agent_profiles SET paystack_recipient_code=$1 WHERE user_id=$2',
        [recipientCode, deal.agent_id]
      );
    }

    // Amount to transfer: rent minus landlord service fee
    const transferAmount = (deal.rent_amount - deal.service_fee_landlord) * 100; // kobo

    const transferRes = await axios.post('https://api.paystack.co/transfer', {
      source:    'balance',
      amount:    transferAmount,
      recipient: recipientCode,
      reason:    `SouthSwift Deal ${deal.id.slice(0,8)} — ${deal.listing_title || 'Property Rental'}`,
    }, { headers: paystackHeaders });

    const transferCode = transferRes.data.data.transfer_code;

    await pool.query(
      "UPDATE deals SET status='completed', funds_released_at=NOW(), notes=$1 WHERE id=$2",
      [`Paystack transfer: ${transferCode}`, req.params.id]
    );

    res.json({ message: 'Funds disbursed via Paystack Transfer.', transfer_code: transferCode });
  } catch (err) {
    console.error('Fund release error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
},
```

- [ ] **Step 4: Add bank details fields to agent verification form**

In `frontend/src/pages/Dashboard.jsx`, add bank detail fields to the verification form:
```jsx
<div>
  <label style={s.label}>Bank Account Number *</label>
  <input style={s.input} type="text" placeholder="0123456789"
    value={verForm.account_number || ''}
    onChange={e => setVerForm(f => ({...f, account_number: e.target.value}))} />
</div>
<div>
  <label style={s.label}>Bank Code (e.g. 058 for GTBank) *</label>
  <input style={s.input} type="text" placeholder="058"
    value={verForm.bank_code || ''}
    onChange={e => setVerForm(f => ({...f, bank_code: e.target.value}))} />
</div>
<div>
  <label style={s.label}>Account Name</label>
  <input style={s.input} type="text" placeholder="As on bank account"
    value={verForm.account_name || ''}
    onChange={e => setVerForm(f => ({...f, account_name: e.target.value}))} />
</div>
```

Also update `submitVerification` backend handler to save these fields:
```js
await pool.query(`
  UPDATE agent_profiles
  SET nin=$1, agency_name=$2, bio=$3, id_document_url=$4, selfie_url=$5,
      account_number=$6, bank_code=$7, account_name=$8,
      verification_status='pending', updated_at=NOW()
  WHERE user_id=$9
`, [nin, agency_name||null, bio||null, id_document_url, selfie_url,
    req.body.account_number||null, req.body.bank_code||null,
    req.body.account_name||null, req.user.id]);
```

- [ ] **Step 5: Verify Paystack Transfer (staging)**

Enable Paystack test mode. As admin, click "Release Funds" on an `escrow_held` deal with an agent who has bank details. Confirm Paystack dashboard shows a test transfer created.

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/agentAdminController.js backend/config/db.js \
        frontend/src/pages/Dashboard.jsx
git commit -m "feat: real Paystack Transfer API for fund disbursement — create recipient + transfer"
```

---

## Task 11: Listings Pagination

**Files:**
- Modify: `backend/controllers/listingController.js`
- Modify: `frontend/src/pages/Home.jsx`

- [ ] **Step 1: Update listings GET to support pagination**

In `backend/controllers/listingController.js`, find the `getListings` function. Update the query to support `page` and `limit` params:
```js
const getListings = async (req, res) => {
  const { city, state, bedrooms, max_price, swiftshield, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const values = [];
  let where = 'WHERE l.is_available=true';

  if (city)        { values.push(`%${city}%`);       where += ` AND l.city ILIKE $${values.length}`; }
  if (state)       { values.push(`%${state}%`);      where += ` AND l.state ILIKE $${values.length}`; }
  if (bedrooms)    { values.push(parseInt(bedrooms)); where += ` AND l.bedrooms >= $${values.length}`; }
  if (max_price)   { values.push(parseInt(max_price));where += ` AND l.rent_price <= $${values.length}`; }
  if (swiftshield === 'true') { where += ' AND l.is_swiftshield=true'; }

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM listings l ${where}`, values
    );
    const total = parseInt(countResult.rows[0].count);

    values.push(parseInt(limit), offset);
    const result = await pool.query(`
      SELECT l.*, u.full_name AS agent_name, ap.verification_status
      FROM listings l
      JOIN users u ON u.id = l.agent_id
      LEFT JOIN agent_profiles ap ON ap.user_id = l.agent_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `, values);

    res.json({
      listings: result.rows,
      pagination: {
        total,
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
```

- [ ] **Step 2: Update Home.jsx to handle paginated response and show controls**

In `frontend/src/pages/Home.jsx`, update state:
```js
const [listings, setListings]   = useState([]);
const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });
```

Update the fetch:
```js
const fetchListings = (params = {}) => {
  getListings({ ...filters, page: pagination.page, limit: 12, ...params })
    .then(r => {
      setListings(r.data.listings);
      setPagination(r.data.pagination);
    })
    .catch(() => {});
};
```

Make sure `fetchListings` is called with the current page when filters change:
```js
useEffect(() => { fetchListings({ page: 1 }); }, [filters]);
```

Add pagination controls after the listings grid:
```jsx
{pagination.pages > 1 && (
  <div style={{display:'flex', justifyContent:'center', gap:8, marginTop:28}}>
    <button
      disabled={pagination.page <= 1}
      onClick={() => fetchListings({ page: pagination.page - 1 })}
      style={{padding:'8px 18px', borderRadius:8, border:'1px solid #DDD',
              background:'white', cursor:'pointer', fontWeight:700,
              opacity: pagination.page <= 1 ? 0.4 : 1}}
    >
      ← Previous
    </button>
    <span style={{padding:'8px 14px', fontSize:13, color:'#666'}}>
      Page {pagination.page} of {pagination.pages} ({pagination.total} listings)
    </span>
    <button
      disabled={pagination.page >= pagination.pages}
      onClick={() => fetchListings({ page: pagination.page + 1 })}
      style={{padding:'8px 18px', borderRadius:8, border:'1px solid #DDD',
              background:'white', cursor:'pointer', fontWeight:700,
              opacity: pagination.page >= pagination.pages ? 0.4 : 1}}
    >
      Next →
    </button>
  </div>
)}
```

- [ ] **Step 3: Update api.js getListings call**

`getListings` in `api.js` already passes params object: `API.get('/listings', { params })` — no change needed.

- [ ] **Step 4: Verify pagination renders**

Start frontend with at least 13 listings in DB. Confirm pagination controls appear and clicking Next/Previous loads different listings.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/listingController.js frontend/src/pages/Home.jsx
git commit -m "feat: listings pagination — backend LIMIT/OFFSET with total count, frontend prev/next controls"
```

---

## Task 12: Database Indexes

**Files:**
- Modify: `backend/config/db.js`

- [ ] **Step 1: Add indexes migration**

In `backend/config/db.js`, inside the `initDB` function, after the `ALTER TABLE` migration for bank details (added in Task 10), add:

```js
await client.query(`
  CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
  CREATE INDEX IF NOT EXISTS idx_listings_agent_id    ON listings(agent_id);
  CREATE INDEX IF NOT EXISTS idx_listings_city_state  ON listings(city, state);
  CREATE INDEX IF NOT EXISTS idx_listings_available   ON listings(is_available);
  CREATE INDEX IF NOT EXISTS idx_deals_tenant_id      ON deals(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_deals_agent_id       ON deals(agent_id);
  CREATE INDEX IF NOT EXISTS idx_deals_status         ON deals(status);
  CREATE INDEX IF NOT EXISTS idx_messages_deal_id     ON messages(deal_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_agent_id     ON reviews(agent_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
`);
```

- [ ] **Step 2: Restart server and verify**

```bash
node backend/server.js
```
Expected: `✅ All SouthSwift tables initialised` with no index errors.

- [ ] **Step 3: Commit**

```bash
git add backend/config/db.js
git commit -m "perf: add DB indexes on frequently queried columns for listings, deals, messages, reviews"
```

---

## Self-Review Checklist

- [x] Typo fix — Task 1
- [x] Messaging routes wired — Task 2
- [x] Messaging UI on DealDetail — Task 3
- [x] Image upload middleware — Task 4
- [x] Listing image upload (backend + frontend) — Task 5
- [x] Agent document upload (backend + frontend) — Task 6
- [x] Reviews backend (submit, fetch, recalculate rating) — Task 7
- [x] Reviews frontend (rate agent, show on profile) — Task 8
- [x] Dispute resolution admin UI — Task 9
- [x] Real Paystack Transfer fund disbursement — Task 10
- [x] Listings pagination — Task 11
- [x] DB indexes — Task 12

**All items from the completion checklist are covered. No placeholders remain.**
