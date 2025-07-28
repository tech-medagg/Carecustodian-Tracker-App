# Google Maps API Setup Guide

## Current Issues
- "This page can't load Google Maps correctly" error
- Trip Tracker not working in sales tracker
- Google Maps API not loading

## Step-by-Step Solution

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your Project ID

### 2. Enable Required APIs

In your Google Cloud Console, enable these APIs:

1. **Maps JavaScript API**
   - Go to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click "Enable"

2. **Places API**
   - Search for "Places API"
   - Click "Enable"

3. **Directions API**
   - Search for "Directions API"
   - Click "Enable"

4. **Geocoding API**
   - Search for "Geocoding API"
   - Click "Enable"

### 3. Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. Click "Restrict Key" and set restrictions:
   - Application restrictions: "HTTP referrers (web sites)"
   - Add your domain: `localhost:3000/*` (for development)
   - API restrictions: Select the 4 APIs you enabled above

### 4. Enable Billing

**IMPORTANT**: Google Maps API requires billing to be enabled, even for free tier usage.

1. Go to "Billing" in Google Cloud Console
2. Link a billing account to your project
3. The free tier includes:
   - 28,500 free calls per month for Maps JavaScript API
   - 1,000 free calls per month for Places API
   - 2,500 free calls per month for Directions API

### 5. Create Environment File

Create a `.env` file in your project root (same level as package.json):

```bash
# .env file
REACT_APP_GOOGLE_MAPS_API_KEY=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM5ZjA3YzVmMWJhYTRhOTRhZTJmYmYwMWViNWJjMmFjIiwiaCI6Im11cm11cjY0In0=
```

Replace `your_actual_api_key_here` with the API key you copied in step 3.

### 6. Restart Development Server

After creating the `.env` file:

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm start
```

### 7. Verify Setup

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Refresh your page
4. You should see debug logs showing:
   - "Google Maps API Key available: true"
   - "API Key length: [some number]"

### 8. Test Functionality

1. The map should load without the "This page can't load Google Maps correctly" error
2. The destination input should show autocomplete suggestions
3. Trip tracking should work properly

## Troubleshooting

### If you still see the error:

1. **Check API Key**: Make sure your API key is correct and not truncated
2. **Check Billing**: Ensure billing is enabled in Google Cloud Console
3. **Check API Restrictions**: Make sure all 4 APIs are enabled
4. **Check Domain Restrictions**: Ensure `localhost:3000/*` is in your allowed referrers
5. **Check Console Errors**: Look for specific error messages in browser console

### Common Error Messages:

- **"This page can't load Google Maps correctly"**: Usually means API key is invalid or billing is not enabled
- **"API key not valid"**: Check your API key spelling and restrictions
- **"Quota exceeded"**: You've exceeded the free tier limits

### Debug Information:

The application now includes debug logging. Check your browser console for:
- API key availability status
- API key length
- Place selection details
- LoadScript errors

## Security Notes

- Never commit your `.env` file to version control
- Use domain restrictions on your API key
- Monitor your API usage in Google Cloud Console
- Consider setting up usage alerts

## Cost Information

- Free tier is generous for development and small applications
- Monitor usage in Google Cloud Console > Billing
- Set up budget alerts to avoid unexpected charges 