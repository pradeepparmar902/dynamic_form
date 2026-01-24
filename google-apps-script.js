/**
 * DYNAMIC FORM BUILDER & RENDERER BACKEND
 * ---------------------------------------
 * Handles:
 * 1. Saving/Loading Form Schemas (stored in 'System_Forms_Registry' sheet)
 * 2. Serving the Admin Builder and User Viewer interfaces
 * 3. Processing Form Submissions to specific configured Sheets
 */

const REGISTRY_SHEET_NAME = 'System_Forms_Registry';

/**
 * SERVE HTML
 * Usage:
 * - Deploy URL -> Admin Builder
 * - Deploy URL?view=form&id=123 -> Form Viewer
 */
function doGet(e) {
    const view = e.parameter.view;
    const formId = e.parameter.id;

    if (view === 'form' && formId) {
        // Serve the Viewer
        const template = HtmlService.createTemplateFromFile('viewer');
        template.formId = formId;
        return template.evaluate()
            .setTitle('Form Viewer')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else {
        // Serve the Admin Builder
        return HtmlService.createTemplateFromFile('index')
            .evaluate()
            .setTitle('Dynamic Form Builder')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
}

/**
 * 
 * API: SAVE FORM SCHEMA
 * 
 * @param {string} formId - Unique ID/Number for the form
 * @param {object} schema - The JSON structure of the form (fields, layout)
 * @param {object} config - Configuration (Target Sheet URL, Sheet Name)
 */
function saveForm(formId, schema, config) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);

        // Initialize Registry if not exists
        if (!registrySheet) {
            registrySheet = ss.insertSheet(REGISTRY_SHEET_NAME);
            registrySheet.appendRow(['Form ID', 'Schema JSON', 'Config JSON', 'Last Updated']);
            registrySheet.getRange(1, 1, 1, 4).setFontWeight('bold');
        }

        const payloadSchema = JSON.stringify(schema);
        const payloadConfig = JSON.stringify(config);
        const timestamp = new Date();

        // Check if ID exists -> Update, else Append
        // This is a simple linear search. For huge datasets, use a Dictionary object approach.
        const data = registrySheet.getDataRange().getValues();
        let foundIndex = -1;

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(formId)) {
                foundIndex = i + 1; // 1-based row index
                break;
            }
        }

        if (foundIndex > 0) {
            // Update
            registrySheet.getRange(foundIndex, 2).setValue(payloadSchema);
            registrySheet.getRange(foundIndex, 3).setValue(payloadConfig);
            registrySheet.getRange(foundIndex, 4).setValue(timestamp);
        } else {
            // Create
            registrySheet.appendRow([formId, payloadSchema, payloadConfig, timestamp]);
        }

        return { status: 'success', message: `Form ${formId} saved successfully.` };

    } catch (err) {
        return { status: 'error', message: err.toString() };
    }
}

/**
 * API: GET FORM SCHEMA
 */
function getForm(formId) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);

        if (!registrySheet) return { status: 'error', message: 'Registry not found.' };

        const data = registrySheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(formId)) {
                return {
                    status: 'success',
                    formId: formId,
                    schema: JSON.parse(data[i][1]),
                    config: JSON.parse(data[i][2])
                };
            }
        }

        return { status: 'error', message: 'Form not found.' };

    } catch (err) {
        return { status: 'error', message: err.toString() };
    }
}

/**
 * API: SUBMIT FORM DATA
 * Handles routing to external sheets and dynamic column creation
 */
function submitForm(formId, formData) {
    try {
        // 1. Get Config
        const formRecord = getForm(formId);
        if (formRecord.status !== 'success') throw new Error('Form configuration not found.');

        const config = formRecord.config;
        const targetUrl = config.targetSheetUrl;
        const targetSheetName = config.targetSheetName || 'Form Responses';

        if (!targetUrl) throw new Error('Target Sheet URL is not configured for this form.');

        // 2. Open Target Spreadsheet
        let targetSs;
        try {
            targetSs = SpreadsheetApp.openByUrl(targetUrl);
        } catch (e) {
            throw new Error('Could not open Target Sheet. Check URL and Permissions.');
        }

        let targetSheet = targetSs.getSheetByName(targetSheetName);
        if (!targetSheet) {
            // Create if missing
            targetSheet = targetSs.insertSheet(targetSheetName);
        }

        // 3. Handle Headers (Dynamic)
        // We scan the incoming data keys. 
        // If a key doesn't exist in the header row, we add it.

        // Always ensure Timestamp is first
        if (!formData['Timestamp']) {
            formData['Timestamp'] = new Date().toLocaleString();
        }

        const lastCol = targetSheet.getLastColumn();
        let headers = [];
        if (lastCol > 0) {
            headers = targetSheet.getRange(1, 1, 1, lastCol).getValues()[0];
        }

        const keys = Object.keys(formData);

        // Map of Header Name -> Column Index (0-based)
        const headerMap = {};
        headers.forEach((h, i) => headerMap[h] = i);

        // Identify new headers
        const newHeaders = [];
        keys.forEach(key => {
            if (!headerMap.hasOwnProperty(key)) {
                newHeaders.push(key);
            }
        });

        // Append new headers if any
        if (newHeaders.length > 0) {
            const startCol = headers.length + 1;
            targetSheet.getRange(1, startCol, 1, newHeaders.length).setValues([newHeaders]);
            // Update local map
            newHeaders.forEach((h, i) => {
                headerMap[h] = headers.length + i;
            });
        }

        // 4. Construct Row Data
        // We need to fetch the *current* full set of headers again or construct based on map
        const finalLastCol = targetSheet.getLastColumn();
        const finalHeaders = targetSheet.getRange(1, 1, 1, finalLastCol).getValues()[0];

        const row = finalHeaders.map(header => {
            return formData[header] || '';
        });

        // 5. Append
        targetSheet.appendRow(row);

        return { status: 'success', message: 'Data submitted successfully.' };

    } catch (err) {
        return { status: 'error', message: err.toString() };
    }
}

/**
 * API: TRANSLATE TEXT (English -> Marathi)
 */
function translateText(text, targetLang) {
    try {
        if (!text) return '';
        const lang = targetLang || 'mr';
        return LanguageApp.translate(text, 'en', lang);
    } catch (e) {
        return text;
    }
}

/**
 * Helper: Get Script URL for Preview Link
 */
function getScriptUrl() {
    return ScriptApp.getService().getUrl();
}

/**
 * Helper to include files in HTML (if we split css/js later)
 */
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
