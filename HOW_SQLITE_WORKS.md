# Paano Gumagana ang SQLite sa Expo

## ❌ Common Misconception

**Mali**: "Ang `database.db/database.sqlite` file sa project folder ay ang actual database"
**Tama**: Ang file na iyon ay **reference/schema file lang**. Hindi iyon ang actual database na ginagamit ng app.

## ✅ Paano Talaga Gumagana

### 1. **Expo SQLite Database Path**

```typescript
// Sa code natin:
SQLite.openDatabaseSync('peregrine.db')
```

**Ano ang nangyayari:**
- Expo SQLite ay **automatic** na nag-create ng database file
- Naka-store sa **app's private document directory**
- **Hindi** sa project folder mo

### 2. **Actual Database Location**

**Android:**
```
/data/data/com.yourpackage.peregrine/databases/peregrine.db
```

**iOS:**
```
[App Documents Directory]/peregrine.db
```

**Hindi mo makikita ito sa:**
- ❌ Project folder (`peregrineDB/database.db/`)
- ❌ File explorer (unless rooted/jailbroken)
- ❌ Normal file access

### 3. **Bakit May `database.db` Folder sa Project?**

Ang `peregrineDB/database.db/` folder ay:
- ✅ **Schema reference** - para sa documentation
- ✅ **SQL scripts** - para sa manual setup
- ❌ **Hindi** ang actual database na ginagamit ng app

## 📊 Data Storage Flow

```
1. App Starts
   ↓
2. initDatabase() called
   ↓
3. Expo SQLite creates: peregrine.db (in app's private directory)
   ↓
4. Tables created: hr_accounts, users, projects, etc.
   ↓
5. Default accounts created: HR, Manager, COO
   ↓
6. Data stored in: peregrine.db (in app's private directory)
   ↓
7. Data persists until: App is uninstalled
```

## 🔍 Paano Makita ang Actual Database?

### Option 1: Using Expo Dev Tools
```bash
# Check logs - makikita mo ang database path
npx expo start
# Look for: "Database file: peregrine.db"
```

### Option 2: Using ADB (Android)
```bash
# Connect device
adb shell

# Navigate to app directory
cd /data/data/com.yourpackage.peregrine/databases

# List files
ls -la

# You'll see: peregrine.db
```

### Option 3: Using Xcode (iOS)
1. Open Xcode
2. Window → Devices and Simulators
3. Select your device
4. Download Container
5. Navigate to: App Data → Documents → peregrine.db

## ✅ Data IS Being Stored!

**Oo, naka-store ang data!** Pero sa:
- ✅ App's private document directory
- ✅ Hindi sa project folder
- ✅ Persists hanggang ma-uninstall ang app

## 🧪 Paano I-verify na Naka-store ang Data?

### Test 1: Create Data
1. Create a project
2. Close app
3. Reopen app
4. ✅ Project should still be there

### Test 2: Check Logs
```typescript
// Add this to see database info
console.log('Database file: peregrine.db');
console.log('Data is stored in app\'s document directory');
```

### Test 3: Check Database
```typescript
// Add function to check data
const checkData = async () => {
  const projects = await getAllProjects();
  console.log('Projects in database:', projects.length);
  console.log('Projects:', projects);
};
```

## 📝 Summary

| Item | Location | Purpose |
|------|----------|---------|
| **Actual Database** | App's document directory | Stores all app data |
| **database.db folder** | Project folder | Reference/schema only |
| **database.sqlite file** | Project folder | Not used by app |

## 🎯 Key Points

1. ✅ **Data IS stored** - sa app's private directory
2. ✅ **Data persists** - hanggang ma-uninstall
3. ✅ **Database path** - `peregrine.db` (simple name)
4. ❌ **Project folder file** - reference lang, hindi actual database

## 💡 Kung Gusto Mong I-backup ang Database

Kung gusto mong i-backup ang actual database:

```typescript
// Export database function (future feature)
export const exportDatabase = async () => {
  // Copy peregrine.db to device storage
  // Or upload to cloud
};
```

Pero sa ngayon, ang data ay **naka-store na** sa SQLite database sa app's private directory!

