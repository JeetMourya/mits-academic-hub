# MITS Academic Hub - API Reference

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://yourdomain.com/api`

## Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### 1. Login

**POST** `/auth/login`

Login with email and password to get JWT tokens.

**Request:**
```json
{
  "email": "admin@mitshub.com",
  "password": "SecurePassword123!"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "name": "System Admin",
      "email": "admin@mitshub.com",
      "role": "super_admin",
      "permissions": [
        "manage_semesters",
        "manage_results",
        "manage_users",
        "view_analytics",
        "manage_admins",
        "manage_settings"
      ]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 2. Refresh Token

**POST** `/auth/refresh`

Get a new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 3. Logout

**POST** `/auth/logout` ✅ **Protected**

Invalidate current session.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 4. Verify Token

**GET** `/auth/verify` ✅ **Protected**

Verify current JWT token and get admin info.

**Response:**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "507f1f77bcf86cd799439011",
      "name": "System Admin",
      "email": "admin@mitshub.com",
      "role": "super_admin",
      "permissions": ["manage_semesters", "manage_results", "manage_users", "view_analytics", "manage_admins", "manage_settings"]
    }
  }
}
```

---

## Results Endpoints

### 1. Fetch Results

**POST** `/results/fetch`

Fetch student results from IUMS and display in dashboard.

**Request:**
```json
{
  "enrollmentNumber": "MT22PCS001",
  "semesterId": "507f1f77bcf86cd799439011"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Result fetched successfully",
  "data": {
    "studentName": "John Doe",
    "enrollmentNumber": "MT22PCS001",
    "semester": 5,
    "sgpa": 8.5,
    "status": "Pass",
    "subjects": [
      {
        "code": "CS501",
        "name": "Data Structures",
        "grade": "A",
        "credits": 4,
        "gpa": 4.0
      },
      {
        "code": "CS502",
        "name": "Database Systems",
        "grade": "A-",
        "credits": 4,
        "gpa": 3.7
      }
    ],
    "fetchedAt": "2024-06-06T11:46:57.485+05:30"
  }
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Results not found for this enrollment number",
  "code": "NOT_FOUND"
}
```

---

### 2. Get Semesters

**GET** `/results/semesters`

Get all active semesters for result fetching.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Semester 5",
      "semesterNumber": 5,
      "resultUrl": "ViewSC.aspx?did=5&sid=2024",
      "description": "Autumn 2024"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Semester 6",
      "semesterNumber": 6,
      "resultUrl": "ViewSC.aspx?did=6&sid=2024",
      "description": "Spring 2025"
    }
  ]
}
```

---

## Admin Endpoints

### 1. Get Profile

**GET** `/admin/profile` ✅ **Protected**

Get current admin's profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "System Admin",
    "email": "admin@mitshub.com",
    "role": "super_admin",
    "permissions": ["manage_semesters", "manage_results", "manage_users", "view_analytics", "manage_admins", "manage_settings"],
    "isActive": true,
    "lastLogin": "2024-06-06T11:46:57.485Z",
    "createdAt": "2024-01-15T10:20:30Z"
  }
}
```

---

### 2. Update Profile

**PUT** `/admin/profile` ✅ **Protected**

Update admin profile information.

**Request:**
```json
{
  "name": "Updated Name",
  "phone": "+91-9999999999"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Updated Name",
    "email": "admin@mitshub.com",
    "phone": "+91-9999999999"
  }
}
```

---

## Semester Management

### 1. Get All Semesters

**GET** `/admin/semesters` ✅ **Protected** (Requires: `manage_semesters`)

Get all semesters (active and inactive).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Semester 5",
      "semesterNumber": 5,
      "resultUrl": "ViewSC.aspx?did=5&sid=2024",
      "urlTemplate": "{ENROLLMENT}",
      "isActive": true,
      "description": "Autumn 2024",
      "resultsFetched": 245,
      "createdBy": "507f1f77bcf86cd799439010",
      "createdAt": "2024-01-15T10:20:30Z",
      "updatedAt": "2024-06-06T11:46:57Z"
    }
  ]
}
```

---

### 2. Create Semester

**POST** `/admin/semesters` ✅ **Protected** (Requires: `manage_semesters`)

Create a new semester configuration.

**Request:**
```json
{
  "name": "Semester 5",
  "semesterNumber": 5,
  "resultUrl": "ViewSC.aspx?did=5&sid=2024",
  "description": "Autumn 2024",
  "startDate": "2024-08-01",
  "endDate": "2024-12-31"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Semester created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Semester 5",
    "semesterNumber": 5,
    "resultUrl": "ViewSC.aspx?did=5&sid=2024",
    "isActive": true,
    "createdAt": "2024-06-06T11:46:57Z"
  }
}
```

---

### 3. Update Semester

**PUT** `/admin/semesters/:id` ✅ **Protected** (Requires: `manage_semesters`)

Update semester configuration.

**Request:**
```json
{
  "name": "Semester 5 (Updated)",
  "resultUrl": "ViewSC.aspx?did=5&sid=2024",
  "isActive": true,
  "description": "Autumn 2024 - Updated"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Semester updated successfully",
  "data": { ... }
}
```

---

### 4. Delete Semester

**DELETE** `/admin/semesters/:id` ✅ **Protected** (Requires: `manage_semesters`)

Delete a semester.

**Response:**
```json
{
  "success": true,
  "message": "Semester deleted successfully"
}
```

---

## Students Endpoints

### 1. Get Students List

**GET** `/students?limit=50&skip=0&search=MT22` ✅ **Protected** (Requires: `manage_users`)

Get paginated list of students with optional search.

**Query Parameters:**
- `limit` (default: 50) - Results per page
- `skip` (default: 0) - Pagination offset
- `search` - Search by enrollment number, name, or email

**Response:**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "enrollmentNumber": "MT22PCS001",
        "name": "John Doe",
        "email": "john@example.com",
        "department": "Computer Science",
        "semester": 5,
        "searchHistory": [
          {
            "semesterId": "507f1f77bcf86cd799439012",
            "semesterName": "Semester 5",
            "fetchedAt": "2024-06-06T11:46:57Z"
          }
        ],
        "lastResultFetch": "2024-06-06T11:46:57Z",
        "createdAt": "2024-01-15T10:20:30Z"
      }
    ],
    "pagination": {
      "total": 450,
      "limit": 50,
      "skip": 0
    }
  }
}
```

---

### 2. Get Student Details

**GET** `/students/:enrollmentNumber` ✅ **Protected**

Get complete student record including all results.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "enrollmentNumber": "MT22PCS001",
    "name": "John Doe",
    "email": "john@example.com",
    "results": [
      {
        "semesterNumber": 5,
        "sgpa": 8.5,
        "subjects": [
          {
            "code": "CS501",
            "name": "Data Structures",
            "grade": "A",
            "credits": 4,
            "gpa": 4.0
          }
        ],
        "fetchedAt": "2024-06-06T11:46:57Z"
      }
    ],
    "searchHistory": [...]
  }
}
```

---

### 3. Delete Student

**DELETE** `/students/:id` ✅ **Protected** (Requires: `manage_users`)

Delete a student record.

**Response:**
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

---

## Activity Logs

### Get Activity Logs

**GET** `/admin/activity-logs?limit=50&skip=0` ✅ **Protected** (Requires: `view_analytics`)

Get system activity logs.

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "type": "admin_login",
        "adminId": "507f1f77bcf86cd799439010",
        "adminEmail": "admin@mitshub.com",
        "description": null,
        "details": {},
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "status": "success",
        "createdAt": "2024-06-06T11:46:57Z"
      }
    ],
    "pagination": {
      "total": 1250,
      "limit": 50,
      "skip": 0
    }
  }
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

All API endpoints are rate limited:
- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Testing with curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mitshub.com","password":"SecurePassword123!"}'

# Fetch results
curl -X POST http://localhost:3000/api/results/fetch \
  -H "Content-Type: application/json" \
  -d '{"enrollmentNumber":"MT22PCS001","semesterId":"507f1f77bcf86cd799439011"}'

# Get profile (Protected)
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

