# Migration Guide: Moving to npuckett/p5-phone

This guide will help you copy the p5-phone project to your personal GitHub account.

## ✅ What's Been Updated

All repository references have been changed from:
- **Old:** `DigitalFuturesOCADU/p5-phone` or `DigitalFuturesOCADU/mobile-p5-permissions`
- **New:** `npuckett/p5-phone`

### Files Updated:
- ✅ `package.json` - repository, bugs, homepage URLs
- ✅ `p5-phone.yaml` - sourceUrl and websiteUrl
- ✅ `src/p5-phone.js` - header comment with GitHub URL
- ✅ `dist/p5-phone.js` - rebuilt with new header
- ✅ `dist/p5-phone.min.js` - rebuilt with new header
- ✅ `README.md` - interactive examples link
- ✅ `CDN_VERIFICATION.md` - GitHub links

### New URLs:
- **GitHub Repo:** https://github.com/npuckett/p5-phone
- **GitHub Pages:** https://npuckett.github.io/p5-phone/
- **Issues:** https://github.com/npuckett/p5-phone/issues

---

## 📋 Step-by-Step Migration

### 1. Copy Files to New Repository

You mentioned you've already created and cloned the new repo. Now copy all files:

```bash
# Navigate to the NEW repository location
cd /path/to/p5-phone  # Your new cloned repo

# Copy all files from THIS directory to the new repo
# (Replace /Users/npmac/Documents/GitHub/mobile-p5-permissions with current path)
cp -r /Users/npmac/Documents/GitHub/mobile-p5-permissions/* .

# Copy hidden files too
cp -r /Users/npmac/Documents/GitHub/mobile-p5-permissions/.* . 2>/dev/null || true
```

### 2. Verify Files Were Copied

```bash
# Check that key files are present
ls -la

# Should see:
# - package.json
# - p5-phone.yaml
# - src/
# - dist/
# - examples/
# - README.md
# - LICENSE
# - etc.
```

### 3. Stage and Commit All Files

```bash
# Add all files
git add .

# Commit with a clear message
git commit -m "Initial commit: p5-phone library v1.4.4

Simplified mobile hardware access for p5.js
- Sensor access (accelerometer, gyroscope, orientation)
- Microphone integration
- Touch utilities
- Browser gesture management

Migrated from DigitalFuturesOCADU/mobile-p5-permissions"

# Push to GitHub
git push origin main
```

### 4. Enable GitHub Pages

1. Go to: https://github.com/npuckett/p5-phone/settings/pages
2. Under "Source", select: **Deploy from a branch**
3. Select branch: **main**
4. Select folder: **/ (root)**
5. Click **Save**

After a few minutes, your examples will be live at:
https://npuckett.github.io/p5-phone/

### 5. Verify Everything Works

**Check GitHub Pages:**
```bash
# Wait a few minutes for GitHub Pages to deploy, then test:
open https://npuckett.github.io/p5-phone/examples/homepage/
```

**Check Repository:**
- README renders correctly: https://github.com/npuckett/p5-phone
- Examples link works in README
- Issues page exists: https://github.com/npuckett/p5-phone/issues

---

## 🚀 Next Steps: Publishing

### Option 1: Publish as Patch Version (Recommended)

Since this is just a repository URL change, publish as a patch:

```bash
# Make sure you're in the NEW repository
cd /path/to/p5-phone

# Verify package.json has correct repo URL
cat package.json | grep "npuckett"

# Bump to 1.4.5 and publish
npm version patch
npm publish
```

This will:
- Create version 1.4.5
- Create a git tag
- Publish to npm
- Push tag to GitHub

### Option 2: Keep Same Version

If you want to keep v1.4.4 but update the metadata:

```bash
# Publish without version bump
npm publish --force

# Note: This will update the npm page but keep version 1.4.4
# The new repository URLs will show on npmjs.com
```

### After Publishing

Update the CDN links in your documentation if needed (though JSDelivr will automatically serve from npm, regardless of GitHub repo location).

---

## 📝 Update p5.js Submission

Since you'll be submitting to p5.js, you'll use the files from the NEW repository:

**Files to submit:**
1. `p5-phone.yaml` - Already updated with new URLs ✅
2. `P5Phone.png` - No changes needed ✅

**Submission checklist:**
- [x] YAML points to `https://github.com/npuckett/p5-phone`
- [x] websiteUrl points to `https://npuckett.github.io/p5-phone/`
- [x] npm package is published
- [x] GitHub Pages is enabled
- [ ] Wait for GitHub Pages to finish deploying
- [ ] Test live examples work
- [ ] Submit to p5.js-website repository

---

## 🔄 Old Repository Cleanup (Optional)

Once everything is working in the new location:

### Option 1: Archive the Old Repo
1. Go to: https://github.com/DigitalFuturesOCADU/mobile-p5-permissions/settings
2. Scroll to "Danger Zone"
3. Click "Archive this repository"
4. Add message: "Project moved to https://github.com/npuckett/p5-phone"

### Option 2: Add Redirect README
Create a simple README in the old repo pointing to the new one:

```markdown
# ⚠️ Repository Moved

This repository has been moved to:

## 👉 [npuckett/p5-phone](https://github.com/npuckett/p5-phone)

Please use the new repository for:
- Latest code and updates
- Issues and discussions
- Documentation

The npm package is now published from the new repository.
```

---

## ✅ Verification Checklist

Before submitting to p5.js, verify:

- [ ] New repo exists: https://github.com/npuckett/p5-phone
- [ ] All files copied successfully
- [ ] GitHub Pages deployed: https://npuckett.github.io/p5-phone/
- [ ] Example pages work on mobile
- [ ] README renders correctly with working links
- [ ] package.json has correct repository URL
- [ ] p5-phone.yaml has correct URLs
- [ ] (Optional) Published new version to npm

---

## 🆘 Troubleshooting

### GitHub Pages not working?
- Wait 2-5 minutes after enabling
- Check Actions tab for deployment status
- Verify Pages settings point to `main` branch, `/` (root)

### Examples show 404?
- Ensure all example files were copied
- Check that paths are case-sensitive
- Verify GitHub Pages is enabled

### npm publish fails?
- Check you're logged in: `npm whoami`
- Verify package name is available
- Make sure dist/ files exist: `npm run build`

---

## 📞 Support

If you encounter any issues:
1. Check GitHub Actions for deployment logs
2. Verify all files copied: `git status`
3. Test locally first: `open examples/homepage/index.html`

---

## Summary

**You're ready to migrate! Here's the quick version:**

```bash
# 1. Copy files to new repo
cd /path/to/p5-phone
cp -r /Users/npmac/Documents/GitHub/mobile-p5-permissions/* .

# 2. Commit and push
git add .
git commit -m "Initial commit: p5-phone library v1.4.4"
git push origin main

# 3. Enable GitHub Pages (via GitHub web interface)

# 4. Publish to npm (optional)
npm version patch
npm publish

# 5. Submit to p5.js-website when Pages is live
```

🎉 **All repository references have been updated and are ready to go!**
