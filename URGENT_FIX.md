# 🔧 URGENT FIX: Portal Forms Not Loading

## The Real Problem

Based on your screenshots, I can see:
1. ✅ Portal configuration IS saved (you have 2 forms checked)
2. ❌ But the forms themselves can't be loaded from Google Sheets/Drive
3. ❌ Error: "Form file not found in Sheet or Drive"

This means the **form IDs exist in the portal config, but the actual form data is missing or corrupted** in your Google Sheet registry (column 6).

---

## 🚀 QUICK FIX (Choose ONE method)

### Method 1: Automated Fix Script (RECOMMENDED)

1. **Open** Google Apps Script Editor
2. **Create** a new file or open an existing one
3. **Copy** all code from `fix-portal-comprehensive.gs`
4. **Paste** it into the script editor
5. **Run** the function: `fixPortalConfiguration()`
6. **Check** the logs (View → Logs or Ctrl+Enter)
7. **Done!** The script will:
   - Find all valid forms
   - Remove broken forms
   - Create a working portal config

---

### Method 2: Manual Fix (If you know which forms work)

1. **Open** `index.html` (your form builder)
2. **For EACH form** that appears in your portal:
   - Click "Load Form"
   - Select the form
   - Click "Save Form" (this refreshes the data in Google)
3. **Go to** "Portal View" tab
4. **Click** "Refresh Forms List"
5. **Re-check** your forms
6. **Click** "Save Portal Collection"

---

### Method 3: Start Fresh

If the above don't work:

1. **Open** Google Apps Script Editor
2. **Run** this one-liner in the script editor:

```javascript
function clearPortalConfig() {
  PropertiesService.getScriptProperties().deleteProperty('_PORTAL_CONFIG');
  Logger.log('Portal config cleared');
}
```

3. **Then** follow Method 2 above

---

## 🔍 Debug Tool

I've created `debug-portal.html` for you:

1. **Open** `debug-portal.html` in your browser
2. **Enter** your GAS API URL
3. **Click** "Run Full Diagnostics"
4. **Review** the results - it will tell you exactly which forms are broken

---

## 📋 What's Happening

Your Google Sheet registry (ID: `1d5zAeorKdGEyirqNMaT9c9gCg0vyIIKKcEILLiOmJfE`) has a column 6 called "Schema Data". 

**The problem:** Some forms in your portal config have:
- ❌ Empty data in column 6
- ❌ Corrupted JSON
- ❌ Missing schema array

**The fix:** Re-save each form in the builder to refresh this data.

---

## ✅ After Fixing

1. Run `simple-test.html` again
2. All tests should pass
3. Your portal should load correctly

---

## 🆘 If Still Not Working

Run this in Google Apps Script to see what's in your registry:

```javascript
function debugRegistry() {
  const ss = SpreadsheetApp.openById('1d5zAeorKdGEyirqNMaT9c9gCg0vyIIKKcEILLiOmJfE');
  const sheet = ss.getSheetByName('list');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    Logger.log(`Form: ${data[i][1]} (${data[i][0]})`);
    Logger.log(`Has data in col 6: ${data[i][5] ? 'YES' : 'NO'}`);
    Logger.log('---');
  }
}
```

This will show you which forms have data and which don't.
