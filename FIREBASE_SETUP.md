# Firebase Setup Instructions for Salesman Tracker

This guide will help you set up Firebase Authentication with Google OAuth for the Salesman Tracker application.

## Prerequisites

- A Google account
- Node.js installed on your machine
- The Salesman Tracker application code

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "salesman-tracker")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, click on "Authentication" in the left sidebar
2. Click on the "Get started" button
3. Go to the "Sign-in method" tab
4. Click on "Google" from the list of providers
5. Toggle the "Enable" switch
6. Enter your project support email
7. Click "Save"

## Step 3: Configure Authorized Domains

1. Still in the "Sign-in method" tab, scroll down to "Authorized domains"
2. Add your domains:
   - For development: `localhost`
   - For production: your actual domain (e.g., `yourdomain.com`)

## Step 4: Get Firebase Configuration

1. Click on the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click on the web app icon (`</>`) to create a web app
5. Enter an app nickname (e.g., "salesman-tracker-web")
6. Check "Also set up Firebase Hosting" if you plan to deploy (optional)
7. Click "Register app"
8. Copy the Firebase configuration object

## Step 5: Set Up Environment Variables

1. In your project root directory, create a `.env` file
2. Copy the contents from `.env.example`
3. Replace the placeholder values with your actual Firebase configuration:

```bash
REACT_APP_FIREBASE_API_KEY=your_actual_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_actual_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
REACT_APP_FIREBASE_APP_ID=your_actual_app_id
```

## Step 6: Set Up Firestore Database

1. In Firebase Console, click on "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database
5. Click "Done"

## Step 7: Configure Firestore Security Rules

Replace the default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own trips
    match /trips/{tripId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.token.email.matches('.*admin.*'));
    }
    
    // Allow authenticated users to read/write user data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 8: Test the Setup

1. Start your development server:
   ```bash
   npm start
   ```

2. Navigate to `http://localhost:3000`
3. Try logging in with Google OAuth
4. Check that trips are created and stored in Firestore

## Troubleshooting

### Common Issues:

1. **"Firebase configuration not found"**
   - Make sure your `.env` file is in the root directory
   - Verify all environment variables are correctly named with `REACT_APP_` prefix
   - Restart your development server after adding environment variables

2. **"This domain is not authorized"**
   - Add `localhost` to authorized domains in Firebase Console
   - For production, add your actual domain

3. **"Permission denied" errors**
   - Check your Firestore security rules
   - Ensure users are properly authenticated before accessing data

4. **Google Sign-in popup blocked**
   - Allow popups for your domain in browser settings
   - Try using `signInWithRedirect` instead of `signInWithPopup` if issues persist

### Testing Accounts:

For testing purposes, you can use:
- **Admin**: Any Google account with "admin" in the email address
- **Salesman**: Any other Google account

## Production Deployment

Before deploying to production:

1. Update Firestore security rules to be more restrictive
2. Add your production domain to Firebase authorized domains
3. Remove `localhost` from authorized domains
4. Set up proper environment variables in your hosting platform
5. Enable Firebase App Check for additional security

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify Firebase configuration in the Firebase Console
3. Ensure all required Firebase services are enabled
4. Check that your `.env` file is properly configured and not committed to version control
