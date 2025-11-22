# Email API Backend

This backend service handles email sending for the Peregrine app.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set environment variables (optional, defaults are provided):
```bash
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=wasieacuna@gmail.com
export MAIL_PASSWORD=agozivjqavbvtgti
export MAIL_FROM_ADDRESS=fromadmin@gmail.com
export MAIL_FROM_NAME=Peregrine Admin
export PORT=3000
```

3. Run the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### POST /api/send-email
Sends an email via SMTP.

**Request Body:**
```json
{
  "to": "user@example.com",
  "subject": "Email Subject",
  "text": "Plain text content",
  "html": "<h1>HTML content</h1>"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "message-id"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Configuration

Update `utils/email.ts` in the main app to point to your backend URL:
- Local: `http://localhost:3000`
- Production: `https://your-backend-domain.com`

