# 🚀 Update Instructions: Delete Functionality

I have updated your code to allow deleting old or broken templates. Detailed instructions to apply these changes are below.

## Step 1: Update Google Apps Script (Backend)

The backend now handles the `deleteForm` action, which removes data from the Sheet, Drive, and Cache.

1.  Open your [Google Apps Script Dashboard](https://script.google.com/).
2.  Open your **Dynamic Form Builder** project.
3.  Open the main script file (usually `Code.gs`).
4.  **Delete everything** in that file.
5.  **Copy & Paste** the entire content from your local file:
    *   `e:\My Website\Antigravity\MarathiForm\1\google-apps-script.js`
6.  **Save** (Ctrl+S).
7.  **IMPORTANT:** Click **Deploy** > **New Deployment**.
    *   Description: "Added delete functionality"
    *   Click **Deploy**.
    *   (You don't need to change the URL, usually, but if you do, update it in your HTML).

## Step 2: Update Frontend (index.html)

The frontend now has a "Delete" button in the "Load Form" modal.

1.  Open your **GitHub Desktop** or git tool.
2.  Commit the changes to `index.html`.
3.  **Push** the changes to GitHub.
4.  Wait for GitHub Pages to update (usually 1-2 minutes).

## Step 3: Clean Up & Fix Portal

1.  Open your Builder (e.g., `https://pradeepparmar902.github.io/dynamic_form/`).
2.  Click **Load Form**.
3.  Use the **Delete** button to remove the broken/old forms (like the ones causing errors).
4.  **Create New Forms**:
    *   Click **New Form**.
    *   Add your elements.
    *   Click **Save Form**.
5.  **Configure Portal**:
    *   Go to **Portal View** tab.
    *   Click **Refresh Forms List**.
    *   Select your NEW forms.
    *   Click **Save Portal Collection**.

## Step 4: Verify

1.  Open your Portal Viewer URL.
2.  It should now load your new forms correctly without the "File not found" error.
