# Email Setup Guide

## Option 1: Backend API (Recommended for Production)

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Start Backend Server
```bash
npm start
```

The server will run on `http://localhost:3000`

### Step 3: Configure Frontend

#### For Android Emulator:
- Use: `http://10.0.2.2:3000`

#### For iOS Simulator:
- Use: `http://localhost:3000`

#### For Physical Device:
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
2. Use: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

#### Set Environment Variable:
Create a `.env` file in the root directory:
```
EXPO_PUBLIC_EMAIL_API_URL=http://YOUR_IP_ADDRESS:3000
```

Or update directly in `utils/email.ts`:
```typescript
const EMAIL_API_URL = 'http://192.168.1.100:3000';
```

### Step 4: Test
1. Start backend: `cd backend && npm start`
2. Start Expo app: `npm start`
3. Try logging in - email should be sent!

## Option 2: Deploy Backend (Production)

Deploy the backend to:
- **Heroku**: Free tier available
- **Railway**: Easy deployment
- **Vercel**: Serverless functions
- **DigitalOcean**: Full control

Then update `EXPO_PUBLIC_EMAIL_API_URL` to your deployed URL.

## Troubleshooting

### Backend not connecting?
1. Check if backend is running: `curl http://localhost:3000/health`
2. Check firewall settings
3. For device: Ensure phone and computer are on same WiFi network
4. Check console logs for connection errors

### Email not sending?
1. Verify SMTP credentials in `backend/email-api.js`
2. Check Gmail App Password (not regular password)
3. Check backend logs for SMTP errors
4. Verify email address is correct

### Gmail App Password Setup:
1. Go to Google Account Settings
2. Security → 2-Step Verification → App Passwords
3. Generate app password for "Mail"
4. Use that password in backend config

