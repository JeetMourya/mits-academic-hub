# MITS Academic Hub - Quick Reference Card

## 🚀 Quick Start (5 minutes)

```bash
# 1. Install & Configure
npm install
cp .env.example .env
# Edit .env with MongoDB URI & JWT secrets

# 2. Create Admin
# (Run in Node REPL or database)
const Admin = require('./api/models/Admin');
await Admin.create({
  name: 'Admin', email: 'admin@test.com', 
  password: 'Pass123!', role: 'super_admin',
  permissions: ['manage_semesters', 'manage_results', 'manage_users', 'view_analytics']
});

# 3. Start Server
npm run dev

# 4. Access
# - Student: http://localhost:3000
# - Admin: http://localhost:3000/admin
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `api/server.js` | Backend entry point |
| `api/models/` | Database schemas |
| `api/routes/` | API endpoints |
| `admin/index.html` | Admin portal |
| `index.html` | Student portal |
| `js/api-client.js` | API client |
| `.env.example` | Configuration template |

---

## 🔑 Environment Variables

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=random_32_chars_minimum
JWT_REFRESH_SECRET=different_random_32_chars
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
PORT=3000
```

---

## 📊 API Endpoints Cheat Sheet

### Auth
```
POST /api/auth/login              {email, password}
POST /api/auth/logout
POST /api/auth/refresh            {refreshToken}
GET  /api/auth/verify
```

### Results
```
POST /api/results/fetch           {enrollmentNumber, semesterId}
GET  /api/results/semesters
```

### Admin
```
GET  /api/admin/profile
PUT  /api/admin/profile           {name, phone}
GET  /api/admin/semesters
POST /api/admin/semesters         {name, semesterNumber, resultUrl}
GET  /api/admin/activity-logs
```

### Students
```
GET  /api/students?limit=50&skip=0&search=MT
GET  /api/students/:enrollmentNumber
DELETE /api/students/:id
```

---

## 🧪 Test API with curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Pass123!"}'

# Response includes: accessToken & refreshToken

# Fetch Results
curl -X POST http://localhost:3000/api/results/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentNumber":"MT22PCS001",
    "semesterId":"507f1f77bcf86cd799439011"
  }'
```

---

## 🔐 Security Checklist

- ✅ No credentials in code
- ✅ Passwords hashed (bcryptjs)
- ✅ JWT tokens signed
- ✅ Rate limiting enabled
- ✅ CORS configured
- ✅ Input sanitized
- ✅ Helmet headers active
- ✅ Activity logging enabled

---

## 🚀 Deploy to Vercel

```bash
vercel login
vercel --prod
```

Set env vars in Vercel dashboard:
- MONGODB_URI
- JWT_SECRET
- JWT_REFRESH_SECRET
- CORS_ORIGIN (your domain)

---

## 📱 Project Structure

```
api/              ← Backend
├── server.js
├── models/       ← Database schemas
├── routes/       ← API endpoints
├── middleware/   ← Auth & security
└── utils/        ← Helpers

js/               ← Frontend
├── api-client.js ← API communication
├── app.js        ← Main logic
└── ...

admin/            ← Admin Portal
└── index.html    ← SaaS Dashboard

index.html        ← Student Portal
```

---

## 🎯 Common Tasks

### Add New Semester
```
Admin Portal → Semesters → + New Semester
Fill form & submit
```

### Fetch Student Results
```
Student Portal → Results
Enter enrollment number
Select semester
Click "Check Results"
```

### View Activity Logs
```
Admin Portal → Activity → View all logs
```

### Create New Admin
```javascript
const Admin = require('./api/models/Admin');
await Admin.create({...});
```

---

## 🐛 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| MongoDB connection error | Check MONGODB_URI in .env |
| Admin login fails | Verify admin account exists in DB |
| Results not fetching | Check IUMS URLs are accessible |
| CORS error | Add domain to CORS_ORIGIN in .env |
| Port 3000 in use | Change PORT in .env or kill process |
| Token expired | Refresh token or login again |

---

## 📚 Documentation

- **README.md** - Overview
- **SETUP.md** - Installation
- **API_REFERENCE.md** - All endpoints
- **DEPLOYMENT.md** - Vercel guide
- **IMPLEMENTATION_SUMMARY.md** - What's built

---

## 💡 Tips

1. Use `.env` for local config, never commit it
2. Generate strong JWT secrets: `openssl rand -hex 32`
3. Always use HTTPS in production
4. Keep MongoDB backups
5. Monitor rate limits in logs
6. Clear browser cache if login issues
7. Test admin features before production
8. Document custom IUMS parsing rules

---

## 📞 Support

Issues? Check these files:
1. Console errors (browser DevTools)
2. Server logs (terminal)
3. SETUP.md (troubleshooting section)
4. API_REFERENCE.md (endpoint help)

---

## ✨ Features Checklist

- ✅ Student can fetch results
- ✅ No redirects to IUMS
- ✅ Admin dashboard works
- ✅ JWT authentication
- ✅ Role-based access
- ✅ Semester management
- ✅ Activity logging
- ✅ Mobile responsive
- ✅ Dark theme
- ✅ Production-ready

---

**Status: READY TO DEPLOY** 🚀

For detailed info: See README.md & SETUP.md
