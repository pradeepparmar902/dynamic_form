/**
 * DYNAMIC FORM BUILDER & RENDERER BACKEND
 * ---------------------------------------
 * Handles:
 * 1. Saving/Loading Form Schemas (stored in 'System_Forms_Registry' sheet)
 * 2. Serving the Admin Builder and User Viewer interfaces
 * 3. Processing Form Submissions to specific configured Sheets
 */

const REGISTRY_SS_ID = '1d5zAeorKdGEyirqNMaT9c9gCg0vyIIKKcEILLiOmJfE';
const REGISTRY_SHEET_NAME = 'list';
const DRIVE_FOLDER_ID = '1XEWZ_j7vLL7iDSVPudARkofzZ6Nw2b6y';

/**
 * SERVE API GET REQUESTS
 */
function doGet(e) {
    try {
        const action = e.parameter.action;
        const formId = e.parameter.id;

        // 1. Handle API Actions
        if (action === 'getForm' && formId) return createJsonResponse(getForm(formId));
        if (action === 'listTemplates') return createJsonResponse(listTemplates());
        if (action === 'getScriptUrl') return createJsonResponse(getScriptUrl());
        if (action === 'getPortalConfig') return createJsonResponse(getPortalConfig());
        if (action === 'translateText') {
            const translated = translateText(e.parameter.text, e.parameter.targetLang, e.parameter.sourceLang);
            return createJsonResponse({ status: 'success', translated: translated });
        }
        if (action === 'ping') return createJsonResponse({ status: 'success', message: 'API Backend is Active!' });

        // 2. Default Status Message (Since you are hosting HTML on Hostinger)
        return HtmlService.createHtmlOutput(`
                <div style="font-family: sans-serif; padding: 20px; text-align: center;">
                    <h2 style="color: #007bff;">MarathiForm API Backend</h2>
                    <p>This script is running as a pure data backend.</p>
                    <p style="color: #666; font-size: 0.9em;">Frontend is hosted at: <b>${e.parameter.host || 'Your Domain'}</b></p>
                    <p style="font-size: 0.8em; color: green;">Status: Online & Ready</p>
                </div>
            `).setTitle('Backend Status');
    } catch (err) {
        return createJsonResponse({ status: 'error', message: 'GET Error: ' + err.toString() });
    }
}

/**
 * Handle POST API requests (CORS enabled by default for GAS Web Apps)
 */
function doPost(e) {
    let params;
    try {
        // Log incoming for debugging (Check GAS Executions)
        console.log("Post Received: " + JSON.stringify(e));

        if (e.postData && e.postData.contents) {
            params = JSON.parse(e.postData.contents);
        } else {
            // Fallback for different fetch styles
            params = e.parameter;
            // If action is still missing, try to parse the first key (common no-cors side effect)
            if (!params.action) {
                const firstKey = Object.keys(e.parameter)[0];
                if (firstKey) params = JSON.parse(firstKey);
            }
        }

        const action = params.action;
        let result = { status: 'error', message: 'Invalid action: ' + action };

        if (action === 'saveForm') {
            result = saveForm(params.formId, params.schema, params.config, params.metadata);
        } else if (action === 'submitForm') {
            result = submitForm(params.formId, params.formData);
        } else if (action === 'translateText') {
            const translated = translateText(params.text, params.targetLang, params.sourceLang);
            result = { status: 'success', translated: translated };
        } else if (action === 'savePortalConfig') {
            result = savePortalConfig(params.config);
        } else if (action === 'deleteForm') {
            result = deleteForm(params.formId);
        } else if (action === 'ping') {
            result = { status: 'success', message: 'POST Connection Successful!' };
        }

        return createJsonResponse(result);
    } catch (err) {
        console.error("doPost Error: " + err.toString());
        return createJsonResponse({ status: 'error', message: 'Server Process Error: ' + err.toString() });
    }
}

function createJsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 
 * API: SAVE FORM SCHEMA
 * 
 * @param {object} schema - The JSON structure of the form (fields, layout)
 * @param {object} config - Configuration (Target Sheet URL, Sheet Name)
 * @param {object} metadata - Metadata (Description, Allowed Domains)
 */
function saveForm(formId, schema, config, metadata) {
    try {
        metadata = metadata || {};
        // --- SAVE TO REGISTRY SHEET ---
        const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
        let registrySheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);

        // Initialize Registry if not exists
        if (!registrySheet) {
            registrySheet = regSs.insertSheet(REGISTRY_SHEET_NAME);
            registrySheet.appendRow(['Form ID', 'Form Name', 'Description', 'File ID', 'Last Updated', 'Schema Data']);
            registrySheet.getRange(1, 1, 1, 6).setFontWeight('bold');
        }

        const timestamp = new Date();
        const data = registrySheet.getDataRange().getValues();
        let foundIndex = -1;

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(formId)) {
                foundIndex = i + 1;
                break;
            }
        }

        // Add Description/Schema columns if missing (backward compatibility)
        if (data.length > 0) {
            if (data[0].length < 3) {
                registrySheet.insertColumnAfter(2);
                registrySheet.getRange(1, 3).setValue('Description').setFontWeight('bold');
            }
            // Ensure column 6 for 'Schema Data' exists
            const currentHeaders = registrySheet.getRange(1, 1, 1, registrySheet.getLastColumn()).getValues()[0];
            if (currentHeaders.length < 6) {
                registrySheet.getRange(1, 6).setValue('Schema Data').setFontWeight('bold');
            }
        }

        const fullContent = JSON.stringify({
            id: formId,
            schema: schema,
            config: config,
            metadata: metadata,
            savedAt: timestamp
        });

        // --- SAVE TO DRIVE ---
        let fileId = "";
        try {
            const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
            const fileName = `Form_Template_${formId}.json`;
            const fileContent = JSON.stringify(JSON.parse(fullContent), null, 2); // Pretty print for Drive

            const files = folder.getFilesByName(fileName);
            if (files.hasNext()) {
                const file = files.next();
                file.setContent(fileContent);
                fileId = file.getId();
            } else {
                const newFile = folder.createFile(fileName, fileContent, MimeType.PLAIN_TEXT);
                fileId = newFile.getId();
            }
        } catch (driveErr) {
            return { status: 'error', message: `Drive Save Error: ${driveErr.toString()}` };
        }

        // --- UPDATE REGISTRY ---
        const formName = config.formName || formId;
        const description = metadata.description || "";
        if (foundIndex > 0) {
            registrySheet.getRange(foundIndex, 2).setValue(formName);
            registrySheet.getRange(foundIndex, 3).setValue(description);
            registrySheet.getRange(foundIndex, 4).setValue(fileId);
            registrySheet.getRange(foundIndex, 5).setValue(timestamp);
            registrySheet.getRange(foundIndex, 6).setValue(fullContent);
        } else {
            registrySheet.appendRow([formId, formName, description, fileId, timestamp, fullContent]);
        }

        // --- ULTRA-FAST PATH: Cache in PropertiesService (9KB limit) ---
        try {
            if (fullContent.length < 9000) {
                PropertiesService.getScriptProperties().setProperty('CACHE_' + formId, fullContent);
            } else {
                // If too large, clear cache to avoid stale data
                PropertiesService.getScriptProperties().deleteProperty('CACHE_' + formId);
            }
        } catch (cacheErr) {
            console.warn("Cache Write Error: " + cacheErr.toString());
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
        // --- ULTRA-FAST PATH: Check Script Cache first ---
        try {
            const cachedValue = PropertiesService.getScriptProperties().getProperty('CACHE_' + formId);
            if (cachedValue) {
                const parsed = JSON.parse(cachedValue);
                return {
                    status: 'success',
                    formId: formId,
                    schema: parsed.schema,
                    config: parsed.config,
                    metadata: parsed.metadata || {},
                    source: 'cache'
                };
            }
        } catch (e) { console.warn("Cache Read Error"); }

        // --- FAST PATH: Check Registry Sheet next ---
        const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
        const registrySheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);
        if (registrySheet) {
            const data = registrySheet.getDataRange().getValues();
            for (let i = 1; i < data.length; i++) {
                if (String(data[i][0]) === String(formId)) {
                    const schemaData = data[i][5]; // Column 6
                    if (schemaData && schemaData.trim() !== '') {
                        const parsed = JSON.parse(schemaData);
                        return {
                            status: 'success',
                            formId: formId,
                            schema: parsed.schema,
                            config: parsed.config,
                            metadata: parsed.metadata || {}
                        };
                    }
                    break;
                }
            }
        }

        // --- FALLBACK: Check Drive ---
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const fileName = `Form_Template_${formId}.json`;
        const files = folder.getFilesByName(fileName);

        if (files.hasNext()) {
            const file = files.next();
            const content = file.getBlob().getDataAsString();
            const parsed = JSON.parse(content);
            return {
                status: 'success',
                formId: formId,
                schema: parsed.schema,
                config: parsed.config,
                metadata: parsed.metadata || {}
            };
        }

        return { status: 'error', message: 'Form file not found in Sheet or Drive.' };

    } catch (err) {
        return { status: 'error', message: err.toString() };
    }
}

/**
 * API: SUBMIT FORM DATA
 * Handles routing to external sheets and dynamic column creation
 */
/**
 * API: LIST ALL FORM TEMPLATES
 */
function listTemplates() {
    try {
        const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
        const registrySheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);
        if (!registrySheet) return [];

        const data = registrySheet.getDataRange().getValues();
        const templates = [];

        for (let i = 1; i < data.length; i++) {
            templates.push({
                id: data[i][0],
                name: data[i][1],
                description: data[i][2],
                lastUpdated: data[i][4]
            });
        }
        return templates;
    } catch (e) {
        console.error("List Templates Error: " + e.toString());
        return [];
    }
}

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
function translateText(text, targetLang, sourceLang) {
    try {
        if (!text) return '';
        const target = targetLang || 'mr';
        const source = sourceLang || 'en';
        return LanguageApp.translate(text, source, target);
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

/**
 * PORTAL CONFIG: SAVE
 */
function savePortalConfig(config) {
    try {
        PropertiesService.getScriptProperties().setProperty('_PORTAL_CONFIG', JSON.stringify(config));
        return { status: 'success', message: 'Portal configuration saved.' };
    } catch (e) {
        return { status: 'error', message: e.toString() };
    }
}

/**
 * PORTAL CONFIG: GET
 */
function getPortalConfig() {
    try {
        const config = PropertiesService.getScriptProperties().getProperty('_PORTAL_CONFIG');
        return config ? JSON.parse(config) : { forms: [], layout: 'sidebar' };
    } catch (e) {
        return { forms: [], layout: 'sidebar' };
    }
}

/**
 * DELETE FORM
 * Removes form from registry sheet, Drive, and cache
 */
function deleteForm(formId) {
    try {
        let deletedItems = [];

        // 1. Delete from Registry Sheet
        const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
        const registrySheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);

        if (registrySheet) {
            const data = registrySheet.getDataRange().getValues();
            for (let i = 1; i < data.length; i++) {
                if (String(data[i][0]) === String(formId)) {
                    registrySheet.deleteRow(i + 1);
                    deletedItems.push('Registry Sheet');
                    break;
                }
            }
        }

        // 2. Delete from Drive
        try {
            const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
            const fileName = `Form_Template_${formId}.json`;
            const files = folder.getFilesByName(fileName);

            while (files.hasNext()) {
                const file = files.next();
                file.setTrashed(true);
                deletedItems.push('Drive File');
            }
        } catch (driveErr) {
            console.warn('Drive deletion error: ' + driveErr.toString());
        }

        // 3. Delete from Cache
        try {
            PropertiesService.getScriptProperties().deleteProperty('CACHE_' + formId);
            deletedItems.push('Cache');
        } catch (cacheErr) {
            console.warn('Cache deletion error: ' + cacheErr.toString());
        }

        if (deletedItems.length > 0) {
            return {
                status: 'success',
                message: `Form ${formId} deleted from: ${deletedItems.join(', ')}`
            };
        } else {
            return {
                status: 'error',
                message: 'Form not found in any location'
            };
        }

    } catch (err) {
        return { status: 'error', message: err.toString() };
    }
}
