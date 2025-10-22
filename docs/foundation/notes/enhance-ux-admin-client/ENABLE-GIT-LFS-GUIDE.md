# Quick Guide: Enable Git LFS for Your Test Repository

## Step 1: Install Git LFS (if not already installed)

### Windows

```bash
# Download from https://git-lfs.github.com/
# Or use Chocolatey:
choco install git-lfs
```

### Verify Installation

```bash
git lfs version
# Should output: git-lfs/3.x.x (GitHub; windows amd64; go 1.x.x)
```

## Step 2: Enable LFS in Your Repository

### Option A: Local Repository (Recommended)

```bash
# Navigate to your test repository
cd /path/to/test_gitcms

# Initialize Git LFS
git lfs install

# Track common large file types
git lfs track "*.pdf"
git lfs track "*.mp4"
git lfs track "*.zip"
git lfs track "*.rar"
git lfs track "*.7z"
git lfs track "*.psd"
git lfs track "*.ai"

# Alternatively, track ALL files in media folder
git lfs track "media/**"

# Add the .gitattributes file
git add .gitattributes

# Commit
git commit -m "Enable Git LFS for large files"

# Push to GitHub
git push
```

### Option B: Direct Edit on GitHub

1. Go to https://github.com/BestPlayerMMIII/test_gitcms
2. Click "Add file" → "Create new file"
3. Name it `.gitattributes`
4. Paste this content:
   ```
   # Git LFS Configuration
   *.pdf filter=lfs diff=lfs merge=lfs -text
   *.mp4 filter=lfs diff=lfs merge=lfs -text
   *.mov filter=lfs diff=lfs merge=lfs -text
   *.zip filter=lfs diff=lfs merge=lfs -text
   *.rar filter=lfs diff=lfs merge=lfs -text
   *.7z filter=lfs diff=lfs merge=lfs -text
   *.psd filter=lfs diff=lfs merge=lfs -text
   *.ai filter=lfs diff=lfs merge=lfs -text
   ```
5. Click "Commit changes"

## Step 3: Verify LFS is Enabled

### Check .gitattributes exists

```bash
curl https://raw.githubusercontent.com/BestPlayerMMIII/test_gitcms/main/.gitattributes
```

Should show your LFS rules.

## Step 4: Test Upload

Now try uploading your 11.7MB PDF file through GitCMS!

Expected console output:

```
Large file detected: SMBUD-07-document-db.pdf (11.7MB). Will use Git LFS or Git Data API for upload.
⚠️ Large file detected: SMBUD-07-document-db.pdf (11.7MB). Git LFS is strongly recommended.
   If upload fails, please enable Git LFS in your repository: https://git-lfs.github.com/
Starting upload for file: SMBUD-07-document-db.pdf (11.7MB)
Large file detected (11.7MB). Attempting Git LFS upload...
Uploading with Git LFS: media/smbud-07-document-db-1234567890.pdf (11.7MB)
File hash (SHA256): abc123...
Requesting LFS upload URL from: https://github.com/BestPlayerMMIII/test_gitcms.git/info/lfs
Uploading file content to LFS storage: https://...
File content uploaded to LFS storage successfully
LFS upload verified successfully
Creating LFS pointer file in repository: media/smbud-07-document-db-1234567890.pdf
LFS upload complete! File stored in LFS, pointer committed to repository
Upload successful for file: SMBUD-07-document-db.pdf (11.7MB)
```

## What Happens After?

### In Your Repository

- **Small pointer file** (~130 bytes) is committed to Git
- **Actual file** (11.7MB) stored in GitHub's LFS storage
- Repository stays lightweight!

### When Someone Clones

```bash
git clone https://github.com/BestPlayerMMIII/test_gitcms.git
# Automatically downloads LFS files

# Or skip LFS files for faster clone:
GIT_LFS_SKIP_SMUDGE=1 git clone https://...
```

## Troubleshooting

### "Git LFS is not enabled on this repository"

- Make sure `.gitattributes` exists with LFS rules
- Check file is tracked: `git lfs ls-files`

### "404 Not Found" on LFS endpoint

- Repository might not support LFS (check GitHub repo settings)
- Free GitHub accounts have LFS quota limits (1GB free)

### "Upload failed after 60s"

- This means you need LFS! The Git Data API timed out.
- Follow steps above to enable LFS

### Check Your LFS Quota

```bash
git lfs ls-files
git lfs status
```

Or check on GitHub:

- Settings → Billing → Git LFS Data

## Migration: Convert Existing Large Files to LFS

If you already have large files in Git history:

```bash
# Install BFG Repo-Cleaner
# Download from https://rtyley.github.io/bfg-repo-cleaner/

# Convert large files to LFS
git lfs migrate import --include="*.pdf,*.mp4,*.zip" --everything

# Force push (WARNING: rewrites history)
git push --force --all
```

## Quick .gitattributes Templates

### Media-Heavy Projects

```
*.pdf filter=lfs diff=lfs merge=lfs -text
*.psd filter=lfs diff=lfs merge=lfs -text
*.ai filter=lfs diff=lfs merge=lfs -text
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text
*.avi filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text
*.rar filter=lfs diff=lfs merge=lfs -text
```

### Everything in Media Folder

```
media/** filter=lfs diff=lfs merge=lfs -text
```

### Size-Based (requires manual tracking)

```
# Track any file > 10MB
# Must run: git lfs track for each file manually
```

## Resources

- [Git LFS Official Site](https://git-lfs.github.com/)
- [GitHub LFS Documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files)
- [GitCMS LFS Implementation](./GIT-LFS-IMPLEMENTATION.md)
