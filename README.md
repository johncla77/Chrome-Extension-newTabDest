# Chrome-Extension-newTabDest
Tester for a module to create new chrome tabs in a separate window

The javascript file newTabDest.js supports the creation of a new tab in a detached window or in the current window. The destination is controlled by two context menu items "Create Tabs in New Window" and "Create Rabs in Current Window".

The module exports the following functions:

g_newTabDest.initialise(prefix)
Must be called from a background script in order to load the context menu items. Must also be called from any other module
that uses any of the other exported functions.'prefix' is a string that prefixes the internal names for the context menu items to avoid any conflex with the chrome extension's own context items. 

g_newTabDest.tabs.create(createTabData, callback(tabs))
Create a tab in either the current window or the detached window creating the window if necessary. Parameters are identical to those use by the function chrome.tabs.create().

g_newTabDest.tabs.moveToWindow(tabId, callback(winObj))
Moves an existing tab to the detached window creating the window if necessary as long as the "Create Tabs in New Window" has been requested; otherwise nothing happens.

g_newTabDest.storage.save(callback())
Function to persist the current position and dimensions of the detached window to local storage. The data is persisted by the module whenever a tab is added to the detached window which should be sufficent so this function need not be invoked. When a window is closed any movement/resizing since the last tabs was added to the window will not have been persisted. To detect all changes to the window a context script would be required to report the changes and invoke this function.

