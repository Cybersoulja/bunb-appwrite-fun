# Authentication & Security Guide

This document covers user authentication, rate limiting, and security features of the AI Code Generator.

## Authentication Methods

The function supports three authentication methods:

### 1. **Appwrite User Authentication** (Recommended)

When users are authenticated through Appwrite, their user ID is automatically injected into function requests.

**How it works:**
- Appwrite automatically adds `x-appwrite-user-id` and `x-appwrite-user-jwt` headers
- Function extracts user context from these headers
- All generations are tracked per user
- User-specific endpoints are available

**Benefits:**
- Automatic user tracking
- Per-user history and statistics
- No additional configuration needed
- Secure JWT-based authentication

**Example (Client-side with Appwrite SDK):**
```javascript
import { Client, Functions } from "appwrite";

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('your-project-id');

const functions = new Functions(client);

// User must be logged in via Appwrite Auth
const result = await functions.createExecution(
  'your-function-id',
  JSON.stringify({
    description: "fibonacci function",
    language: "python"
  })
);
```

### 2. **API Key Authentication**

For external integrations or non-user requests.

**Setup:**
1. Generate API keys (random secure strings)
2. Add to environment variable: `API_KEYS=key1,key2,key3`
3. Pass key in request header or query parameter

**Usage:**
```bash
# Via header
curl -X POST http://your-function-url/api/code/generate \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"description": "...", "language": "python"}'

# Via query parameter
curl -X POST "http://your-function-url/api/code/generate?apiKey=your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"description": "...", "language": "python"}'
```

**Use Cases:**
- CI/CD pipelines
- External integrations
- Server-to-server communication
- Automated testing

### 3. **Anonymous Access**

Public access without authentication (configurable).

**Default Behavior:**
- Code generation: Allowed
- History access: Allowed
- User-specific endpoints: Blocked
- Cleanup operations: Blocked

**Limitations:**
- No personalized history
- Shared rate limits
- Limited analytics

---

## Rate Limiting

Protects the service from abuse and ensures fair usage.

### Configuration

Set in environment variable:
```env
RATE_LIMIT_PER_MINUTE=20
```

### How It Works

- **Window**: 1 minute (60 seconds)
- **Limit**: Configurable requests per window (default: 20)
- **Identifier**: User ID, API key, or IP address
- **Reset**: Automatic after window expires

### Rate Limit Headers

Every response includes:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 2026-06-14T23:30:00.000Z
```

### Rate Limit Response

When exceeded (HTTP 429):
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "statusCode": 429,
  "retryAfter": 45
}
```

### Best Practices

**For Users:**
- Check `X-RateLimit-Remaining` header
- Implement exponential backoff
- Cache responses client-side

**For API Integrations:**
- Respect `Retry-After` header
- Use unique API keys per service
- Monitor usage patterns

**For Administrators:**
- Adjust limit based on infrastructure
- Monitor rate limit hits
- Consider tiered limits for different user types

---

## User-Specific Endpoints

Available only to authenticated Appwrite users.

### Get User History

**Endpoint**: `GET /api/user/history`

Retrieve all code generations for the authenticated user.

```bash
# With Appwrite SDK (user must be logged in)
curl http://your-function-url/api/user/history \
  -H "X-Appwrite-User-Id: user-id" \
  -H "X-Appwrite-User-JWT: jwt-token"
```

**Response:**
```json
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "generations": [
    {
      "id": "gen-123",
      "description": "fibonacci function",
      "language": "python",
      "generatedAt": "2026-06-14T12:34:56.789Z"
    }
  ],
  "total": 25
}
```

### Get User Statistics

**Endpoint**: `GET /api/user/stats`

Get usage statistics for the authenticated user.

```bash
curl http://your-function-url/api/user/stats \
  -H "X-Appwrite-User-Id: user-id" \
  -H "X-Appwrite-User-JWT: jwt-token"
```

**Response:**
```json
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "totalGenerations": 25,
  "languageBreakdown": {
    "python": 10,
    "typescript": 8,
    "javascript": 7
  },
  "firstGeneration": "2026-01-15T10:20:30.000Z",
  "lastGeneration": "2026-06-14T12:34:56.789Z"
}
```

---

## Security Best Practices

### Environment Variables

**Never commit secrets:**
```bash
# ❌ BAD
WEBHOOK_SECRET=my-secret-123

# ✅ GOOD - Set in Appwrite Console
```

**Rotate API keys regularly:**
- Monthly for production
- After suspected compromise
- When team members leave

### Webhook Security

**Always set webhook secret:**
```env
WEBHOOK_SECRET=use-a-long-random-string-here
```

**Validate all webhooks:**
```javascript
const isValid = webhookService.validateSignature(payload, signature);
if (!isValid) {
  // Reject request
}
```

### Input Validation

All inputs are validated:
- Request body structure
- Parameter types
- String lengths
- Language support

### Protected Endpoints

Endpoints requiring authentication:
- `POST /api/cleanup` - Manual cache cleanup
- `GET /api/user/history` - User-specific history
- `GET /api/user/stats` - User statistics

### CORS Configuration

Configure allowed origins in Appwrite Console:
```
https://your-app.com
https://app.example.com
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "User authentication required",
  "statusCode": 401
}
```

**Causes:**
- Missing authentication credentials
- Invalid API key
- Expired JWT token

**Solutions:**
- Log in via Appwrite Auth
- Provide valid API key
- Refresh authentication

### 429 Too Many Requests

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "statusCode": 429,
  "retryAfter": 45
}
```

**Causes:**
- Exceeded rate limit
- Too many requests in short time

**Solutions:**
- Wait for rate limit reset
- Implement request throttling
- Use caching to reduce requests

---

## Monitoring & Analytics

### Track User Activity

All authenticated requests are logged with:
- User ID
- Timestamp
- Request type
- Generation metadata

### Rate Limit Monitoring

Monitor for patterns:
- Frequent rate limit hits
- Unusual traffic spikes
- Potential abuse

### Security Alerts

Set up alerts for:
- Invalid webhook signatures
- Failed authentication attempts
- Rate limit abuse
- Unusual usage patterns

---

## Migration Guide

### From Anonymous to Authenticated

**Step 1: Add Appwrite Auth to your app**
```javascript
import { Account } from "appwrite";

const account = new Account(client);

// User login
await account.createEmailSession(email, password);
```

**Step 2: Update API calls**
```javascript
// Before (anonymous)
fetch('/api/code/generate', { ... });

// After (authenticated - automatic)
// Appwrite SDK handles authentication
functions.createExecution('function-id', ...);
```

**Step 3: Access user-specific features**
```javascript
// Get your history
const history = await functions.createExecution(
  'function-id',
  '',
  false,
  '/api/user/history'
);
```

---

## Troubleshooting

### "Authentication required"

**Problem**: Endpoint requires auth but none provided

**Solution**:
- Log in via Appwrite Auth (for user endpoints)
- Provide API key (for external access)
- Check if endpoint allows anonymous access

### Rate limit too restrictive

**Problem**: Hitting rate limits frequently

**Solutions**:
1. Increase `RATE_LIMIT_PER_MINUTE` (requires function redeploy)
2. Implement client-side caching
3. Use batch operations where possible
4. Optimize request patterns

### Webhook signature validation fails

**Problem**: Valid webhooks rejected

**Solutions**:
1. Verify `WEBHOOK_SECRET` matches Appwrite configuration
2. Check webhook payload format
3. Ensure signature header is present
4. Validate HMAC implementation

---

## Configuration Examples

### Development (Relaxed Security)

```env
RATE_LIMIT_PER_MINUTE=100
WEBHOOK_SECRET=dev-secret-not-for-production
API_KEYS=dev-key-1,dev-key-2
```

### Production (Strict Security)

```env
RATE_LIMIT_PER_MINUTE=20
WEBHOOK_SECRET=<generate-with-crypto.randomBytes(32).toString('hex')>
API_KEYS=<secure-random-keys-only>
DISCORD_WEBHOOK_URL=<production-webhook>
```

### Enterprise (Custom Limits)

```env
RATE_LIMIT_PER_MINUTE=100
# Implement tiered limits in code
# Premium users: 100/min
# Standard users: 20/min
# Free users: 5/min
```

---

## Next Steps

- [ ] Implement user quotas
- [ ] Add usage billing integration
- [ ] Create admin dashboard
- [ ] Implement API key scopes
- [ ] Add OAuth2 support
- [ ] Create audit logs
