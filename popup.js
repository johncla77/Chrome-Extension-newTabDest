$(function(){
//    const ddummyhtml = "*://*/bsol2/ddummy.htm*"
    const ddummyhtml = "*://*/*/ddummy.htm*"


    const hands = "north=6.A964.AKQT4.842&east=J8742.3.986.AQ97&south=AKQT5.KJT2.2.K65&west=93.Q875.J753.JT3";
    const url = "http://dds.bridgewebs.com/bsol2/ddummy.htm";
    let tab1 = url + "?board=12&dealer=E&vul=NS&club=chrome_ext_lambe&event=20150707&" + hands;
    let tabCnt = 0;

    g_newTabDest.initialise("NWDTest");  //the unique name for the context menus

    displayStorage();


    $('#createTab').click(function(){
        displayReport("");
        g_newTabDest.tabs.create({url: tab1}, function(tab) {
            if (chrome.runtime.lastError) 
                displayReport("Error:" + chrome.runtime.lastError.message);
            else{
                displayStorage();
                displayReport("Created Tab cnt:" + tabCnt + ", tabId:" + tab.id + ", windowId:" + tab.windowId);
            };
        });
    });

    $('#moveTab').click(function(){
        var urlPattern = ddummyhtml;
        displayReport("");
        chrome.tabs.query({url:urlPattern, currentWindow: true}, function(tabs) {
            if (chrome.runtime.lastError) 
                displayReport("Error:" + chrome.runtime.lastError.message);
            else{
                if (tabs[0]){  
                    //move the tab to the detached window
                    g_newTabDest.tabs.moveToWindow(tabs[0].id, function(tabs) {
                        displayStorage();
                        displayReport("Moved tabId:" + tabs[0].id);
                    });
                 }
                else {
                    displayReport("No tab with url pattern:'"+ urlPattern + "'");
                };
            };
        });
        

    });

    $('#save').click(function(){
        displayReport("");
        g_newTabDest.storage.save(function(winObj) {
            if (chrome.runtime.lastError) 
                displayReport("Error:" + chrome.runtime.lastError.message);
            else{
                displayStorage();
                displayReport("Window settings read and save");
            };
        });
    });

    function displayStorage(){
        $('#storageId').val(g_newTabDest.storageId);
        chrome.storage.sync.get([g_newTabDest.storageId], function(storedData){
            var data = storedData.NWDTestNewTabDest;
            if (data != undefined){
                switch (data.windowId) {
                    case chrome.windows.WINDOW_ID_CURRENT:
                        $('#windowId').val(data.windowId + " (Current Window)");
                        break;
                    case chrome.windows.WINDOW_ID_NONE:
                        $('#windowId').val(data.windowId + " (Create New Window)");
                        break;
                    default:
                        $('#windowId').val(data.windowId);
                        break;
                };
                $('#top').val(data.top);
                $('#left').val(data.left);
                $('#width').val(data.width);
                $('#height').val(data.height);
            }
            else $('#windowId').val("undefined");
        });
    };

    function displayReport(str)
    {
        $('#report').val(str);
    };
});