'use strict';

{

const url = "http://dds.bridgewebs.com/bsol2/ddummy.htm";
const hands = "north=6.A964.AKQT4.842&east=J8742.3.986.AQ97&south=AKQT5.KJT2.2.K65&west=93.Q875.J753.JT3";
let tab1 = url + "?board=12&dealer=E&vul=NS&club=chrome_ext_lambe&event=20150707&" + hands;
let tab2 = url + "?board=2&dealer=S&vul=NS&club=chrome_ext_lambe&event=20150707&" + hands;
var tabCnt = 0;

let m_testerMenuItem = {
    id: "testerMenu",
    title: "Save window settings",
    contexts: ["all"]
};

//Initialise the newTabDest module. This must be called in the background.js to install the context
//menu items even if the extension has a pop-up that must also call the initialisation function as part
//of its loading
g_newTabDest.initialise("NWD");  //prefix for context menu items to avoid conflict

//Test that the extension can still have its own context items; place after initialise() called so displayed after
//the other context items.
chrome.runtime.onInstalled.addListener(function(){
    //create the context menu items just once
    chrome.contextMenus.create(m_testerMenuItem);
});

//Create own context menu items (can't control the order in which menu items will be listed)
chrome.contextMenus.onClicked.addListener(function(clickedData, selectedTab){
    var nwdStorage;
    switch (clickedData.menuItemId) {
        case m_testerMenuItem.id:
            g_newTabDest.storage.save(function(winObj){

            });
        break;
    };
});

//This code is only active if there isn't a popup defined in the manifest
chrome.browserAction.onClicked.addListener(function() {
    g_newTabDest.tabs.create({url: tab1}, function(tab) {
    });
});

};