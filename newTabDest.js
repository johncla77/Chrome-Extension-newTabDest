'use strict';
/*
This module needs to be included within the background's list of scripts in the manifest file. 
It should be listed before any file that calls any of its functions.

The following permissions are required in the manifest file: tabs, storage, contextmenus.

When the background or popup module is loaded it must call the function g_newTabdest.initialise(). After that any of the
other exported functions may be invoked.

New tabs will either be created in the current window (default) or in a detached window.
Two context menu items are defined. Selecting "NewWindow" will result in new tabs being created in a detached window; all
new tabs are created in the same detached window until "NewWindow" is select again or until "CurrentWindow" is selected.
"CurrentWindow" reverts back to new tabs being created in the current window whereas selecting "newWindow" will start another
detached window. 

The position and dimensions of the detached window are persisted in local storage. It is not possible to detect the 
resizing and movement of the detached window without a context script and, even if done, these updates could be too frequent. 
Consequently, the state of the detached window is only persisted whenever a new tab is created or a specific request is made
to persist the state.

Functions:

g_newTabDest.initialise(extensionName)
Must be called from a background script in order to load the context menu items. Must also be called from any other module
that uses any of the other exported functions.

g_newTabDest.tabs.create(createTabData, callback(tabs))
Create a tab in either the current window or the detached window creating the window if necessary. Parameters are identical
to those use by the function chrome.tabs.create().

g_newTabDest.tabs.moveToWindow(tabId, callback(winObj))
Moves an existing tab to the detached window creating the window if necessary as long as the "Create Tabs in New Window" has been 
requested; otherwise the request is ignored.

g_newTabDest.storage.save(callback())
Function to persist the current position and dimensions of the detached window to local storage. The data is internally persisted
whenever a tab is added to the detached window which should be acceptable so this function need not be invoked. However, when a window
is closed any movement/resizing since the last tabs was added to the window will not be persisted. To detect all changes to the
window a context script would be required to report the changes and invoke this function.
*/

//accessor to exported functions and variable
var g_newTabDest = {};    

{//start of module

g_newTabDest.initialise = initialise;
g_newTabDest.storageId = "Module Not Initialised";

//Copy of the data saved in the local storage. To minimise load a copy is read from storage when required and persisted
//to storage as part of the module unload process.
let m_windowState = {};


let m_debugLog = false;
let debugCnt = 0;
let createCnt = 0;

let m_extensionName = "";
let m_storageId = "";

//Context menu items
let m_newWindowMenuItem = {
    id: "newWindow",
    title: "Create Tabs in New Window",
    contexts: ["all"]
};
let m_currentWindowMenuItem = {
    id: "currentWindow",
    title: "Create Tabs in Current Window",
    contexts: ["all"]
};

//Must be called as part of the background scripts loading
function initialise(extensionName){
  m_extensionName = extensionName;
  m_storageId = extensionName + "NewTabDest";
  m_newWindowMenuItem.id = extensionName + "newWindow";
  m_currentWindowMenuItem.id = extensionName + "currentWindow";

  //create the exported functions and variables
  g_newTabDest.storageId = m_storageId;

  g_newTabDest.tabs = {};
  g_newTabDest.tabs.create = createTab;
  g_newTabDest.tabs.moveToWindow = moveTabToNewWindow;  //tab moved to a window
  g_newTabDest.storage = {};
  g_newTabDest.storage.save = storageSave; //persist the state of the detached window

  chrome.contextMenus.onClicked.addListener(function(clickedData, selectedTab){
    var destWinState;
    switch (clickedData.menuItemId) {
      case m_newWindowMenuItem.id:
        //tabs to be created in a detached window
        destWinState = {windowId: chrome.windows.WINDOW_ID_NONE, top: 0, left: 0, width: 0, height: 0};
        storageUpdate(destWinState);
        break;

      case m_currentWindowMenuItem.id:
        //reset the system so new tabs will be created in the current window (the window from which the new tab is created)
        destWinState = {windowId: chrome.windows.WINDOW_ID_CURRENT, top: 0, left: 0, width: 0, height: 0};
        storageUpdate(destWinState);
        break;
    };
  });

  //ignore an attempt to add the context menus more than once as the onInstalled function doesn't always get called.
  //try {addContextMenuItems();} catch (error) {};

  chrome.runtime.onInstalled.addListener(function(){
    //create the context menu items just once
    addContextMenuItems();
  });

}; //end of initialise

//debug aid
function log(report) {
  if (m_debugLog) console.log(report);
};

//create the 2 context menu items - call only when extension is installed
function addContextMenuItems(){
  chrome.contextMenus.create(m_newWindowMenuItem);
  chrome.contextMenus.create(m_currentWindowMenuItem);
};

//External function to handle the callback not being defined
function createTab(createTabData, callback){
  createTabFn(createTabData, function(newTab){
    if (callback != null) callback(newTab);
  });
};

//Create a new tab either in the current window or in another window which is created if it doesn't exist
function createTabFn(createTabData, newTabCallback){
  createCnt += 1;
  log("Create tab count:" + createCnt);
  storageGet(function(destWinDesc){
    if (destWinDesc.windowId != chrome.windows.WINDOW_ID_CURRENT){
      getWindow(destWinDesc.windowId, function(winObj){
        if (winObj){
          //window still exists so add tab to it and save the current dims
          createTabData.windowId = destWinDesc.windowId;
          chrome.tabs.create(createTabData, function(newTab) {
            destWinDesc = {'windowId': winObj.id, 'top': winObj.top, 'left': winObj.left, 'width': winObj.width, 'height': winObj.height};
            storageUpdate(destWinDesc, function(){
              newTabCallback(newTab);
            });
          });
        } 
        else{
          //create a new window with the new tab
          createWindowOption(destWinDesc, createTabData, function(newTab, newWin){
            let destWinDesc = {'windowId': newWin.id, 'top': newWin.top, 'left': newWin.left, 'width': newWin.width, 'height': newWin.height};
            storageUpdate(destWinDesc, function(){
               newTabCallback(newTab); 
            });
          });
        };
      });
    }    
    else {
      //just pass on the initial request to create the tab (in the current window otherwise shouldn't have called this module)
      chrome.tabs.create(createTabData, function(newTab) {
            newTabCallback(newTab);
      });
    };
  });  
};

//Create the tab in a new window. This variation of the code creates the tab in the current window and creates the
//new window by moving the created tab into it. This avoids a default tab being created in the new window causing
//which then needs to be removed causing the window to flicker.
function createWindowOption(destWinDesc, createTabData, callback){
  createTabData.active = false;
  chrome.tabs.create(createTabData, function(newTab) {
    //create the new window with the tab just created. 
    moveTabToDestWindowFn(destWinDesc, newTab.id, function(newWin){ 
      newTab.windowId = newWin.id;   //need to update the windowId for the tab
      callback(newTab, newWin);
    });
  });
};

//Does the destinatation window still exist? Get an exception if just use the 'get' function.
function getWindow(windowId, callback){
  chrome.windows.get(windowId, {}, function(winObj) {
    //try-catch only catches synchronous exceptions. Testing for lastError is the way to catch asynchronous exceptions
    if (chrome.runtime.lastError) callback();
    else callback(winObj);
  });
};

//another way to determine if a window exists that does not use exceptions
function getWindowOld(windowId, callback){
  chrome.windows.getAll({}, function(winList) {
    var winObj = null;
    for(let win of winList){
      if(win.id == windowId) { 
        winObj = win; 
        break; 
      };
    };
    callback(winObj);
  });
};

//External function to move a tab into the detached window or does nothing
function moveTabToNewWindow(tabId, callback){
  storageGet(function(destWin){
    //ignore the request if tabs are being created in the current window
    if (destWin.windowId != chrome.windows.WINDOW_ID_CURRENT){ 
      moveTabToDestWindowFn(destWin, tabId, function(winObj){
        //bring the detached window to the front
        chrome.windows.update(winObj.id, {focused: true}, function(winObj){
          let destWinDesc = {'windowId': winObj.id, 'top': winObj.top, 'left': winObj.left, 'width': winObj.width, 'height': winObj.height};
          storageUpdate(destWinDesc, function(){
            var updateProperties = { 'active': true };
            chrome.tabs.update(tabId, updateProperties, function(tab){
                if (callback != null) callback(winObj);
            });
          });
        });
      });
    };
  });
};

//Move an existing tab (tabId) into the destation window which is created if it doesn't exist
function moveTabToDestWindowFn(destWinDesc, tabId, callback){
  getWindow(destWinDesc.windowId, function(winObj){
    if (winObj){
      //window still exists so move tab into it and save the current dims
      chrome.tabs.move([tabId], {windowId: winObj.id, index: -1}, function(tab) {
          callback(winObj);
      });
    } 
    else{
      //create the window by moving the tab
      let createData = {tabId: tabId, top: destWinDesc.top, left: destWinDesc.left, width: destWinDesc.width, 
                    height: destWinDesc.height}; 
      chrome.windows.create(createData, function(newWin) {
          callback(newWin);
      });
    };
  });  
};

function storageGet(callback) {
  if (m_windowState.storage == undefined){
    chrome.storage.sync.get(function(storedData){
      if (storedData[m_storageId])
        m_windowState.storage = storedData[m_storageId];
      else{
        m_windowState.storage = {windowId: chrome.windows.WINDOW_ID_CURRENT, top: 0, left: 0, width: 0, height: 0};
      };
      m_windowState.changed = false;
      callback(m_windowState.storage);
    });
  }
  else callback(m_windowState.storage);
};

//Persist the destination windows data to local storage
function storagePersist(callback){
  if (m_windowState.changed){
    chrome.storage.sync.set({[m_storageId]: m_windowState.storage}, function(){
      m_windowState.changed = false;
      if (callback) callback();
    });
  };
};

//Read the window data and save it to local storage if it has changed
function storageSave(callback){
  storageGet(function(winDesc){
    if (winDesc.windowId != chrome.windows.WINDOW_ID_CURRENT){
      getWindow(winDesc.windowId, function(winObj){
        if (winObj){
          winDesc = {windowId: winObj.id, top: winObj.top, left: winObj.left, width: winObj.width, height: winObj.height};
            storageUpdate(winDesc, function(){
            if (callback) callback(winObj);
          });
        };
      });
    };
  });
};

//Update the data that is to be persisted
function storageUpdate(winDesc, callback){
  if (m_windowState.top != winDesc.windowId || m_windowState.top != winDesc.top || m_windowState.left != winDesc.left ||
       m_windowState.width != winDesc.width || m_windowState.height != winDesc.height){
    m_windowState.storage = winDesc;
    m_windowState.changed = true;
    //Persist when updated at the moment rather than delay
    storagePersist(function(){
      if (callback) callback();
    });
  };
};


};//end of module
