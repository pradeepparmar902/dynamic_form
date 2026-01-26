/**
 * COMPREHENSIVE PORTAL FIX SCRIPT
 * 
 * This script will:
 * 1. Check which forms exist in the registry
 * 2. Verify which forms have actual data
 * 3. Create a working portal configuration with ONLY valid forms
 * 
 * HOW TO USE:
 * 1. This file should be added to your existing Google Apps Script project
 * 2. Run the function: fixPortalConfiguration()
 * 3. Check the logs to see what was fixed
 * 
 * NOTE: Uses REGISTRY_SS_ID and REGISTRY_SHEET_NAME from your main script
 */

function fixPortalConfiguration() {
  Logger.log('🔧 Starting Portal Configuration Fix...\n');
  
  try {
    // Step 1: Get all forms from registry
    const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
    const registrySheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);
    
    if (!registrySheet) {
      Logger.log('❌ ERROR: Registry sheet not found!');
      return { status: 'error', message: 'Registry sheet not found' };
    }
    
    const data = registrySheet.getDataRange().getValues();
    Logger.log(`📊 Found ${data.length - 1} rows in registry (excluding header)\n`);
    
    // Step 2: Check each form for valid data
    const validForms = [];
    const invalidForms = [];
    
    for (let i = 1; i < data.length; i++) {
      const formId = String(data[i][0]);
      const formName = data[i][1];
      const schemaData = data[i][5]; // Column 6
      
      Logger.log(`\n📝 Checking: ${formName} (${formId})`);
      
      if (!formId || formId === '') {
        Logger.log('  ⚠️ SKIP: Empty form ID');
        invalidForms.push({ id: formId, name: formName, reason: 'Empty ID' });
        continue;
      }
      
      if (!schemaData || schemaData.trim() === '') {
        Logger.log('  ❌ INVALID: No schema data in column 6');
        invalidForms.push({ id: formId, name: formName, reason: 'No schema data' });
        continue;
      }
      
      try {
        const parsed = JSON.parse(schemaData);
        if (parsed.schema && Array.isArray(parsed.schema)) {
          Logger.log(`  ✅ VALID: ${parsed.schema.length} elements`);
          validForms.push({
            id: formId,
            name: formName,
            order: validForms.length + 1
          });
        } else {
          Logger.log('  ❌ INVALID: Schema is not an array');
          invalidForms.push({ id: formId, name: formName, reason: 'Invalid schema structure' });
        }
      } catch (e) {
        Logger.log('  ❌ INVALID: Cannot parse JSON - ' + e.toString());
        invalidForms.push({ id: formId, name: formName, reason: 'JSON parse error' });
      }
    }
    
    // Step 3: Summary
    Logger.log('\n\n═══════════════════════════════════════');
    Logger.log('📊 SUMMARY');
    Logger.log('═══════════════════════════════════════');
    Logger.log(`✅ Valid forms: ${validForms.length}`);
    Logger.log(`❌ Invalid forms: ${invalidForms.length}\n`);
    
    if (validForms.length > 0) {
      Logger.log('✅ VALID FORMS:');
      validForms.forEach(f => {
        Logger.log(`   • ${f.name} (${f.id})`);
      });
    }
    
    if (invalidForms.length > 0) {
      Logger.log('\n❌ INVALID FORMS (will be excluded from portal):');
      invalidForms.forEach(f => {
        Logger.log(`   • ${f.name} (${f.id}) - Reason: ${f.reason}`);
      });
    }
    
    // Step 4: Create portal config with ONLY valid forms
    if (validForms.length === 0) {
      Logger.log('\n\n⚠️ WARNING: No valid forms found!');
      Logger.log('You need to:');
      Logger.log('1. Open the form builder');
      Logger.log('2. Load each form');
      Logger.log('3. Click "Save Form" to store it properly');
      return { status: 'error', message: 'No valid forms to configure' };
    }
    
    const portalConfig = {
      forms: validForms,
      layout: 'sidebar'
    };
    
    // Step 5: Save the configuration
    PropertiesService.getScriptProperties().setProperty(
      '_PORTAL_CONFIG',
      JSON.stringify(portalConfig)
    );
    
    Logger.log('\n\n✅ SUCCESS!');
    Logger.log(`Portal configuration saved with ${validForms.length} form(s)`);
    Logger.log('\n═══════════════════════════════════════\n');
    
    return {
      status: 'success',
      validForms: validForms.length,
      invalidForms: invalidForms.length,
      config: portalConfig
    };
    
  } catch (error) {
    Logger.log('\n\n❌ CRITICAL ERROR: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

/**
 * VIEW CURRENT PORTAL CONFIG
 */
function viewCurrentPortalConfig() {
  const saved = PropertiesService.getScriptProperties().getProperty('_PORTAL_CONFIG');
  if (saved) {
    const config = JSON.parse(saved);
    Logger.log('Current Portal Configuration:');
    Logger.log(JSON.stringify(config, null, 2));
    return config;
  } else {
    Logger.log('No portal configuration found');
    return null;
  }
}

/**
 * FIX INDIVIDUAL FORM
 * Use this if a specific form is missing data
 */
function fixIndividualForm(formId) {
  Logger.log(`🔧 Attempting to fix form: ${formId}\n`);
  
  // This function would need the actual form data
  // For now, it just checks if the form exists
  const form = getForm(formId);
  
  if (form.status === 'success') {
    Logger.log('✅ Form is already valid!');
    Logger.log(JSON.stringify(form, null, 2));
  } else {
    Logger.log('❌ Form has issues:');
    Logger.log(form.message);
    Logger.log('\nTo fix:');
    Logger.log('1. Open the form builder');
    Logger.log(`2. Load form ID: ${formId}`);
    Logger.log('3. Click "Save Form"');
  }
  
  return form;
}
