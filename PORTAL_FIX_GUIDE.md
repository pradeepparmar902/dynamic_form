# Portal Configuration Fix Guide

## The Problem

Your test is showing: **"⚠️ No forms configured in portal"**

This means the portal configuration is empty - you haven't selected which forms should appear in your portal yet.

![Portal Fix Steps](file:///C:/Users/Windows/.gemini/antigravity/brain/e66bc596-9087-4773-8b40-4288bfbcc1ec/portal_fix_steps_1769419719569.png)

## Solution Options

You have **3 ways** to fix this:

---

### Option 1: Use the Builder UI (Recommended)

1. **Open** `index.html` in your browser (the form builder)
2. **Click** the "Portal Designer" button in the header (orange button with grid icon)
   - OR click the "Portal View" tab in the left sidebar
3. **Click** "↻ Refresh Forms List" button
4. **Check the boxes** next to the forms you want in your portal
5. **Set the order** numbers (1, 2, 3, etc.) for each form
6. **Click** "Save Portal Collection"

✅ Done! Now run your test again.

---

### Option 2: Use the Manual Script (Quick Fix)

If the builder UI doesn't work, you can manually configure the portal:

1. **Open** Google Apps Script Editor
2. **Copy** the code from `manual-portal-setup.gs`
3. **Paste** it into your script editor
4. **Edit** the form IDs and names in the `portalConfig` object (lines 11-14):
   ```javascript
   forms: [
     { id: "YOUR_FORM_ID_1", name: "Form Name 1", order: 1 },
     { id: "YOUR_FORM_ID_2", name: "Form Name 2", order: 2 },
   ]
   ```
5. **Run** the `manuallySetPortalConfig()` function
6. **Check** the logs to confirm it saved

✅ Done! Run your test again.

---

### Option 3: Get Your Form IDs First

If you don't know your form IDs:

1. **Open** `simple-test.html` in your browser
2. **Enter** your GAS URL
3. **Look at** "Test 3: Available Forms" - it will show all your form IDs
4. **Copy** those IDs and use Option 1 or 2 above

---

## What I Fixed

I added the missing `refreshPortalList()` function to your `index.html` file. This function:
- Fetches all available forms from your Google Apps Script
- Displays them in the Portal View tab with checkboxes
- Allows you to select which forms appear in the portal
- Lets you set the display order

The function now properly integrates with your existing `savePortalSettings()` function.

---

## Next Steps

1. Choose one of the options above to configure your portal
2. Run `simple-test.html` again
3. All tests should pass ✅
4. Your portal will be ready to use!

---

## Files Modified

- ✅ `index.html` - Added `refreshPortalList()` function and updated `callApi()` to support portal configuration
