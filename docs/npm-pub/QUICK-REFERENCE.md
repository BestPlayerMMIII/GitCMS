# NPM Publication Quick Reference

**Date:** November 4, 2025

---

## ✅ What's Ready

- [x] LICENSE files in both packages (MIT)
- [x] Comprehensive README.md (19.2 KB)
- [x] package.json files arrays updated
- [x] Both packages built and tested
- [x] npm pack verified

---

## 🎯 Required Publication Order

### 1️⃣ GitHub First (REQUIRED)

**Why:** README links to GitHub docs, package.json references GitHub URLs

```bash
git add .
git commit -m "Add LICENSE files and comprehensive README for NPM publication"
git push origin enhance-ux
```

**Verify:** Visit https://github.com/BestPlayerMMIII/GitCMS/tree/enhance-ux

### 2️⃣ NPM Core Package

```bash
cd packages\core
npm publish --access public
```

**Verify:** https://www.npmjs.com/package/@git-cms/core

### 3️⃣ NPM Client Package

```bash
cd ..\client
npm publish --access public
```

**Verify:** https://www.npmjs.com/package/@git-cms/client

---

## 📦 Package Sizes

| Package             | Compressed | Unpacked | Files |
| ------------------- | ---------- | -------- | ----- |
| **@git-cms/core**   | 105.5 KB   | 484.5 KB | 9     |
| **@git-cms/client** | 30.9 KB    | 135.9 KB | 7     |

---

## 📋 Quick Checklist

### Before Publishing

- [x] LICENSE in both packages ✅
- [x] README comprehensive ✅
- [x] package.json correct ✅
- [x] Build successful ✅
- [x] Type-check passed ✅
- [x] npm pack tested ✅

### GitHub

- [ ] Repository pushed
- [ ] Branch available
- [ ] Docs accessible
- [ ] Links working

### NPM

- [ ] npm login
- [ ] Core published
- [ ] Client published
- [ ] Installation tested

---

## 🚀 Full Publication Script

```bash
# 1. Push to GitHub
cd c:\Users\Utente\Desktop\Coding\JS-TS\progetti\GitCMS
git add .
git commit -m "Prepare for NPM publication"
git push origin enhance-ux

# 2. Login to NPM
npm login

# 3. Publish Core
cd packages\core
npm publish --access public

# 4. Publish Client
cd ..\client
npm publish --access public

# 5. Test Installation
cd c:\temp
mkdir test-gitcms
cd test-gitcms
npm init -y
npm install @git-cms/client
```

---

## 🔗 Important Links

- **GitHub Repo:** https://github.com/BestPlayerMMIII/GitCMS
- **NPM Core:** https://www.npmjs.com/package/@git-cms/core
- **NPM Client:** https://www.npmjs.com/package/@git-cms/client
- **Issues:** https://github.com/BestPlayerMMIII/GitCMS/issues

---

## ❓ FAQ

**Q: Can I publish to NPM without GitHub?**  
A: Technically yes, but NOT recommended. README links to GitHub docs,
package.json references GitHub URLs.

**Q: What if GitHub links break?**  
A: They won't if you publish GitHub first. README links use full URLs with
branch name.

**Q: Why publish core first?**  
A: Client depends on `@git-cms/core@^0.1.0`. Core must exist on NPM before
client can resolve it.

**Q: Can I update README without re-publishing?**  
A: GitHub docs: Yes, anytime. NPM README: No, requires `npm version patch` +
re-publish.

---

## 📝 Post-Publication Tasks

After both packages are published:

1. **Test Installation**

   ```bash
   npm install @git-cms/client
   ```

2. **Add NPM Badges to README**

   ```markdown
   [![npm](https://img.shields.io/npm/v/@git-cms/client)](https://www.npmjs.com/package/@git-cms/client)
   [![downloads](https://img.shields.io/npm/dm/@git-cms/client)](https://www.npmjs.com/package/@git-cms/client)
   ```

3. **Create GitHub Release**
   - Tag: `v0.1.0`
   - Title: "Initial Release"
   - Description: Feature list

4. **Share**
   - Twitter/X
   - Reddit r/typescript, r/programming
   - Dev.to blog post
   - Product Hunt (optional)

---

## 🎉 You're Ready!

Everything is prepared and verified. Just follow the steps above in order:

1. GitHub → 2. NPM Core → 3. NPM Client

Good luck with your publication! 🚀
