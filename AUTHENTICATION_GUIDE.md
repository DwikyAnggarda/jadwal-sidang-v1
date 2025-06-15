# Authentication Implementation Guide

## Overview
This document describes the authentication system implemented for the Jadwal Sidang v1 application.

## Backend Implementation

### Dependencies Added
- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT token generation and verification
- `express-rate-limit`: Rate limiting for login attempts

### Files Created/Modified

#### 1. JWT Utilities (`backend/utils/jwt.js`)
- Token generation and verification functions
- Configurable JWT secret and expiration time

#### 2. Authentication Middleware (`backend/middleware/auth.js`)
- `authenticateToken`: Middleware to protect routes
- Validates JWT tokens from Authorization header

#### 3. Authentication Routes (`backend/routes/auth.js`)
- `POST /auth/login`: User login with username/password
- `POST /auth/logout`: User logout (client-side token removal)
- `GET /auth/verify`: Verify token validity
- `GET /auth/me`: Get current user information
- Rate limiting: Max 5 login attempts per 15 minutes per IP

#### 4. Protected API Endpoints (`backend/server.js`)
All existing API endpoints are now protected with `authenticateToken` middleware:
- `/rule/*` - Rule management
- `/dosen/*` - Lecturer management
- `/mahasiswa/*` - Student management
- `/sidang/*` - Defense scheduling
- `/notifications/*` - Notification system
- And all other endpoints

### Database Requirements
The system uses the existing `users` table with:
- `id`: Primary key
- `username`: Unique username
- `password`: Bcrypt hashed password

## Frontend Implementation

### Dependencies
- React with TypeScript
- Axios for API calls
- React Router for routing

### Files Created/Modified

#### 1. Authentication Context (`frontend/src/contexts/AuthContext.tsx`)
- Global authentication state management
- Login/logout functions
- Token persistence in localStorage
- Automatic token verification on app start

#### 2. API Client (`frontend/src/api/axios.ts`)
- Axios instance with JWT token interceptors
- Automatic token attachment to requests
- Error handling for authentication failures

#### 3. Components
- `Login.tsx`: Login form component
- `ProtectedRoute.tsx`: Route wrapper for authenticated routes
- `LoadingSpinner.tsx`: Loading indicator

#### 4. Hooks
- `useAuth.ts`: Custom hook for authentication state

#### 5. Utilities
- `errorHandler.ts`: API error handling utilities

#### 6. Routing (`frontend/src/Router.tsx`)
- Updated to include authentication routes
- Protected all existing routes with `ProtectedRoute`

## Security Features

### Backend Security
1. **Password Hashing**: Bcrypt with salt rounds
2. **JWT Tokens**: Signed with secret key, configurable expiration
3. **Rate Limiting**: Prevents brute force attacks
4. **Route Protection**: All API endpoints require authentication
5. **Token Validation**: Comprehensive token verification

### Frontend Security
1. **Token Storage**: localStorage (can be upgraded to httpOnly cookies)
2. **Automatic Logout**: On token expiration or auth errors
3. **Route Protection**: Unauthenticated users redirected to login
4. **Error Handling**: Graceful handling of auth failures

## Configuration

### Environment Variables
Copy `backend/.env.example` to `backend/.env` and configure:
```bash
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=jadwal_sidang
DB_PASSWORD=your_password
DB_PORT=5432

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=production
```

### Default Users
The system requires users to be created in the database with hashed passwords. Use the provided script:
```bash
cd backend
node setup-users.js
```

## Usage

### Login Process
1. User enters username/password on login form
2. Frontend sends POST request to `/auth/login`
3. Backend validates credentials and returns JWT token
4. Frontend stores token and user data in localStorage
5. Subsequent API requests include token in Authorization header

### Logout Process
1. User clicks logout button
2. Frontend removes token and user data from localStorage
3. User is redirected to login page

### Route Protection
- All routes except `/login` require authentication
- Unauthenticated users are automatically redirected to login
- Invalid/expired tokens trigger automatic logout

## API Endpoints

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/verify` - Verify token
- `GET /auth/me` - Get user info

### Protected Endpoints
All existing API endpoints now require authentication:
- Bearer token in Authorization header
- Format: `Authorization: Bearer <token>`

## Error Handling

### Common Error Responses
- `400`: Bad request (missing fields)
- `401`: Unauthorized (invalid credentials)
- `403`: Forbidden (invalid/expired token)
- `429`: Too many requests (rate limited)
- `500`: Server error

### Frontend Error Handling
- Network errors: Connection problems
- Auth errors: Automatic logout and redirect
- API errors: User-friendly error messages
- Loading states: Spinner during authentication

## Development Notes

### Testing
- Ensure database is running and `users` table exists
- Use provided setup script to create test users
- Test login/logout flow
- Verify route protection works

### Production Deployment
1. Set strong JWT secret in environment variables
2. Use HTTPS for token security
3. Consider httpOnly cookies instead of localStorage
4. Implement refresh token mechanism for longer sessions
5. Set up proper CORS configuration
6. Use environment-specific database credentials

### Security Considerations
- Change default JWT secret before production
- Use strong passwords for user accounts
- Monitor for suspicious login attempts
- Consider implementing session management
- Regular security audits recommended

## Troubleshooting

### Common Issues
1. **Token not included in requests**: Check axios interceptor setup
2. **CORS errors**: Verify backend CORS configuration
3. **Database connection**: Check environment variables
4. **JWT errors**: Verify secret key consistency
5. **Route protection not working**: Check ProtectedRoute implementation

### Debug Tips
- Check browser console for error messages
- Verify token exists in localStorage
- Check network tab for API requests
- Monitor backend logs for authentication errors
