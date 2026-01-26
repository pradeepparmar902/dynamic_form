/**
 * MANUAL PORTAL CONFIGURATION SCRIPT
 * 
 * Copy this function into your Google Apps Script editor and run it.
 * This will manually save your portal configuration.
 */

function manuallySetPortalConfig() {
  // EDIT THIS ARRAY - Add your forms here
  const portalConfig = {
    forms: [
      { id: "Form_1769410062544", name: "New Form", order: 1 },
      { id: "Form_1769410625921", name: "pradeep parmar2", order: 2 },
      { id: "Form_1769410679911", name: "Pradeep Parmar 3", order: 3 }
    ],
    layout: "sidebar"
  };
  
  // Save to PropertiesService
  try {
    PropertiesService.getScriptProperties().setProperty(
      '_PORTAL_CONFIG',
      JSON.stringify(portalConfig)
    );
    Logger.log('✅ Portal configuration saved successfully!');
    Logger.log('Portal contains ' + portalConfig.forms.length + ' forms');
    return { status: 'success', message: 'Portal config saved!' };
  } catch (e) {
    Logger.log('❌ Error: ' + e.toString());
    return { status: 'error', message: e.toString() };
  }
}

/**
 * VIEW CURRENT PORTAL CONFIG
 * Run this to see what's currently saved
 */
function viewPortalConfig() {
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
