# MITS Academic Hub - Full Stack Installation Guide

## Phase 1: Local Development Setup

### 1. Prerequisites
- Node.js 18+ 
- MongoDB (Local or Atlas)
- Git
- npm or yarn

### 2. Clone & Install Dependencies

```bash
cd MITS-ACADEMIC-HUB
npm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/mits_hub
# or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mits_hub

# JWT Secrets (Generate new secure random strings)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
JWT_REFRESH_SECRET=your_refresh_secret_key_minimum_32_characters_long

# Server
NODE_ENV=development
PORT=3000

# IUMS Configuration
IUMS_BASE_URL=https://iums.mitsgwalior.in
IUMS_FETCH_TIMEOUT=10000

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8080

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 4. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**MongoDB Atlas:**
- Create cluster at https://www.mongodb.com/cloud/atlas
- Get connection string
- Add to .env

### 5. Start Development Server

```bash
npm run dev
```

Server runs on: http://localhost:3000

### 6. Create Admin Account

Run in Node REPL or create a script:

```javascript
const mongoose = require('mongoose');
const Admin = require('./api/models/Admin');
require('dotenv').config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const admin = await Admin.create({
    name: 'System Admin',
    email: 'admin@mitshub.com',
    password: 'SecurePassword123!',
    role: 'super_admin',
    permissions: [
      'manage_semesters',
      'manage_results',
      'manage_users',
      'view_analytics',
      'manage_admins',
      'manage_settings',
    ],
  });

  console.log('Admin created:', admin.email);
  process.exit(0);
}

createAdmin().catch(console.error);
```

### 7. Access the Application

- **Student Portal:** http://localhost:3000
- **Admin Portal:** http://localhost:3000/admin
- **API Docs:** http://localhost:3000/api/

---

## Phase 2: Database Setup

### MongoDB Collections

The following collections are automatically created:

- **admins** - Admin user accounts with roles & permissions
- **students** - Student records with search history
- **semesters** - Semester configurations & result URLs
- **resultlogs** - Activity logs for auditing
- **activitylogs** - System activity tracking

### Initial Data

Create a seeding script if needed:

```javascript
const Semester = require('./api/models/Semester');

async function seedSemesters() {
  const semesters = [
    {
      name: 'Semester 5',
      semesterNumber: 5,
      resultUrl: 'ViewSC.aspx?did=5&sid=2024',
      description: 'Autumn 2024',
      isActive: true,
    },
    {
      name: 'Semester 6',
      semesterNumber: 6,
      resultUrl: 'ViewSC.aspx?did=6&sid=2024',
      description: 'Spring 2025',
      isActive: true,
    },
  ];

  await Semester.insertMany(semesters);
  console.log('Semesters seeded');
}
```

---

## Phase 3: Frontend Integration

The frontend automatically connects to the API:

### Update Frontend Config (if needed)

Edit `js/api-client.js`:

```javascript
this.baseURL = 'http://localhost:3000/api'; // for dev
// or for production
this.baseURL = 'https://yourdomain.com/api';
```

---

## Phase 4: Vercel Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Full-stack MITS Academic Hub"
git branch -M main
git remote add origin https://github.com/yourusername/mits-academic-hub.git
git push -u origin main
```

### 2. Create Vercel Project

```bash
npm install -g vercel
vercel login
vercel
```

### 3. Configure Environment Variables in Vercel

In Vercel Dashboard → Settings → Environment Variables:

```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/mits_hub
JWT_SECRET = (generate random 32+ char string)
JWT_REFRESH_SECRET = (generate random 32+ char string)
NODE_ENV = production
CORS_ORIGIN = https://yourdomain.com,https://www.yourdomain.com
IUMS_BASE_URL = https://iums.mitsgwalior.in
FRONTEND_URL = https://yourdomain.com
```

### 4. Deploy

```bash
vercel --prod
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/verify` - Verify token

### Results (Public)
- `POST /api/results/fetch` - Fetch student results
- `GET /api/results/semesters` - Get all semesters

### Admin
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update admin profile
- `GET /api/admin/semesters` - Get all semesters (admin)
- `POST /api/admin/semesters` - Create semester
- `PUT /api/admin/semesters/:id` - Update semester
- `DELETE /api/admin/semesters/:id` - Delete semester
- `GET /api/admin/activity-logs` - View activity logs

### Students
- `GET /api/students` - List students (admin)
- `GET /api/students/:enrollmentNumber` - Get student details
- `DELETE /api/students/:id` - Delete student

---

## Security Checklist

- ✅ All credentials in `.env` file
- ✅ JWT tokens for authentication
- ✅ Bcrypt password hashing
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Helmet headers
- ✅ Input validation & sanitization
- ✅ XSS protection via mongo-sanitize
- ✅ CSRF protection ready (add tokens if needed)
- ✅ Role-based access control (RBAC)

---

## Troubleshooting

### Cannot connect to MongoDB
- Check MONGODB_URI is correct
- Ensure MongoDB is running
- Check IP whitelist on Atlas

### Admin login fails
- Verify admin account exists in database
- Check email & password are correct
- Clear browser cache & localStorage

### Results not fetching
- Verify IUMS URLs are accessible
- Check network requests in browser DevTools
- Ensure CORS is configured

### Frontend can't reach API
- Check API server is running
- Verify CORS_ORIGIN includes frontend URL
- Check browser console for errors

---

## Production Deployment Checklist

- [ ] Generate new JWT_SECRET and JWT_REFRESH_SECRET
- [ ] Configure MongoDB Atlas with proper IP whitelist
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ORIGIN with actual domain
- [ ] Set up custom domain on Vercel
- [ ] Configure SSL/TLS certificate
- [ ] Set up monitoring & logging
- [ ] Create backup strategy for MongoDB
- [ ] Document API for team
- [ ] Set up CI/CD pipeline

---

## Next Steps

1. Test all API endpoints with Postman/Insomnia
2. Create comprehensive API documentation
3. Add email notifications for admins
4. Implement two-factor authentication
5. Add analytics dashboard
6. Create student mobile app
7. Set up automated testing
