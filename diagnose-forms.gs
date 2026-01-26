/**
 * DIAGNOSTIC SCRIPT - Find out why forms aren't loading
 * 
 * Run this in Google Apps Script to see exactly what's happening
 */

function diagnoseFormLoadingIssue() {
  Logger.log('🔍 DIAGNOSTIC REPORT\n');
  Logger.log('═══════════════════════════════════════\n');
  
  // Step 1: Check Portal Config
  Logger.log('📋 STEP 1: Portal Configuration');
  Logger.log('─────────────────────────────────────');
  try {
    const portalConfig = getPortalConfig();
    if (portalConfig && portalConfig.forms && portalConfig.forms.length > 0) {
      Logger.log(`✅ Portal has ${portalConfig.forms.length} form(s) configured:\n`);
      portalConfig.forms.forEach((f, i) => {
        Logger.log(`   ${i + 1}. ${f.name}`);
        Logger.log(`      ID: ${f.id}`);
        Logger.log(`      Order: ${f.order}\n`);
      });
    } else {
      Logger.log('❌ No forms in portal config\n');
    }
  } catch (e) {
    Logger.log('❌ Error getting portal config: ' + e.toString() + '\n');
  }
  
  // Step 2: Check Registry Sheet
  Logger.log('\n📊 STEP 2: Registry Sheet Contents');
  Logger.log('─────────────────────────────────────');
  try {
    const regSs = SpreadsheetApp.openById(REGISTRY_SS_ID);
    const registrySheet = regSs.getSheetByName(REGISTRY_SHEET_NAME);
    const data = registrySheet.getDataRange().getValues();
    
    Logger.log(`Found ${data.length - 1} form(s) in registry:\n`);
    
    for (let i = 1; i < data.length; i++) {
      const formId = String(data[i][0]);
      const formName = data[i][1];
      const fileId = data[i][3];
      const schemaData = data[i][5];
      
      Logger.log(`   ${i}. ${formName}`);
      Logger.log(`      Form ID: ${formId}`);
      Logger.log(`      Drive File ID: ${fileId || 'MISSING'}`);
      Logger.log(`      Has Schema Data (col 6): ${schemaData && schemaData.trim() !== '' ? 'YES' : 'NO'}`);
      
      if (schemaData && schemaData.trim() !== '') {
        try {
          const parsed = JSON.parse(schemaData);
          Logger.log(`      Schema Elements: ${parsed.schema ? parsed.schema.length : 0}`);
        } catch (e) {
          Logger.log(`      ❌ Schema JSON is INVALID: ${e.toString()}`);
        }
      }
      Logger.log('');
    }
  } catch (e) {
    Logger.log('❌ Error reading registry: ' + e.toString() + '\n');
  }
  
  // Step 3: Check Drive Folder
  Logger.log('\n📁 STEP 3: Drive Folder Contents');
  Logger.log('─────────────────────────────────────');
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const files = folder.getFiles();
    let count = 0;
    
    Logger.log(`Files in Drive folder:\n`);
    while (files.hasNext()) {
      const file = files.next();
      count++;
      Logger.log(`   ${count}. ${file.getName()}`);
      Logger.log(`      File ID: ${file.getId()}`);
      Logger.log(`      Size: ${file.getSize()} bytes\n`);
    }
    
    if (count === 0) {
      Logger.log('   ⚠️ No files found in Drive folder\n');
    }
  } catch (e) {
    Logger.log('❌ Error reading Drive folder: ' + e.toString() + '\n');
  }
  
  // Step 4: Test Loading Each Form from Portal
  Logger.log('\n🧪 STEP 4: Test Loading Forms from Portal');
  Logger.log('─────────────────────────────────────');
  try {
    const portalConfig = getPortalConfig();
    if (portalConfig && portalConfig.forms) {
      portalConfig.forms.forEach((f, i) => {
        Logger.log(`\nTesting: ${f.name} (${f.id})`);
        
        const result = getForm(f.id);
        
        if (result.status === 'success') {
          Logger.log(`   ✅ SUCCESS`);
          Logger.log(`   Source: ${result.source || 'unknown'}`);
          Logger.log(`   Elements: ${result.schema ? result.schema.length : 0}`);
        } else {
          Logger.log(`   ❌ FAILED`);
          Logger.log(`   Error: ${result.message}`);
        }
      });
    }
  } catch (e) {
    Logger.log('❌ Error testing forms: ' + e.toString());
  }
  
  Logger.log('\n═══════════════════════════════════════');
  Logger.log('📝 RECOMMENDATIONS');
  Logger.log('═══════════════════════════════════════\n');
  Logger.log('Based on the results above:');
  Logger.log('1. If "Has Schema Data" is NO → Load the form in builder and click Save');
  Logger.log('2. If Schema JSON is INVALID → Delete and recreate the form');
  Logger.log('3. If Drive files are missing → Forms were never saved properly');
  Logger.log('4. If Form IDs don\'t match → Portal config has wrong IDs\n');
}

/**
 * Quick fix: Clear cache for all forms
 */
function clearAllFormCaches() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  let count = 0;
  
  for (const key in allProps) {
    if (key.startsWith('CACHE_')) {
      props.deleteProperty(key);
      count++;
      Logger.log(`Cleared cache: ${key}`);
    }
  }
  
  Logger.log(`\n✅ Cleared ${count} cached form(s)`);
  Logger.log('Now try loading your forms again');
}
