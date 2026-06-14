# Webhooks Guide

Complete guide to using webhooks with the AI Code Generator for real-time event notifications and integrations.

## Overview

Webhooks allow you to receive real-time notifications when events occur in the code generator, enabling integrations with external services like Discord, Slack, or custom applications.

## Supported Events

### Database Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `database.documents.create` | New code generation created | After successful code generation |
| `database.documents.delete` | Cache entry deleted | After cache cleanup |
| `database.documents.update` | Document updated | When generation metadata changes |

### User Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `users.create` | New user registered | When user signs up |
| `users.sessions.create` | User login | When user creates new session |

### Storage Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `storage.files.create` | Code file stored | When code saved to Storage |

---

## Setup

### 1. Configure Webhook Secret

Generate a secure secret for webhook signature verification:

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to environment variables:
```env
WEBHOOK_SECRET=your-generated-secret-here
```

### 2. Configure in Appwrite Console

1. Go to your Appwrite project
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **Name**: Code Generator Events
   - **URL**: `https://your-function-url/api/webhook`
   - **Events**: Select relevant events
   - **Security**: Add webhook secret (same as above)

### 3. Test Webhook

```bash
curl -X POST http://your-function-url/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Signature: your-signature" \
  -d '{
    "event": "database.documents.create",
    "data": {
      "$id": "test-123",
      "$collectionId": "generation_history",
      "description": "Test generation",
      "language": "python"
    }
  }'
```

---

## Webhook Endpoint

### `POST /api/webhook`

Receives and processes webhook events from Appwrite.

**Headers:**
- `Content-Type: application/json`
- `X-Appwrite-Signature: <hmac-signature>` (for validation)

**Request Body:**
```json
{
  "event": "database.documents.create",
  "data": {
    "$id": "64f5a1b2c3d4e5f6g7h8i9j0",
    "$collectionId": "generation_history",
    "description": "Create a fibonacci function",
    "language": "python",
    "code": "def fibonacci(n): ...",
    "generatedAt": "2026-06-14T12:34:56.789Z"
  },
  "userId": "user-123",
  "timestamp": "2026-06-14T12:34:56.789Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed database.documents.create event",
  "actions": [
    "generation_tracked",
    "discord_notification_sent"
  ],
  "timestamp": "2026-06-14T12:34:56.789Z"
}
```

**Error Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid webhook signature",
  "statusCode": 401
}
```

---

## Signature Validation

Webhooks are secured using HMAC-SHA256 signatures.

### How It Works

1. Appwrite generates HMAC signature of request body
2. Signature sent in `X-Appwrite-Signature` header
3. Function validates signature using shared secret
4. Invalid signatures are rejected (401)

### Implementation

```typescript
import crypto from 'crypto';

function validateSignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
}
```

### Development Mode

If `WEBHOOK_SECRET` is not set, validation is skipped (development only).

**⚠️ Warning**: Always set webhook secret in production!

---

## External Integrations

### Discord Notifications

Send notifications to Discord when code is generated.

**Setup:**
1. Create Discord webhook in your server
2. Add to environment variables:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123/abc
```

**Message Format:**
```json
{
  "embeds": [{
    "title": "🎨 New Code Generation",
    "description": "Create a fibonacci function",
    "fields": [
      { "name": "Language", "value": "python", "inline": true },
      { "name": "Model", "value": "codellama", "inline": true }
    ],
    "color": 65280,
    "timestamp": "2026-06-14T12:34:56.789Z"
  }]
}
```

**Visual Example:**
```
🎨 New Code Generation
Create a fibonacci function

Language: python    Model: codellama
```

### Slack Notifications

Send notifications to Slack channels.

**Setup:**
1. Create Slack incoming webhook
2. Add to environment variables:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXX
```

**Usage:**
```typescript
await webhookService.sendSlackNotification(
  'New code generated: fibonacci function in Python',
  '#code-generator'
);
```

**Message Example:**
```
New code generated: fibonacci function in Python
```

### Custom Webhooks

Trigger webhooks to external services.

**Example:**
```typescript
await webhookService.triggerCustomWebhook(
  'https://your-service.com/webhook',
  {
    event: 'code_generated',
    language: 'python',
    userId: 'user-123',
    timestamp: new Date().toISOString()
  }
);
```

**Response:**
```json
{
  "success": true,
  "status": 200
}
```

---

## Event Processing

### New Generation Created

**Event**: `database.documents.create`

**Actions:**
1. Log generation details
2. Send Discord notification (if configured)
3. Track event in registry
4. Trigger custom webhooks

**Example Payload:**
```json
{
  "event": "database.documents.create",
  "data": {
    "$id": "gen-123",
    "$collectionId": "generation_history",
    "description": "REST API endpoint",
    "language": "typescript",
    "framework": "Express",
    "model": "codellama",
    "generatedAt": "2026-06-14T12:34:56.789Z"
  }
}
```

### Cache Entry Deleted

**Event**: `database.documents.delete`

**Actions:**
1. Log deletion
2. Update cache statistics
3. Track event

### User Created

**Event**: `users.create`

**Actions:**
1. Log new user
2. Send welcome email (if configured)
3. Initialize user quota
4. Track event

**Setup Welcome Emails:**
```env
WELCOME_EMAIL_ENABLED=true
```

---

## Webhook Registry

Track all received webhooks for monitoring and debugging.

### Get Recent Webhooks

**Endpoint**: `GET /health`

Includes webhook statistics in response:

```json
{
  "webhooks": {
    "total": 150,
    "processed": 145,
    "failed": 5,
    "eventTypes": {
      "database.documents.create": 100,
      "database.documents.delete": 30,
      "users.create": 15,
      "users.sessions.create": 5
    }
  }
}
```

### Registry Features

- **Stores**: Last 100 webhook events
- **Tracks**: Success/failure status
- **Records**: Event types and timestamps
- **Provides**: Statistics and analytics

---

## Error Handling

### Webhook Processing Errors

**Logged but not failed:**
- Discord notification failure
- Slack notification failure
- Custom webhook timeout

**Result:**
```json
{
  "success": true,
  "message": "Processed event (with warnings)",
  "actions": [
    "generation_tracked",
    "discord_notification_failed"
  ]
}
```

### Validation Errors

**Immediately rejected:**
- Invalid signature
- Missing required fields
- Malformed JSON

**Result:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid webhook signature",
  "statusCode": 401
}
```

---

## Testing Webhooks

### Manual Testing

```bash
# 1. Generate valid signature
WEBHOOK_SECRET="your-secret"
PAYLOAD='{"event":"database.documents.create","data":{"$id":"test"}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

# 2. Send webhook
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Test Events

**Successful Generation:**
```json
{
  "event": "database.documents.create",
  "data": {
    "$id": "test-123",
    "$collectionId": "generation_history",
    "description": "Test function",
    "language": "python",
    "model": "codellama"
  }
}
```

**Cache Cleanup:**
```json
{
  "event": "database.documents.delete",
  "data": {
    "$id": "cache-123",
    "$collectionId": "response_cache"
  }
}
```

**New User:**
```json
{
  "event": "users.create",
  "data": {
    "$id": "user-123",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

---

## Use Cases

### 1. Team Notifications

**Scenario**: Notify team when code is generated

**Setup**:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Result**: Automatic Slack messages to #code-generator channel

### 2. Analytics Pipeline

**Scenario**: Send events to analytics platform

**Implementation**:
```typescript
// In webhook processing
await webhookService.triggerCustomWebhook(
  'https://analytics.example.com/events',
  {
    event: 'code_generated',
    properties: { language, framework },
    userId: data.userId
  }
);
```

### 3. Automated Testing

**Scenario**: Trigger tests when code is generated

**Implementation**:
```typescript
if (event === 'database.documents.create') {
  await webhookService.triggerCustomWebhook(
    'https://ci.example.com/trigger-tests',
    {
      generationId: data.$id,
      language: data.language,
      code: data.code
    }
  );
}
```

### 4. User Onboarding

**Scenario**: Welcome new users with email/notification

**Setup**:
```env
WELCOME_EMAIL_ENABLED=true
```

**Trigger**: When `users.create` event received

---

## Best Practices

### Security

✅ **Do:**
- Always set webhook secret in production
- Validate all webhook signatures
- Use HTTPS for webhook URLs
- Rotate secrets periodically

❌ **Don't:**
- Skip signature validation
- Expose webhook secrets in logs
- Use HTTP (unencrypted) URLs
- Share secrets across environments

### Performance

✅ **Do:**
- Process webhooks asynchronously
- Implement retry logic for external calls
- Set reasonable timeouts
- Log failures for debugging

❌ **Don't:**
- Block webhook response on external calls
- Retry indefinitely
- Process heavy operations synchronously

### Monitoring

✅ **Do:**
- Track webhook processing times
- Monitor failure rates
- Alert on signature failures
- Log all webhook events

❌ **Don't:**
- Ignore failed webhooks
- Skip logging important events
- Disable monitoring in production

---

## Troubleshooting

### Webhooks Not Received

**Possible Causes:**
1. Incorrect URL in Appwrite console
2. Function not deployed
3. Network/firewall issues

**Solutions:**
1. Verify webhook URL configuration
2. Check function deployment status
3. Test with manual curl request

### Signature Validation Fails

**Possible Causes:**
1. Mismatched webhook secret
2. Incorrect signature format
3. Modified payload

**Solutions:**
1. Verify `WEBHOOK_SECRET` matches Appwrite
2. Check signature header name
3. Don't modify payload before validation

### Discord/Slack Not Working

**Possible Causes:**
1. Invalid webhook URL
2. Incorrect message format
3. Rate limiting

**Solutions:**
1. Test webhook URL manually
2. Check message structure
3. Implement rate limiting

---

## Advanced Configuration

### Custom Event Handlers

```typescript
// Add new event type
switch (event) {
  case 'custom.event.type':
    log('Handling custom event');
    // Custom logic here
    actions.push('custom_action_taken');
    break;
}
```

### Conditional Notifications

```typescript
// Only notify for specific languages
if (event === 'database.documents.create' && data.language === 'rust') {
  await webhookService.sendDiscordNotification(data);
}
```

### Webhook Batching

```typescript
// Collect events and send in batches
const eventBatch = [];
eventBatch.push(event);

if (eventBatch.length >= 10) {
  await sendBatchNotification(eventBatch);
  eventBatch = [];
}
```

---

## Next Steps

- [ ] Implement webhook retry mechanism
- [ ] Add webhook event filtering
- [ ] Create webhook analytics dashboard
- [ ] Support more integration platforms
- [ ] Add webhook event replay
- [ ] Implement webhook rate limiting
