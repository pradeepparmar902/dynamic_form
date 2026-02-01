/**
 * DYNAMIC FORM BUILDER & RENDERER BACKEND
 * Optimized for Speed (CacheService + Batch Loading)
 */

const REGISTRY_SS_ID = '1d5zAeorKdGEyirqNMaT9c9gCg0vyIIKKcEILLiOmJfE';
const REGISTRY_SHEET_NAME = 'list';
const DRIVE_FOLDER_ID = '1XEWZ_j7vLL7iDSVPudARkofzZ6Nw2b6y';

function doGet(e) {
    try {
        const action = e.parameter.action;

        // Handle CORS pre-flight or simple GETs
        if (action === 'getForm') return createJsonResponse(getForm(e.parameter.id));
        if (action === 'loadPortal') return createJsonResponse(loadPortal(e.parameter.formId)); // NEW BATCH FUNCTION
        if (action === 'getPortalConfig') return createJsonResponse(getPortalConfig());
        if (action === 'listTemplates') return createJsonResponse(listTemplates());
        if (action === 'getScriptUrl') return createJsonResponse(ScriptApp.getService().getUrl());
        if (action === 'ping') return createJsonResponse({ status: 'success' });

        return HtmlService.createHtmlOutput('Backend Online');
    } catch (err) {
        return createJsonResponse({ status: 'error', message: err.toString() });
    }
}

function doPost(e) {
    let params;
    try {
        if (e.postData && e.postData.contents) {
            params = JSON.parse(e.postData.contents);
        } else {
            params = e.parameter;
        }

        const action = params.action;
        let result = { status: 'error', message: 'Invalid action' };

        if (action === 'saveForm') {
            result = saveForm(params.formId, params.schema, params.config, params.metadata);
        } else if (action === 'submitForm') {
            result = submitForm(params.formId, params.formData, params.targetSheetUrl, params.targetSheetName);
        } else if (action === 'translateText') {
            result = { status: 'success', translated: translateText(params.text, params.targetLang, params.sourceLang) };
        } else if (action === 'savePortalConfig') {
            result = savePortalConfig(params.config);
        } else if (action === 'deleteForm') {
            result = deleteForm(params.formId);
        }

        return createJsonResponse(result);
    } catch (err) {
        return createJsonResponse({ status: 'error', message: err.toString() });
    }
}

function createJsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- NEW: BATCH LOADER (SPEED BOOST) ---
function loadPortal(requestedFormId) {
    // 1. Get Config
    const config = getPortalConfig();

    // 2. Determine which form to load
    let formIdToLoad = requestedFormId;
    if (!formIdToLoad && config.forms && config.forms.length > 0) {
        formIdToLoad = config.forms[0].id;
    }

    // 3. Get Form Data (if needed)
    let formData = null;
    if (formIdToLoad) {
        formData = getForm(formIdToLoad);
    }

    // Return everything in ONE request
    if (formData) formData.id = formIdToLoad; // Ensure ID is present for caching
    return {
        status: 'success',
        config: config,
        initialForm: formData
    };
}

// --- CACHING HELPERS ---
function getCache(key) {
    return CacheService.getScriptCache().get(key);
}

function setCache(key, value, time) {
    try {
        CacheService.getScriptCache().put(key, value, time || 21600); // Default 6 hours
    } catch (e) { console.warn("Cache put failed", e); }
}

function clearCache(key) {
    CacheService.getScriptCache().remove(key);
}

// --- ACTIONS ---

function getPortalConfig() {
    try {
        // Try Cache First
        const cached = getCache('PORTAL_CONFIG');
        if (cached) return JSON.parse(cached);

        // Fallback to Properties (Slower persistent storage)
        const props = PropertiesService.getScriptProperties().getProperty('_PORTAL_CONFIG');
        const config = props ? JSON.parse(props) : { forms: [], layout: 'sidebar' };

        // Save to Cache for next time
        setCache('PORTAL_CONFIG', JSON.stringify(config));
        return config;
    } catch (e) {
        return { forms: [], layout: 'sidebar' };
    }
}

function savePortalConfig(config) {
    try {
        const json = JSON.stringify(config);
        PropertiesService.getScriptProperties().setProperty('_PORTAL_CONFIG', json);
        setCache('PORTAL_CONFIG', json); // Update Cache
        return { status: 'success' };
    } catch (e) {
        return { status: 'error', message: e.toString() };
    }
}

function getForm(formId) {
    try {
        // 1. FASTEST: CacheService
        const cached = getCache('FORM_' + formId);
        if (cached) {
            const parsed = JSON.parse(cached);
            return {
                status: 'success',
                formId: formId,
                schema: parsed.schema,
                config: parsed.config,
                metadata: parsed.metadata || {},
                source: 'cache'
            };
        }

        // 2. FAST: Registry Sheet
        const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
        const sheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);
        const data = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(formId)) {
                const schemaData = data[i][5];
                if (schemaData) {
                    setCache('FORM_' + formId, schemaData); // Cache it!
                    const parsed = JSON.parse(schemaData);
                    return { status: 'success', ...parsed };
                }
            }
        }

        // 3. SLOW: Drive
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const files = folder.getFilesByName(`Form_Template_${formId}.json`);
        if (files.hasNext()) {
            const content = files.next().getBlob().getDataAsString();
            setCache('FORM_' + formId, content);
            return { status: 'success', ...JSON.parse(content) };
        }

        return { status: 'error', message: 'Form not found' };
    } catch (e) {
        return { status: 'error', message: e.toString() };
    }
}

function saveForm(formId, schema, config, metadata) {
    try {
        const fullContent = JSON.stringify({
            id: formId,
            schema,
            config,
            metadata,
            savedAt: new Date()
        });

        // Save to Registry
        const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
        let sheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);
        if (!sheet) sheet = regSs.insertSheet(REGISTRY_SHEET_NAME);

        const data = sheet.getDataRange().getValues();
        let rowIndex = -1;

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(formId)) {
                rowIndex = i + 1;
                break;
            }
        }

        const driveFileId = saveToDrive(formId, fullContent); // Helper

        if (rowIndex > 0) {
            sheet.getRange(rowIndex, 2).setValue(config.formName);
            sheet.getRange(rowIndex, 4).setValue(driveFileId);
            sheet.getRange(rowIndex, 6).setValue(fullContent);
        } else {
            sheet.appendRow([formId, config.formName, metadata.description, driveFileId, new Date(), fullContent]);
        }

        // Update Cache
        setCache('FORM_' + formId, fullContent);

        return { status: 'success' };
    } catch (e) {
        return { status: 'error', message: e.toString() };
    }
}

function saveToDrive(formId, content) {
    try {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        const fileName = `Form_Template_${formId}.json`;
        const files = folder.getFilesByName(fileName);
        if (files.hasNext()) {
            const f = files.next();
            f.setContent(content);
            return f.getId();
        } else {
            return folder.createFile(fileName, content, MimeType.PLAIN_TEXT).getId();
        }
    } catch (e) { return ""; }
}

function deleteForm(formId) {
    try {
        clearCache('FORM_' + formId); // Clear Cache

        const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
        const sheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);
        const data = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(formId)) {
                sheet.deleteRow(i + 1);
                break;
            }
        }
        return { status: 'success' };
    } catch (e) {
        return { status: 'error', message: e.toString() };
    }
}

function listTemplates() {
    try {
        const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
        const sheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);
        if (!sheet) return [];
        const data = sheet.getDataRange().getValues();
        return data.slice(1).map(row => ({
            id: row[0], name: row[1], description: row[2], lastUpdated: row[4]
        }));
    } catch (e) { return []; }
}

function translateText(text, target, source) {
    try {
        return LanguageApp.translate(text, source || 'en', target || 'mr');
    } catch (e) { return text; }
}

function submitForm(formId, formData, targetSheetUrl, targetSheetName) {
    try {
        const record = getForm(formId);

        // Use overrides if provided, otherwise fallback to form config
        const finalSheetUrl = targetSheetUrl || (record.status === 'success' ? record.config.targetSheetUrl : null);
        const finalSheetName = targetSheetName || (record.status === 'success' ? record.config.targetSheetName : 'Form Responses');

        if (!finalSheetUrl) return { status: 'error', message: 'No target sheet URL provided for this form.' };

        const ss = SpreadsheetApp.openByUrl(finalSheetUrl);
        let sheet = ss.getSheetByName(finalSheetName);
        if (!sheet) sheet = ss.insertSheet(finalSheetName);

        if (!formData.Timestamp) formData.Timestamp = new Date();
        const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].filter(Boolean);
        const newHeaders = Object.keys(formData).filter(k => !headers.includes(k));

        if (newHeaders.length > 0) {
            const startCol = headers.length + 1;
            sheet.getRange(1, startCol, 1, newHeaders.length).setValues([newHeaders]);
            headers.push(...newHeaders);
        }

        const row = headers.map(h => formData[h] || '');
        sheet.appendRow(row);

        return { status: 'success' };
    } catch (e) { return { status: 'error', message: e.toString() }; }
}
