# Database Data Persistence Explanation

## Why Data is Lost on Reinstall

### Important: This is Normal Behavior

When you **reinstall** the Expo app (uninstall and reinstall), **ALL data is deleted**. This is because:

1. **Expo SQLite stores databases in the app's document directory**
   - Location: App's private document directory (not accessible to users)
   - When you uninstall the app, this directory is completely deleted
   - When you reinstall, a fresh empty directory is created

2. **This happens in both Development and Production**
   - Development: Every time you reinstall, data is lost
   - Production: Users who uninstall and reinstall will lose their data

## How Data Persistence Works

### ✅ Data Persists When:
- App is **updated** (not uninstalled)
- App is **closed and reopened**
- Device is **restarted**
- App is **backgrounded** and brought back

### ❌ Data is Lost When:
- App is **uninstalled** and **reinstalled**
- App data is **cleared** from device settings
- Device is **factory reset**

## Solutions for Production

### Option 1: Cloud Backup (Recommended)
- Store data in a cloud database (Firebase, Supabase, AWS, etc.)
- Sync data on app start
- Users can access data from any device

### Option 2: Export/Import Feature
- Allow users to export their data (JSON/CSV)
- Allow users to import data back
- Store export file in device storage or cloud

### Option 3: Account-Based System
- Require user accounts
- Store all data on server
- App syncs with server on login

## Current Behavior

The app currently:
- ✅ Creates default accounts (HR, Manager, COO) automatically on first launch
- ✅ Persists data during normal app usage
- ❌ Loses all data on reinstall (this is expected)

## For Development/Testing

If you need to preserve data during development:
1. **Don't uninstall** the app - just close and reopen
2. Use **Expo Go** - data persists between reloads
3. Use **development builds** - data persists until you uninstall

## Database Location

The database file is stored at:
- **Android**: `/data/data/[package-name]/databases/peregrine.db`
- **iOS**: `[App Documents]/peregrine.db`

This location is:
- ✅ Private to your app
- ✅ Automatically backed up by iOS/Android (if enabled)
- ❌ Deleted when app is uninstalled

