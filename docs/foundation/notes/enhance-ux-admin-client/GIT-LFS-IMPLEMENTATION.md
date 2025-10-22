# Git LFS Implementation for Large File Uploads

## Problem Solved

Large file uploads (>1MB) were failing due to:

1. **GitHub REST API Limitation**: `createOrUpdateFileContents` has a 1MB file
   size limit
2. **Timeout Issues**: Even with Git Data API, files >10MB would timeout after
   ~60 seconds
3. **Authentication Issues**: Initially had wrong auth header format (`Bearer`
   instead of `token`)

## Solution: Three-Tier Upload Strategy

### Tier 1: Small Files (≤1MB)

**Method**: `createOrUpdateFileContents` (GitHub REST API)

- Fast and simple
- No special configuration needed
- ✅ Works perfectly for most images and small documents

### Tier 2: Medium Files (1MB - 10MB)

**Method**: Git Data API (fallback if LFS fails)

- Uses 6-step Git low-level API:
  1. Get branch reference
  2. Get current commit
  3. Create blob with file content
  4. Create new tree
  5. Create new commit
  6. Update branch reference
- ⚠️ Can timeout for files >10MB
- Used as fallback when LFS is not available

### Tier 3: Large Files (>1MB, recommended)

**Method**: **Git LFS (Large File Storage)** ⭐

- **Proper solution for large files**
- Complete LFS protocol implementation:
  1. Calculate SHA256 hash of file
  2. Request upload URL from GitHub LFS Batch API
  3. Upload actual file content to LFS storage
  4. Verify upload (if required)
  5. Create LFS pointer file in repository
- Supports files up to **2GB** (GitHub's LFS limit)
- No timeout issues
- **Automatic fallback** to Git Data API if LFS is not enabled

## How It Works

### Automatic Detection

```typescript
if (fileSize > 1MB) {
  try {
    // Try LFS first (recommended)
    return await uploadWithLFS(file);
  } catch (lfsError) {
    // Fall back to Git Data API
    return await uploadLargeFile(file);
  }
} else {
  // Use simple API
  return await createOrUpdateFileContents(file);
}
```

### Git LFS Upload Flow

1. **Hash Calculation**

   ```typescript
   const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
   ```

2. **Request Upload URL** (LFS Batch API)

   ```
   POST https://github.com/{owner}/{repo}.git/info/lfs/objects/batch
   {
     "operation": "upload",
     "objects": [{ "oid": "sha256:...", "size": 12345678 }]
   }
   ```

3. **Upload to LFS Storage**

   ```
   PUT {upload_url_from_batch_response}
   Body: <raw file bytes>
   ```

4. **Create LFS Pointer**
   ```
   version https://git-lfs.github.com/spec/v1
   oid sha256:abc123...
   size 12345678
   ```

## Setting Up Git LFS

### Prerequisites

Your repository needs Git LFS enabled:

```bash
# In your local repository
git lfs install

# Track large files (automatic in GitCMS)
git lfs track "*.pdf"
git lfs track "*.mp4"
git lfs track "*.zip"

# Commit the .gitattributes file
git add .gitattributes
git commit -m "Configure Git LFS"
git push
```

### GitCMS Auto-Configuration

GitCMS can automatically configure LFS for you:

1. Go to **Media Library → LFS Management tab**
2. Click "Initialize LFS"
3. Select file types to track (PDFs, videos, archives, etc.)
4. GitCMS creates/updates `.gitattributes` automatically

## File Size Recommendations

| File Size | Method           | Performance | Notes                      |
| --------- | ---------------- | ----------- | -------------------------- |
| < 1MB     | Simple API       | ⚡ Instant  | Perfect for most images    |
| 1-5MB     | LFS (preferred)  | ⚡ Fast     | Falls back to Git Data API |
| 5-50MB    | LFS (required)   | ✅ Good     | Git Data API might timeout |
| 50MB+     | LFS (required)   | ✅ Good     | Git Data API will fail     |
| 100MB+    | LFS only         | ⚠️ Slow     | GitHub's hard limit        |
| 2GB+      | ❌ Not supported | -           | GitHub's LFS limit         |

## Error Handling

### LFS Not Enabled

```
Error: Git LFS is not enabled on this repository.
Solution: Enable LFS by running 'git lfs install' in your repository.
```

### Authentication Errors

```
Error: Bad credentials (401)
Solution: Check GitHub token has 'repo' scope
```

### Timeout Errors

```
Error: Upload timeout after 60s
Solution: LFS is strongly recommended for files > 10MB
```

## Code Changes

### Modified Files

1. **packages/core/src/github.ts**
   - Added `uploadWithLFS()` - Complete LFS protocol implementation
   - Updated `uploadBinaryFile()` - Auto-detect file size and route to
     appropriate method
   - Enhanced `uploadLargeFile()` - Git Data API with better timeout handling
   - Fixed authentication header (`token` instead of `Bearer`)

2. **packages/core/src/git-lfs.ts** (existing)
   - Already had LFS manager for `.gitattributes` configuration
   - Now integrated with actual upload flow

### New Capabilities

- ✅ Files >1MB automatically use LFS when available
- ✅ Graceful fallback to Git Data API if LFS not configured
- ✅ Detailed logging for debugging
- ✅ Proper error messages guiding users to enable LFS
- ✅ SHA256 hashing for LFS integrity
- ✅ Complete LFS Batch API implementation
- ✅ Upload verification support

## Testing Checklist

- [x] 5MB file upload (successful with simple API)
- [x] 11.7MB PDF upload (needs LFS enabled)
- [ ] Enable LFS in test repository
- [ ] Test 11.7MB PDF with LFS
- [ ] Test 50MB file with LFS
- [ ] Test 100MB file with LFS
- [ ] Test fallback when LFS disabled
- [ ] Test error messages

## Next Steps

1. **Enable LFS in your test repository**:

   ```bash
   cd /path/to/test_gitcms
   git lfs install
   git lfs track "*.pdf"
   git add .gitattributes
   git commit -m "Enable Git LFS"
   git push
   ```

2. **Try uploading the 11.7MB PDF again** - it should now:
   - Detect file is >1MB
   - Attempt LFS upload
   - Upload to GitHub's LFS storage
   - Create pointer file in repository
   - ✅ Success!

3. **Monitor the console** for detailed logs showing each step

## Technical Notes

### Why LFS is Better Than Git Data API

- **No timeouts**: LFS is designed for large files
- **Bandwidth savings**: LFS stores files separately, not in Git history
- **Faster clones**: Users can choose whether to download LFS files
- **Industry standard**: Used by major projects for binaries

### LFS Pointer File Format

```
version https://git-lfs.github.com/spec/v1
oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393
size 12345678
```

This tiny file (3 lines) is committed to Git instead of the 12MB actual file!

## References

- [Git LFS Specification](https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md)
- [GitHub LFS Documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files)
- [LFS Batch API](https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md)
