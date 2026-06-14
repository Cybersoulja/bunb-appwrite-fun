# Appwrite Setup Guide

This guide will help you set up Appwrite Database, Collections, and Storage for the AI Code Generator function.

## Prerequisites

- An Appwrite account (cloud or self-hosted)
- Access to the Appwrite Console
- Your function deployed to Appwrite

## 1. Create Database

1. Go to your Appwrite Console
2. Navigate to **Databases**
3. Click **Create Database**
4. Set Database ID: `code_generator`
5. Set Name: `Code Generator Database`
6. Click **Create**

## 2. Create Collections

### Collection 1: Generation History

**Purpose**: Store all code generations for analytics and retrieval

1. In your `code_generator` database, click **Create Collection**
2. Set Collection ID: `generation_history`
3. Set Name: `Generation History`
4. Click **Create**

#### Attributes for `generation_history`:

| Attribute | Type | Size | Required | Array | Default |
|-----------|------|------|----------|-------|---------|
| `description` | String | 1000 | Yes | No | - |
| `language` | String | 50 | Yes | No | - |
| `code` | String | 50000 | Yes | No | - |
| `tests` | String | 50000 | No | No | null |
| `documentation` | String | 10000 | No | No | null |
| `model` | String | 50 | Yes | No | - |
| `framework` | String | 100 | No | No | null |
| `generatedAt` | DateTime | - | Yes | No | - |
| `userId` | String | 100 | No | No | null |

#### Indexes for `generation_history`:

1. **Index: language**
   - Type: Key
   - Attribute: `language`
   - Order: ASC

2. **Index: generatedAt**
   - Type: Key
   - Attribute: `generatedAt`
   - Order: DESC

3. **Index: description_search**
   - Type: Fulltext
   - Attribute: `description`

#### Permissions for `generation_history`:

- **Create**: Any
- **Read**: Any
- **Update**: None
- **Delete**: None

---

### Collection 2: Response Cache

**Purpose**: Cache responses to reduce Ollama load and improve response times

1. In your `code_generator` database, click **Create Collection**
2. Set Collection ID: `response_cache`
3. Set Name: `Response Cache`
4. Click **Create**

#### Attributes for `response_cache`:

| Attribute | Type | Size | Required | Array | Default |
|-----------|------|------|----------|-------|---------|
| `cacheKey` | String | 100 | Yes | No | - |
| `description` | String | 1000 | Yes | No | - |
| `language` | String | 50 | Yes | No | - |
| `framework` | String | 100 | No | No | null |
| `code` | String | 50000 | Yes | No | - |
| `tests` | String | 50000 | No | No | null |
| `documentation` | String | 10000 | No | No | null |
| `expiresAt` | DateTime | - | Yes | No | - |
| `createdAt` | DateTime | - | Yes | No | - |

#### Indexes for `response_cache`:

1. **Index: cacheKey**
   - Type: Unique
   - Attribute: `cacheKey`

2. **Index: expiresAt**
   - Type: Key
   - Attribute: `expiresAt`
   - Order: ASC

#### Permissions for `response_cache`:

- **Create**: Any
- **Read**: Any
- **Update**: None
- **Delete**: None

---

## 3. Create Storage Bucket

**Purpose**: Store generated code files

1. Navigate to **Storage** in Appwrite Console
2. Click **Create Bucket**
3. Set Bucket ID: `generated_code`
4. Set Name: `Generated Code Files`
5. **File Security**: Disabled (or configure as needed)
6. **Max File Size**: 5MB (or adjust as needed)
7. **Allowed File Extensions**: Leave empty or add: `ts,js,py,rs,go,java,cpp,c,cs,rb,php,swift,kt,txt`
8. Click **Create**

#### Permissions for `generated_code`:

- **Create**: Any
- **Read**: Any
- **Update**: None
- **Delete**: None

---

## 4. Configure Environment Variables

Add these environment variables to your Appwrite Function:

1. Go to your Function in Appwrite Console
2. Navigate to **Settings** → **Environment Variables**
3. Add the following:

```env
APPWRITE_DATABASE_ID=code_generator
APPWRITE_HISTORY_COLLECTION_ID=generation_history
APPWRITE_CACHE_COLLECTION_ID=response_cache
APPWRITE_BUCKET_ID=generated_code
```

**Note**: `APPWRITE_FUNCTION_PROJECT_ID`, `APPWRITE_API_KEY`, and `APPWRITE_ENDPOINT` are automatically set by Appwrite.

---

## 5. Verify Setup

Test your setup with these API calls:

### Health Check
```bash
curl https://your-function-url/health
```

Expected response should include:
```json
{
  "appwrite": {
    "configured": true,
    "features": ["history", "caching", "search", "analytics"]
  }
}
```

### Generate Code (will auto-save to Appwrite)
```bash
curl -X POST https://your-function-url/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "fibonacci function",
    "language": "python"
  }'
```

### Check History
```bash
curl https://your-function-url/api/history
```

### Get Stats
```bash
curl https://your-function-url/api/stats
```

---

## Features Enabled

Once setup is complete, you'll have:

✅ **Automatic History Tracking**: All generations saved to Appwrite Database  
✅ **Smart Caching**: Identical requests return cached results (24-hour TTL)  
✅ **Search**: Full-text search across generation descriptions  
✅ **Analytics**: Track usage by language, total generations, recent activity  
✅ **Retrieval**: Get any previous generation by ID  

---

## Optional: Auto-Cleanup Cache

To automatically clean expired cache entries, you can:

1. Create a scheduled Appwrite Function
2. Set it to run daily
3. Call your `/api/cache/cleanup` endpoint (you'd need to add this endpoint)

Or manually clean cache via Appwrite Console by deleting expired documents.

---

## Troubleshooting

### "Appwrite is not configured"

**Cause**: Missing environment variables or incorrect IDs

**Solution**:
1. Verify all environment variables are set in Function Settings
2. Check that Database ID and Collection IDs match exactly
3. Ensure Function has API key with proper permissions

### "Failed to save to history"

**Cause**: Collection schema mismatch or permission issues

**Solution**:
1. Verify collection attributes match the schema above
2. Check collection permissions allow "Create" and "Read"
3. Review function logs for specific error messages

### Caching not working

**Cause**: Cache collection not set up or expired entries

**Solution**:
1. Verify `response_cache` collection exists with correct schema
2. Check that `expiresAt` index is created
3. Ensure cache TTL (24 hours default) hasn't expired

---

## Database Schema Summary

```
Database: code_generator
├── Collection: generation_history
│   ├── Stores: All code generations
│   └── Indexed by: language, generatedAt, description (fulltext)
│
├── Collection: response_cache
│   ├── Stores: Cached responses
│   └── Indexed by: cacheKey (unique), expiresAt
│
└── Bucket: generated_code
    └── Stores: Generated code files
```

---

## Next Steps

After setup:

1. Test all endpoints to ensure they work
2. Monitor usage via `/api/stats`
3. Consider implementing rate limiting for production
4. Set up periodic cache cleanup
5. Configure proper permissions for production use

For more details, see `EXAMPLES.md` for API documentation.
