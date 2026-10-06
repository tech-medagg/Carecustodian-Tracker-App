# Deployment Troubleshooting Guide

## Blank Page After Deployment - Common Fixes

### 1. **Check Browser Console for Errors**
Open your deployed app and press `F12` to open Developer Tools. Look for:
- JavaScript errors in the Console tab
- Failed network requests in the Network tab
- Any red error messages

### 2. **Environment Variables Setup**
Ensure your deployment platform has all required environment variables:

```bash
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

**For different platforms:**

#### Netlify:
1. Go to Site Settings → Environment Variables
2. Add each variable with `REACT_APP_` prefix

#### Vercel:
1. Go to Project Settings → Environment Variables
2. Add each variable with `REACT_APP_` prefix

#### Firebase Hosting:
1. Environment variables are built into the app during `npm run build`
2. Make sure `.env` file exists locally during build

### 3. **Build Configuration Issues**

#### Check package.json build script:
```json
{
  "scripts": {
    "build": "react-scripts build"
  }
}
```

#### For HashRouter (recommended for static hosting):
Your app already uses HashRouter, which is correct for static hosting.

### 4. **Firebase Configuration**

#### Check Firebase project settings:
1. **Authorized Domains**: Add your deployment domain
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add your production domain (e.g., `yourapp.netlify.app`)

2. **Firebase Rules**: Ensure Firestore rules allow read/write
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. **Deployment Platform Specific Fixes**

#### Netlify:
Create `public/_redirects` file:
```
/*    /index.html   200
```

#### Vercel:
Create `vercel.json` file:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 6. **Debug Steps**

1. **Local Testing:**
   ```bash
   npm run build
   npx serve -s build
   ```
   Test the production build locally.

2. **Check Build Output:**
   - Ensure `build/` folder contains `index.html`
   - Check `build/static/js/` contains your app files

3. **Console Logging:**
   The updated App.js now includes console logging. Check browser console for:
   - "App component mounted"
   - "Current URL" and "Current hash"
   - User authentication status

### 7. **Common Fixes**

#### Fix 1: Clear Browser Cache
- Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private mode

#### Fix 2: Check Base URL
If deploying to a subdirectory, update `package.json`:
```json
{
  "homepage": "https://yourdomain.com/subfolder"
}
```

#### Fix 3: Rebuild and Redeploy
```bash
rm -rf build node_modules package-lock.json
npm install
npm run build
```

### 8. **Testing Checklist**

- [ ] Environment variables are set in deployment platform
- [ ] Firebase project has correct authorized domains
- [ ] Build completes without errors
- [ ] Browser console shows no JavaScript errors
- [ ] Network tab shows successful API calls
- [ ] Authentication works (can login)
- [ ] Routes work (can navigate between pages)

### 9. **Emergency Fallback**

If still having issues, add this to your `public/index.html` for debugging:

```html
<script>
  console.log('Index.html loaded');
  window.addEventListener('load', function() {
    console.log('Window loaded');
    if (!document.getElementById('root').innerHTML) {
      console.error('React app did not mount');
      document.getElementById('root').innerHTML = '<h1>App failed to load. Check console for errors.</h1>';
    }
  });
</script>
```

### 10. **Get Help**

If none of these fixes work:
1. Check the browser console and note exact error messages
2. Test the same build locally with `npx serve -s build`
3. Compare working local version with deployed version
4. Contact your deployment platform support with specific error messages

---

## Quick Deployment Commands

### Netlify:
```bash
npm run build
npx netlify-cli deploy --prod --dir=build
```

### Vercel:
```bash
npm run build
npx vercel --prod
```

### Firebase Hosting:
```bash
npm run build
npx firebase deploy
```
