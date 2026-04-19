# 🛡️ SouthSwift Enterprise

**Nigeria's Verified Property Transaction Platform**

> Escrow payments · Verified agents · Auto-generated legal agreements · Free in-app legal counsel

---

## 📁 Project Structure

```
southswift/
├── backend/          ← Node.js + Express + PostgreSQL
└── frontend/         ← React.js
```

---

## 🚀 HOW TO PUT THIS ON GITHUB (Step by Step)

### Step 1 — Install Git on your computer
If you don't have Git installed:
- **Windows**: Download from https://git-scm.com/download/win
- **Mac**: Run `xcode-select --install` in Terminal

### Step 2 — Create a GitHub repository
1. Go to https://github.com
2. Click the **+** button → **New repository**
3. Name it: `southswift`
4. Set to **Private** (important — this is your codebase)
5. Do NOT tick "Add README" — we already have one
6. Click **Create repository**

### Step 3 — Open your Terminal/Command Prompt
Navigate to where you saved this project folder:
```bash
cd path/to/southswift
```

### Step 4 — Initialise and push to GitHub
Copy and run these commands one by one:
```bash
git init
git add .
git commit -m "Initial SouthSwift MVP commit — all files"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/southswift.git
git push -u origin main
```
Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

### Step 5 — Verify
Go to https://github.com/YOUR_USERNAME/southswift
You should see all the files there. ✅

---

## ⚙️ SETUP INSTRUCTIONS

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values (see below)
node server.js
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Fill in REACT_APP_API_URL
npm start
```

---

## 🔑 ENVIRONMENT VARIABLES TO FILL IN

### Backend `.env`
| Variable | Where to Get It |
|---|---|
| `DATABASE_URL` | Supabase.com → New Project → Connection String |
| `JWT_SECRET` | Make up any long random string |
| `PAYSTACK_SECRET_KEY` | paystack.com → Settings → API Keys |
| `PAYSTACK_PUBLIC_KEY` | paystack.com → Settings → API Keys |
| `CLOUDINARY_CLOUD_NAME` | cloudinary.com → Dashboard |
| `CLOUDINARY_API_KEY` | cloudinary.com → Dashboard |
| `CLOUDINARY_API_SECRET` | cloudinary.com → Dashboard |
| `SIGNOVA_API_KEY` | From Signova CEO — fill in when provided |
| `EMAIL_USER` | ceo@southswift.com.ng |
| `EMAIL_PASS` | Your Yandex 360 email password |

### Frontend `.env`
| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | In development: `http://localhost:5000/api` · In production: your Render URL |

---

## 🌐 FREE HOSTING DEPLOYMENT

### Database — Supabase (Free)
1. Go to https://supabase.com
2. Create new project → name it `southswift`
3. Go to Settings → Database → Connection String
4. Copy the URI and paste into backend `.env` as `DATABASE_URL`

### Backend — Render (Free)
1. Go to https://render.com
2. Connect your GitHub account
3. New → Web Service → Select your `southswift` repo
4. Root Directory: `backend`
5. Build Command: `npm install`
6. Start Command: `node server.js`
7. Add all environment variables from your `.env`
8. Deploy — you'll get a URL like `https://southswift-api.onrender.com`

### Frontend — Vercel (Free)
1. Go to https://vercel.com
2. Connect your GitHub account
3. Import your `southswift` repo
4. Root Directory: `frontend`
5. Set environment variable: `REACT_APP_API_URL` = your Render URL + `/api`
6. Deploy — you'll get a URL like `https://southswift.vercel.app`

### Point Your Truehost Domain to Vercel
1. Login to Truehost
2. Go to DNS Management for southswift.com.ng
3. Add CNAME record:
   - Name: `@` or `www`
   - Value: `cname.vercel-dns.com`
4. In Vercel → your project → Settings → Domains
5. Add `southswift.com.ng` → Vercel verifies automatically

---

## 🔗 API ENDPOINTS SUMMARY

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Listings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/listings` | All listings (with filters) |
| GET | `/api/listings/:id` | Single listing |
| POST | `/api/listings` | Create listing (agents only) |
| PUT | `/api/listings/:id` | Update listing |

### Deals (SwiftShield)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/deals/initiate` | Start escrow deal |
| GET | `/api/payments/verify/:ref` | Verify Paystack payment |
| POST | `/api/deals/:id/confirm-movein` | Tenant confirms move-in |
| POST | `/api/deals/:id/dispute` | Raise dispute |
| GET | `/api/deals/my` | User's deals |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Stats |
| GET | `/api/admin/agents/pending` | Agents awaiting verification |
| PUT | `/api/admin/agents/:id/verify` | Verify or reject agent |
| GET | `/api/admin/deals` | All deals |
| PUT | `/api/admin/deals/:id/release-funds` | Release escrow funds |

---

## 🤝 SIGNOVA SWIFTDOC INTEGRATION

When the Signova CEO provides the API key and documentation:

1. Open `backend/controllers/swiftdocController.js`
2. Set `SIGNOVA_API_KEY` in your `.env`
3. Update the `generateSwiftDoc` function with the exact Signova endpoint and payload format
4. The rest of the escrow flow will automatically attach the document

---

## 👑 ADMIN LOGIN

Default admin account created automatically on first run:
- **Email**: `ceo@southswift.com.ng`
- **Password**: `SouthSwift@Admin2024`

⚠️ **Change this password immediately after first login.**

---

## 📞 SUPPORT

**Oladeji Ayeni Joshua** — CEO & Founder  
ceo@southswift.com.ng · +234 816 818 5692 · southswift.com.ng

*SouthSwift Enterprise — CAC BN 7310264*
