# MITS Academic Hub - Full Stack Edition 🎓

Professional, production-ready full-stack SaaS platform for MITS Gwalior students and administrators.

## ✨ Features

### For Students
- 🔍 Search semester results without leaving the platform
- 📊 Beautiful result dashboard with SGPA/CGPA display
- 📚 Subject-wise grades and performance tracking
- 🔄 Search history tracking
- 🧮 Academic calculators (SGPA, CGPA, percentage)
- 📱 Mobile-optimized responsive design
- 🎨 Dark theme with premium UI

### For Admins
- 🔐 Secure JWT-based authentication
- 📋 Semester management (create, update, disable)
- 👥 Student management interface
- 📊 Analytics & activity logs
- 🔗 Result URL management
- ⚙️ Settings & profile management
- 🛡️ Role-based access control (RBAC)
- 🔒 Account lockout after failed attempts

### Security
- ✅ End-to-end encrypted passwords (bcrypt)
- ✅ JWT token-based authentication
- ✅ Rate limiting (100 requests/15 min)
- ✅ CORS protection
- ✅ CSRF protection ready
- ✅ XSS prevention via mongo-sanitize
- ✅ Input validation & sanitization
- ✅ Security headers via Helmet.js
- ✅ SQL injection prevention
- ✅ No credentials in frontend code

### Infrastructure
- ✅ Node.js + Express backend
- ✅ MongoDB Atlas cloud database
- ✅ Vercel serverless deployment
- ✅ CI/CD ready
- ✅ Environment-based configuration
- ✅ Comprehensive error handling
- ✅ Activity logging & auditing
- ✅ Graceful error recovery

---

## 📁 Project Structure

```
MITS-ACADEMIC-HUB/
├── api/
│   ├── server.js                 # Express server entry point
│   ├── models/
│   │   ├── Admin.js              # Admin user model
│   │   ├── Student.js            # Student model
│   │   ├── Semester.js           # Semester config model
│   │   └── ActivityLog.js        # Activity logging model
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── results.js            # Results fetching routes
│   │   ├── admin.js              # Admin management routes
│   │   ├── students.js           # Student management routes
│   │   └── semesters.js          # Semester routes
│   ├── middleware/
│   │   └── auth.js               # JWT auth middleware
│   └── utils/
│       └── ResultFetcher.js      # IUMS result scraper
├── admin/
│   └── index.html                # Admin portal UI
├── css/
│   ├── style.css                 # Main styles
│   ├── admin-dashboard.css       # Admin portal styles
│   └── admin-dashboard.js        # Admin portal logic
├── js/
│   ├── api-client.js             # API client library
│   ├── frontend-integration.js   # Frontend-API bridge
│   ├── app.js                    # Main app logic
│   ├── sgpa.js                   # SGPA calculator
│   ├── cgpa.js                   # CGPA calculator
│   ├── theme.js                  # Dark/light theme
│   ├── history.js                # Search history
│   ├── admin.js                  # Admin UI (old, can remove)
│   └── admin-auth.js             # Admin auth (old, can remove)
├── assets/                       # Images, icons, etc.
├── data/                         # Static data files
├── tests/                        # Test files
├── index.html                    # Student portal
├── package.json                  # Dependencies
├── .env.example                  # Environment template
├── vercel.json                   # Vercel configuration
├── SETUP.md                      # Installation guide
├── API_REFERENCE.md              # API documentation
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (Local or Atlas)
- npm/yarn

### Installation

1. **Clone repository**
```bash
git clone https://github.com/yourusername/mits-academic-hub.git
cd mits-academic-hub
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development server**
```bash
npm run dev
```

5. **Access**
- Student Portal: http://localhost:3000
- Admin Portal: http://localhost:3000/admin
- API: http://localhost:3000/api

---

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Detailed installation & deployment guide
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API endpoint documentation

---

## 🔧 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT + bcryptjs
- **Security**: Helmet, CORS, Rate Limiting
- **HTTP Client**: Axios
- **Web Scraping**: Cheerio

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Custom properties, Grid, Flexbox
- **Vanilla JavaScript**: No framework dependencies
- **Responsive**: Mobile-first design

### Deployment
- **Platform**: Vercel
- **Version Control**: Git/GitHub
- **Environment**: .env configuration

---

## 🔐 Security Features

| Feature | Implementation |
|---------|-----------------|
| Password Hashing | bcryptjs (10 salt rounds) |
| Authentication | JWT tokens (7d access, 30d refresh) |
| Authorization | Role-based access control (RBAC) |
| Rate Limiting | 100 requests per 15 minutes |
| CORS | Configurable origin whitelist |
| Input Validation | Server-side sanitization |
| XSS Prevention | mongo-sanitize, DOMPurify ready |
| CSRF Protection | Token support ready |
| Security Headers | Helmet.js (CSP, HSTS, etc.) |
| Account Lockout | 5 failed attempts → 2-hour lock |
| Activity Logging | All admin actions tracked |

---

## 📊 API Overview

### Authentication
```
POST   /api/auth/login          → Admin login
POST   /api/auth/logout         → Admin logout
POST   /api/auth/refresh        → Refresh token
GET    /api/auth/verify         → Verify token
```

### Results
```
POST   /api/results/fetch       → Fetch student results
GET    /api/results/semesters   → Get available semesters
```

### Admin
```
GET    /api/admin/profile       → Get admin profile
PUT    /api/admin/profile       → Update profile
GET    /api/admin/semesters     → List semesters
POST   /api/admin/semesters     → Create semester
PUT    /api/admin/semesters/:id → Update semester
DELETE /api/admin/semesters/:id → Delete semester
GET    /api/admin/activity-logs → View activity logs
```

### Students (Admin)
```
GET    /api/students            → List all students
GET    /api/students/:id        → Get student details
DELETE /api/students/:id        → Delete student
```

For complete API reference, see **[API_REFERENCE.md](API_REFERENCE.md)**

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy with one click

```bash
vercel --prod
```

See **[SETUP.md](SETUP.md)** for detailed deployment steps.

---

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## 🐛 Troubleshooting

### Can't connect to MongoDB
- Verify connection string in `.env`
- Check MongoDB is running
- Whitelist your IP on MongoDB Atlas

### Admin login fails
- Verify admin account exists
- Check password is correct
- Clear browser cache

### Results not fetching
- Verify IUMS URLs are accessible
- Check network tab for errors
- Verify enrollment number format

See **[SETUP.md](SETUP.md#troubleshooting)** for more help.

---

## 📝 Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# JWT
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Server
NODE_ENV=production
PORT=3000

# IUMS
IUMS_BASE_URL=https://iums.mitsgwalior.in
IUMS_FETCH_TIMEOUT=10000

# CORS
CORS_ORIGIN=https://yourdomain.com

# URLs
FRONTEND_URL=https://yourdomain.com
```

Full template: [.env.example](.env.example)

---

## 📦 Dependencies

### Backend
- express (4.18.2)
- mongoose (7.5.0)
- jsonwebtoken (9.1.0)
- bcryptjs (2.4.3)
- helmet (7.0.0)
- cors (2.8.5)
- axios (1.5.0)
- cheerio (1.0.0-rc.12)
- And more...

### Frontend
- No dependencies! Pure vanilla JavaScript

See [package.json](package.json) for complete list.

---

## 📄 License

Proprietary - MITS Academic Hub
Developed for MITS Gwalior Students

---

## 👨‍💻 Contributing

Contributions welcome! Please:
1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📧 Support

- **Issues**: GitHub Issues
- **Email**: support@mitshub.com
- **Documentation**: See SETUP.md & API_REFERENCE.md

---

## 🎯 Roadmap

- [ ] Student mobile app (React Native)
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] Advanced analytics dashboard
- [ ] Performance optimizations
- [ ] Automated testing suite
- [ ] API rate limiting per user
- [ ] Integration with university ERP
- [ ] Result prediction AI
- [ ] Semester planning assistant

---

## ✅ Checklist for Production

- [ ] All environment variables configured
- [ ] MongoDB connection tested
- [ ] JWT secrets generated & rotated
- [ ] CORS origins configured
- [ ] Admin account created
- [ ] Initial semesters added
- [ ] Security headers tested
- [ ] Rate limiting verified
- [ ] Activity logging confirmed
- [ ] Backups configured
- [ ] Monitoring & alerts set
- [ ] Documentation reviewed
- [ ] Team trained
- [ ] Deployment tested

---

Made with ❤️ for MITS Gwalior Students
