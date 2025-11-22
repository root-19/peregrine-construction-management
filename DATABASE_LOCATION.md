# Database File Location - Bakit Hindi Mo Makita ang Database Files?

## ❓ Bakit Hindi Mo Makita ang Database Files?

**Sagot**: Ang database files ay naka-store sa **app's private document directory**, hindi sa project folder mo. Kaya hindi mo sila makikita sa file explorer.

## 📍 Saan Naka-store ang Database?

### Android:
```
/data/data/com.yourpackage.peregrine/databases/peregrine.db
```

### iOS:
```
[App Documents Directory]/peregrine.db
```

**Important**: Ang location na ito ay:
- ✅ **Private** - Hindi accessible sa file explorer
- ✅ **Secure** - Protected ng operating system
- ✅ **Automatic** - Ginagawa ng Expo SQLite
- ❌ **Hindi visible** - Hindi mo makikita sa normal file browsing

## 🔍 Paano Makita ang Database Files?

### Option 1: Using ADB (Android Debug Bridge)

```bash
# 1. Connect your Android device via USB
# 2. Enable USB debugging
# 3. Open terminal/command prompt

# Check if device is connected
adb devices

# Open shell
adb shell

# Navigate to app directory (replace with your package name)
cd /data/data/com.yourpackage.peregrine/databases

# List files
ls -la

# You'll see: peregrine.db
```

### Option 2: Using Expo Dev Tools

```bash
# Run app with Expo
npx expo start

# Check logs - makikita mo ang database path
# Look for: "Database file: peregrine.db"
```

### Option 3: Using React Native Debugger

1. Install React Native Debugger
2. Open DevTools
3. Check Application → Storage → SQLite
4. You'll see the database there

### Option 4: Add Debug Function to App

```typescript
// Add this function to check database
import * as FileSystem from 'expo-file-system';

const checkDatabaseLocation = async () => {
  const dbPath = `${FileSystem.documentDirectory}SQLite/peregrine.db`;
  console.log('Database path:', dbPath);
  
  const fileInfo = await FileSystem.getInfoAsync(dbPath);
  console.log('Database exists:', fileInfo.exists);
  console.log('Database size:', fileInfo.size);
};
```

## ✅ Paano I-verify na Naka-connect ang Database?

### Test 1: Check Logs
Kapag nag-run ang app, dapat makita mo sa logs:
```
✅ Database instance created/retrieved
✅ Database initialized successfully
📁 Database file: peregrine.db
```

### Test 2: Create Data and Check
1. Create a project sa app
2. Close app
3. Reopen app
4. ✅ Dapat nandun pa rin ang project

### Test 3: Check Database Functions
```typescript
// Sa app, try this:
const testDB = async () => {
  const projects = await getAllProjects();
  console.log('Projects count:', projects.length);
  console.log('Projects:', projects);
};
```

## 🎯 Key Points

1. ✅ **Database IS connected** - Kahit hindi mo makita ang files
2. ✅ **Data IS stored** - Sa app's private directory
3. ✅ **Database works** - Kahit hindi mo makita ang physical files
4. ❌ **Project folder files** - Reference lang, hindi actual database

## 💡 Kung Gusto Mong Makita ang Actual Database

Kung gusto mong makita at i-inspect ang actual database:

1. **Use ADB** (Android) o **Xcode** (iOS)
2. **Export database** - Copy from device to computer
3. **Use SQLite Browser** - Open and inspect the .db file

Pero para sa normal development, **hindi mo kailangan makita ang files**. Ang importante ay:
- ✅ Database nagwo-work
- ✅ Data naka-store
- ✅ Data persists

## 📝 Summary

| Question | Answer |
|----------|--------|
| **Naka-connect ba ang database?** | ✅ Oo, automatic na connected |
| **Nasaan ang database files?** | App's private document directory |
| **Bakit hindi ko makita?** | Private directory, protected ng OS |
| **Paano i-verify?** | Check logs, test data persistence |
| **Gumagana ba?** | ✅ Oo, kahit hindi mo makita ang files |

**Bottom line**: Ang database ay **naka-connect at gumagana**, kahit hindi mo makita ang physical files. Ito ay normal behavior ng Expo SQLite.

