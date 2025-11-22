# Backend Email API Setup

## Quick Start

1. **Navigate to backend folder:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the server:**
```bash
npm start
```

The server will run on `http://localhost:3000`

## For Development (with auto-reload):

```bash
npm run dev
```

## Verify Backend is Running

1. Check if server is running:
   - You should see: `Email API server running on port 3000`
   - You should see: `SMTP Server is ready to send emails`

2. Test the health endpoint:
   - Open browser: `http://localhost:3000/health`
   - Should return: `{"status":"ok"}`

## Troubleshooting

### OTP Not Arriving?

1. **Check if backend is running:**
   - Look for logs: `Email API server running on port 3000`
   - If not running, start it with `npm start`

2. **Check SMTP credentials:**
   - Verify `MAIL_USERNAME` and `MAIL_PASSWORD` in `email-api.js`
   - Make sure Gmail app password is correct (not regular password)

3. **Check app configuration:**
   - In `utils/email.ts`, make sure `EXPO_PUBLIC_EMAIL_API_URL` points to:
     - Local: `http://localhost:3000`
     - Or your deployed backend URL

4. **Check console logs:**
   - Backend should show: `Email sent: [messageId]`
   - If error, check the error message

### Common Issues

**Issue**: "Cannot find module 'express'"
- **Fix**: Run `npm install` in the backend folder

**Issue**: "SMTP Error"
- **Fix**: Check Gmail app password is correct
- **Fix**: Make sure 2-factor authentication is enabled on Gmail

**Issue**: "Connection refused"
- **Fix**: Make sure backend server is running
- **Fix**: Check if port 3000 is available

## Production Deployment

For production, deploy the backend to:
- Heroku
- Vercel
- AWS
- Or any Node.js hosting service

Then update `EXPO_PUBLIC_EMAIL_API_URL` in your app to point to the deployed URL.

