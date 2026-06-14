# Automated Cache Cleanup Guide

Complete guide to automated cache cleanup, database optimization, and maintenance operations.

## Overview

The cache cleanup system automatically removes expired entries, optimizes database performance, and maintains system health.

## Features

- **Automated Cleanup**: Scheduled cache entry removal
- **Manual Triggers**: On-demand cleanup operations
- **Performance Monitoring**: Track cleanup metrics
- **Optimization**: Database maintenance tasks
- **Reporting**: Cleanup statistics and recommendations

---

## How It Works

### Automatic Scheduled Cleanup

The system automatically runs cleanup every 24 hours:

1. Check if cleanup is due
2. Remove expired cache entries
3. Update statistics
4. Log results

**No configuration required** - runs automatically!

### Cleanup Process

```
┌─────────────────────────┐
│  Check Last Run Time    │
└────────────┬────────────┘
             │
      ┌──────▼──────┐
      │ Is Due?     │
      └──┬────────┬─┘
         │        │
        No       Yes
         │        │
         └───┐   ┌▼──────────────────────┐
             │   │ Query Expired Cache   │
             │   └───────┬───────────────┘
             │           │
             │   ┌───────▼───────────────┐
             │   │ Delete Entries        │
             │   └───────┬───────────────┘
             │           │
             │   ┌───────▼───────────────┐
             │   │ Update Statistics     │
             │   └───────┬───────────────┘
             │           │
             └───────────▼───────────────┐
                 │ Return Results        │
                 └───────────────────────┘
```

---

## API Endpoints

### 1. Check Cleanup Status

**Endpoint**: `GET /api/cleanup/status`

Get current cleanup status and trigger scheduled cleanup if due.

```bash
curl http://your-function-url/api/cleanup/status
```

**Response:**
```json
{
  "status": {
    "lastRun": "2026-06-14T12:00:00.000Z",
    "isRunning": false,
    "nextRunIn": 18.5
  },
  "lastScheduledRun": {
    "cache": {
      "success": true,
      "deletedCount": 45,
      "duration": 1234
    },
    "lastRun": "2026-06-14T12:00:00.000Z"
  }
}
```

**Fields:**
- `lastRun`: When cleanup last ran
- `isRunning`: Whether cleanup is currently running
- `nextRunIn`: Hours until next scheduled run
- `deletedCount`: Entries removed in last run
- `duration`: Milliseconds taken

### 2. Manual Cleanup

**Endpoint**: `POST /api/cleanup`

Manually trigger cache cleanup (requires authentication).

```bash
curl -X POST http://your-function-url/api/cleanup \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 45,
  "duration": 1234,
  "timestamp": "2026-06-14T13:45:30.000Z"
}
```

**Error Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required for cleanup operations",
  "statusCode": 401
}
```

**Requirements:**
- Authenticated user (Appwrite Auth)
- OR valid API key

---

## Cache Expiration

### How Cache Expires

**TTL (Time To Live)**: 24 hours (default)

When entries expire:
1. Entry saved at: `2026-06-14 12:00:00`
2. Expiration set to: `2026-06-15 12:00:00`
3. Cleanup queries: `expiresAt < currentTime`
4. Entry deleted during next cleanup

### Expiration Logic

```typescript
// When caching
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + 24);

// When cleaning
const expired = await databases.listDocuments(
  databaseId,
  cacheCollectionId,
  [Query.lessThan("expiresAt", new Date().toISOString())]
);
```

### Custom TTL

Modify in `src/appwrite.ts`:

```typescript
async saveToCache(
  // ... parameters
  ttlHours: number = 24  // Change this value
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);
  // ...
}
```

**Common TTL Values:**
- **1 hour**: Rapidly changing data
- **24 hours**: Default, good balance
- **7 days**: Stable, rarely changing data
- **30 days**: Historical data

---

## Cleanup Strategies

### Strategy 1: Scheduled Automatic

**Best for**: Production environments

**Configuration**: None needed

**Behavior**:
- Runs every 24 hours
- Checks on every request to `/health` or `/api/cleanup/status`
- Non-blocking
- Silent operation

**Pros**:
- Zero maintenance
- Consistent cleanup
- No manual intervention

**Cons**:
- Fixed 24-hour interval
- Depends on function activity

### Strategy 2: Manual Trigger

**Best for**: Development, testing, immediate cleanup

**Usage**:
```bash
curl -X POST http://your-function-url/api/cleanup \
  -H "X-API-Key: your-api-key"
```

**Pros**:
- On-demand cleanup
- Immediate results
- Full control

**Cons**:
- Requires manual action
- Needs authentication

### Strategy 3: Cron Job

**Best for**: Predictable schedules, guaranteed execution

**Implementation**:

Create separate Appwrite Function:

```javascript
// cleanup-cron.js
export default async ({ req, res, log }) => {
  const response = await fetch(
    'https://your-function-url/api/cleanup',
    {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.CLEANUP_API_KEY
      }
    }
  );
  
  const result = await response.json();
  log(`Cleanup completed: ${result.deletedCount} entries deleted`);
  
  return res.json(result);
};
```

**Schedule**: Daily at 2 AM
**Appwrite Console**: Settings → Functions → Schedule → `0 2 * * *`

**Pros**:
- Guaranteed execution
- Flexible scheduling
- Independent of traffic

**Cons**:
- Requires separate function
- Additional configuration

---

## Monitoring & Alerts

### Cleanup Metrics

Track these metrics for monitoring:

```typescript
{
  deletedCount: number,      // Entries removed
  duration: number,          // Milliseconds taken
  success: boolean,          // Operation success
  errors: string[] | null    // Any errors encountered
}
```

### Set Up Alerts

**Discord Alert** (on high cleanup count):

```typescript
// In cleanup.ts
if (deletedCount > 1000) {
  await sendDiscordAlert(
    `⚠️ High cache cleanup: ${deletedCount} entries deleted`
  );
}
```

**Slack Alert** (on failure):

```typescript
if (!result.success) {
  await sendSlackAlert(
    `❌ Cache cleanup failed: ${result.errors?.join(', ')}`
  );
}
```

### Monitoring Dashboard

Create monitoring endpoint:

```typescript
// GET /api/cleanup/metrics
{
  "last24Hours": {
    "totalCleanups": 3,
    "totalDeleted": 150,
    "averageDuration": 1200,
    "failures": 0
  },
  "recommendations": [
    "Cache usage is optimal",
    "Consider increasing TTL for frequently accessed items"
  ]
}
```

---

## Performance Optimization

### Batch Deletion

Current implementation deletes in batches:

```typescript
const expired = await databases.listDocuments(
  databaseId,
  cacheCollectionId,
  [
    Query.lessThan("expiresAt", new Date().toISOString()),
    Query.limit(100)  // Batch size
  ]
);
```

**Recommended Batch Sizes:**
- **Small datasets** (<1000 entries): 100
- **Medium datasets** (1000-10000): 50
- **Large datasets** (>10000): 25

### Optimize Index

Ensure `expiresAt` index exists:

```sql
CREATE INDEX idx_expires_at ON response_cache (expiresAt ASC);
```

**In Appwrite Console:**
1. Go to Database → Collections → `response_cache`
2. Click **Indexes**
3. Add index on `expiresAt` field
4. Type: **Key**
5. Order: **ASC**

### Concurrent Cleanup

Prevent concurrent cleanup runs:

```typescript
private isRunning: boolean = false;

async cleanExpiredCache() {
  if (this.isRunning) {
    return { success: false, message: 'Cleanup already running' };
  }
  
  this.isRunning = true;
  try {
    // Cleanup logic
  } finally {
    this.isRunning = false;
  }
}
```

---

## Database Optimization

### Full Database Optimization

**Endpoint**: Future implementation

```typescript
async optimizeDatabase(log) {
  const actions = [];
  
  // 1. Clean expired cache
  const cacheResult = await cleanExpiredCache();
  actions.push(`Cleaned ${cacheResult.deletedCount} cache entries`);
  
  // 2. Remove old history (optional, with retention policy)
  const historyResult = await cleanOldHistory(90); // 90 days
  actions.push(`Archived ${historyResult.deletedCount} old generations`);
  
  // 3. Rebuild indexes (if supported)
  // actions.push('Rebuilt database indexes');
  
  return { success: true, actions };
}
```

### Retention Policies

Implement data retention:

**30-day retention**:
```typescript
async cleanOldHistory(retentionDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const old = await databases.listDocuments(
    databaseId,
    historyCollectionId,
    [
      Query.lessThan('generatedAt', cutoffDate.toISOString()),
      Query.limit(100)
    ]
  );
  
  // Archive or delete
}
```

---

## Troubleshooting

### Cleanup Not Running

**Symptoms:**
- Cache keeps growing
- Old entries not removed
- `lastRun` is null or old

**Diagnosis:**
```bash
curl http://your-function-url/api/cleanup/status
```

**Solutions:**

1. **Trigger manually:**
   ```bash
   curl -X POST http://your-function-url/api/cleanup \
     -H "X-API-Key: your-api-key"
   ```

2. **Check if function receives traffic:**
   - Scheduled cleanup runs on-demand
   - Requires function invocation

3. **Set up cron job:**
   - Create separate scheduled function
   - Guaranteed execution

### High Deletion Count

**Symptoms:**
- Thousands of entries deleted per cleanup
- Long cleanup duration

**Analysis:**
```json
{
  "deletedCount": 5000,
  "duration": 15000
}
```

**Causes:**
1. High cache generation rate
2. Long period without cleanup
3. Short TTL

**Solutions:**
1. **Increase cleanup frequency:**
   - Change from 24h to 12h
   - Set up cron job

2. **Increase TTL:**
   - Change from 24h to 48h
   - Reduce cache generation

3. **Optimize batch size:**
   - Smaller batches for faster execution
   - Multiple cleanup runs

### Cleanup Failures

**Symptoms:**
```json
{
  "success": false,
  "errors": ["Database connection failed"]
}
```

**Common Errors:**

1. **Database connection issues:**
   - Check Appwrite API key
   - Verify database ID
   - Test connection

2. **Permission errors:**
   - Check collection permissions
   - Ensure API key has delete access

3. **Rate limiting:**
   - Appwrite API rate limits
   - Reduce batch size
   - Add delays between deletions

**Debug:**
```bash
# Check Appwrite status
curl http://your-function-url/health

# Manual cleanup with verbose logging
curl -X POST http://your-function-url/api/cleanup \
  -H "X-API-Key: your-api-key" \
  -v
```

---

## Best Practices

### DO ✅

- Monitor cleanup metrics regularly
- Set up alerts for failures
- Test cleanup in development first
- Document custom retention policies
- Keep indexes optimized
- Use authentication for manual cleanup

### DON'T ❌

- Run cleanup too frequently (< 1 hour intervals)
- Delete without archiving important data
- Skip monitoring in production
- Ignore cleanup failures
- Modify cleanup logic without testing
- Expose cleanup endpoint publicly

---

## Configuration Examples

### Development

```env
# More frequent cleanup for testing
# Modify in cleanup.ts: shouldRun(intervalHours: number = 1)
```

### Production

```env
# Default 24-hour cleanup
# Set up monitoring
# Configure alerts
```

### Enterprise

```env
# Custom retention policies
# Dedicated cleanup cron
# Advanced monitoring
# Automated archival
```

---

## Advanced Features

### Archive Before Delete

```typescript
async archiveAndCleanup(log) {
  const expired = await getExpiredCache();
  
  // Archive to long-term storage
  await archiveToS3(expired);
  
  // Then delete from database
  await deleteExpired(expired);
}
```

### Cleanup Reports

```typescript
async generateCleanupReport() {
  return {
    cacheStats: {
      expired: 150,
      active: 500,
      totalSize: '12.5 MB'
    },
    historyStats: {
      total: 10000,
      lastMonth: 2500
    },
    recommendations: [
      'Cache usage is optimal',
      'Consider archiving history older than 90 days'
    ]
  };
}
```

### Multi-Stage Cleanup

```typescript
// Stage 1: Soft delete (mark as deleted)
await softDeleteExpired();

// Stage 2: Hard delete after grace period
await hardDeleteSoftDeleted();
```

---

## Future Enhancements

- [ ] Configurable cleanup intervals
- [ ] Automatic scaling based on cache size
- [ ] Smart TTL based on usage patterns
- [ ] Compression before archival
- [ ] Cleanup analytics dashboard
- [ ] Predictive cleanup scheduling
- [ ] Multi-region cleanup coordination

---

## FAQs

**Q: How often does cleanup run?**
A: Every 24 hours by default, triggered on function invocation.

**Q: Can I change the cleanup interval?**
A: Yes, modify `shouldRun(intervalHours)` in cleanup.ts.

**Q: What happens to cache during cleanup?**
A: Only expired entries are deleted. Active cache continues working.

**Q: Does cleanup affect performance?**
A: Minimal impact. Runs asynchronously and uses batch operations.

**Q: Can I recover deleted cache?**
A: No, deletion is permanent. Implement archival if needed.

**Q: How do I know if cleanup is working?**
A: Check `/api/cleanup/status` endpoint for metrics.
