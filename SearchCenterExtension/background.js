﻿console.log("loading bg page");

this.settings = {
    debugMode: false,
    setValue: function (key, value, defaultValue) {
        value == defaultValue ? localStorage.removeItem(key) : localStorage[key] = value;
    },
    getValue: function (key, defaultValue) {
        return localStorage[key] ? localStorage[key] : defaultValue
    },
    get useLastEngine() {
        return localStorage["defaultLastEngine"] ? true : false
    }, //is this expensive to call everytime?
    set useLastEngine(value) {
        value ? localStorage["defaultLastEngine"] = true : localStorage.removeItem("defaultLastEngine");
    },
    get smallButtons() {
        return localStorage["smallButtons"] ? true : false
    },
    set smallButtons(value) {
        value ? localStorage["smallButtons"] = true : localStorage.removeItem("smallButtons");
    },
    get useSuggest() {
        return localStorage["disableSuggest"] ? false : true
    },
    set useSuggest(value) {
        !value ? localStorage["disableSuggest"] = true : localStorage.removeItem("disableSuggest");
    },
    get useHotKey() {
        return localStorage["disableHotKey"] ? false : true
    },
    set useHotKey(value) {
        !value ? localStorage["disableHotKey"] = true : localStorage.removeItem("disableHotKey");
    },
    get searchBarHotKey() {
        return localStorage["hotKey"] ? JSON.parse(localStorage["hotKey"]) : {
            data: "Q",
            ctrlKey: true,
            keyCode: 81
        }
    }, //json + cahce
    //cache this
    set searchBarHotKey(value) {
        localStorage["hotKey"] = JSON.stringify(value);
        hotKeyScript = null; //should raise a hotkeyChanged event, but this'll do for now
    },
    get enableContextMenu() {
        return this.getValue("enableContextMenu", true)
    },
    set enableContextMenu(value) {
        this.setValue("enableContextMenu", value, true);
        refreshContextMenu();
    }
};

var hotKeyScript; //script that listens for key presses... it get inserted on every page
this.engines = new engines();
var engines = this.engines;
this.imageCache = new imageCache();




//****** variables

var lastEngine;

var googleSearchPattern;
googleSearchPattern = new RegExp("^http\:\/\/www\.google\..*\/search.*[?|&]q=([^&#]*)");
googleSearchPattern.compile(googleSearchPattern);
//^http\:\/\/www\.google\..*\/search.*[?|&]q=([^&#]*)

//^http\:\/\/www\.google\.                                    starts with http://www.google.
//                        .*                                  any amount of characters                         so it works for .co.uk or .com etc etc [^/]* would also work
//                          /search                           /search
//                                 .*                         any amount of characters
//                                   [?|&]q=                  either ?q= or &q=                                signals the start of the search query                     
//                                          ([^&#]*)          any amount of characters that not a # or &       signal the end of the search query

// regex based on http: //www.netlobo.com/url_query_string_javascript.html



//******* version Code
//TODO grab this from manifest
//but would this be unessaraly slow?

//version.onNew(function) aysnc
//version.isNew bool sync but can use the async code
//version.isUpdated
//version.onUpdated
//version.updateVerion() void//should updateverion update automatally? and isUpdated is called after should it return true/flase



this.version = function () {

    //this is the version it should be updated to
    var version = "3.7.0";
    //if it does exist & is differnet
    if (Boolean(localStorage["Version"])) //not first run
    {

        if (localStorage["Version"] != version) {
            //upgrade

            localStorage["NewFeatures"] = true;
            localStorage["Version"] = version;
            localStorage["UpgradeAt"] = new Date().getTime();


            //for 2.4 -> 2.5
            localStorage.removeItem("History"); //no longer needed
            //for 2.5 -> 2.6 
            if (!localStorage["InstalledAt"]) {
                localStorage["InstalledAt"] = new Date().getTime();
            }

        }
    } else {
        //new
        localStorage["InstalledAt"] = new Date().getTime();
        localStorage["Version"] = version;
    }

    var newFeatures = new Boolean(localStorage["NewFeatures"]).valueOf();

    return {
        hasNewFeatures: function () {
            return newFeatures;
        },
        disableNewFeatures: function () { //todo rename to new features viewed, resetFeatures
            localStorage.removeItem("NewFeatures");
            newFeatures = false;
        },
        get installedAt() {
            return new Date(parseInt(localStorage["InstalledAt"]))
        },
        get updatedAt() {
            return new Date(parseInt(localStorage["UpgradeAt"]))
        }
    }
}();



//******************** context menu **************************//




function contextItemClick(engine) {
    return function (OnClickData) {
        searchByItem(engine, OnClickData.selectionText, false);
    }
}


function CreateContextMenu() {

    if (settings.enableContextMenu == true) {
        var eList = engines.getEngineList();

        eList.forEach(function (engine) {
            chrome.contextMenus.create({
                "title": engine.name,
                "contexts": ["selection"],
                "onclick": contextItemClick(engine)
            });
        });
    }
}

function refreshContextMenu() {
    //chrome.contextMenus.removeAll(function (engines){return CreateContextMenu}(this.engines));
    chrome.contextMenus.removeAll(CreateContextMenu);
}




CreateContextMenu(); //intial load
document.addEventListener("engineListSaved", refreshContextMenu);

//*********************************************************//


//******* event listeners
chrome.extension.onConnect.addListener(function (port) {
    //console.assert(port.name == "searchBox");
    port.onMessage.addListener(function (message) {
        if (message.name == "getEngines") {
            //this.engines.getEngineList()
            port.postMessage({
                name: "engineList",
                engines: this.engines.getEngineList()
            });
        } else if (message.name == "searchEngines") {

            var sameWindow = message.sameWindow && getOpenSearchInSameTab();

            searchList([message.engines[0].Id], message.terms, sameWindow);

            //   searchByUrl(message.engines[0].SearchUrl,message.terms,sameWindow);
        } else if (message.name == "hotKey") {
            port.postMessage({
                name: "hotKey",
                info: this.settings.searchBarHotKey
            });
        }

    });
});



chrome.extension.onRequest.addListener(function (message) {

    switch (message.msg) {
        case "getSelection":
            var selectedText = message.selection.trim();
            if (selectedText.length > 0) {
                //trim
                notify.popup(function (popupView) {
                    popupView.publicMethods.selectedTextFound(selectedText);
                });

            }
            break;
        case "openSearch":
            log("openSearch");
            addOpenSearch(message);
            break;
        case "trainedSearch":
            log("trainedSearch");
            addTrainedWebsite(message);
            break;
        case "quickSearch":
            if (this.settings.useHotKey) {
                //should put css in first
                chrome.tabs.insertCSS(null, {
                        file: "css/searchCenterSearchBox.css",
                        allFrames: false
                    },
                    function () {
                        chrome.tabs.executeScript(null, {
                            file: "contentScripts/searchBox.js",
                            allFrames: false
                        }, () => {
                            if (chrome.runtime.lastError)
                                log("quickSearch:" + chrome.runtime.lastError.message);
                        });
                    }
                );
            }
            //execute should only be done after contents is done (in the callback).

            // chrome.tabs.executeScript(integer tabId, object details, function callback)

            break;
        case "defaultSearch":
            //todo move to port
            defaultSearch(message.terms, false);
            break;
    }

});



//note that this only attaches updated tab events, not new tab events
//since address bar searches create a tab first we don't need to worry about it
//用来记录搜索历史记录用的
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

    if (changeInfo.status != "loading")
        return

    log("changeurl:" + changeInfo.url);
    log("updatetaburl:" + tab.url);
    if (!is_url(tab.url))
        return
    //look into what point we want shortcut to be called
    if (changeInfo.status == "loading") {
        attachShortCut(tabId);
    }

    if (changeInfo.status == "loading" && changeInfo.url) {

        var matches = changeInfo.url.match(googleSearchPattern);

        if (matches) {
            //TODO should check that it has 2 elements
            console.log(matches[1]);


            searchHistory.add(decodeURIComponent(matches[1].replace(/\+/g, " ")));
            //addHistoryItem(decodeURIComponent(matches[1].replace(/\+/g, " ")));
        } else {


            //this can be done alot better, how having just one regex, in a string (maybe even the json) and looking for it there
            //is it accepted domain
            var currentDomain = getDomain(changeInfo.url);
            if (currentDomain == "") return;
            log("searching for:" + currentDomain);
            //TODO move this into engines function FindFirstByDomain
            //also could be find all by domain, although the domain list in engines is currently a hash
            //that hash could be improved to store an array, or just have true/false so it searches for all when the domain exists

            // var savedEng = engines.findFirst(function (engine) {
            //     if (!(engine instanceof engineGroup)) {
            //         return currentDomain == engine.getDomain();
            //     }
            // });
            
            var savedEng=engines.findEngineByDomain(currentDomain);

            if (savedEng) {
                log("found Domain:" + currentDomain);
                //see if it is a serch engine
                //    [\^$.|?*+(){} //may have to esacpe these
                //(.*)       // not &     //[A-Za-z0-9]
                var searchUrl = "";
                searchUrl = savedEng.SearchUrl;
                var regXPattern = searchUrl.replace(/\//gi, "\\/");
                regXPattern = regXPattern.replace(/\./g, "\\.").replace(/\?/g, "\\?"); //.replace("=", "\=");  .replace(/\-/g, "\\-")
                //todo could add # in as well
                regXPattern = "^" + regXPattern.replace(/searchcenter/g, "([^&]*)"); //regXPattern.replace("searchcenter", "([^&]*)");

                var searchRegex = new RegExp(regXPattern, "i");
                //example that works
                //url.match(/http:\/\/mycroft.mozdev.org\/search-engines.html\?name=(.*)/i)
                var result = changeInfo.url.match(searchRegex);

                if (result) {

                    log("add search history"+result);

                    searchHistory.add(decodeURIComponent(result[1].replace(/\+/g, " ")));
                    //addHistoryItem(decodeURIComponent(result[1].replace(/\+/g, " ")));
                } else {
                    log("no search url match : " + changeInfo.url);
                }


                //this will need to be run onupdated and maybe on created
                //could content script this and check that document.referrer == ""
            }
        }

    }
});



document.addEventListener("engineAdded", function (e) {
    log("added event captured from background page");


    notify.interface('drawEngine', function (view) {
        view.drawEngine(e.engine);
    });

}, false);



//************** public methods

function defaultSearch(terms, sameWindow) {

    var search = new searchHelper();

    if (search.is_url(terms))
        OpenPage(terms, sameWindow);
    else {
        search.hasMatchingWindow(terms, function (terms) {
            var searchCuts = search.getCuts(terms, engines);
            if (searchCuts) {
                searchCuts.engines.forEach(function (engine, index) {
                    if (index == 0) {
                        //first is the default
                        searchByEngine(engine, searchCuts.terms, sameWindow);
                    } else {
                        //open the rest in the background
                        searchByEngine(engine, searchCuts.terms, false);
                    }
                });
            } else {
                //TODO default engine should be added html gen... incase default changes and image icon doesn't
                //or make the icon update when default updates... that sounds better
                var defEng = getDefaultEngine();
                searchByEngine(defEng, terms, sameWindow);
            }



        });


    }
}



function getDefaultEngine() {

    if (this.settings.useLastEngine && getLastEngine()) {
        return getLastEngine();
    }
    return engines.getDefaultEngine();
}

function getLastEngine() {
    return lastEngine;
}


function searchList(idList, terms, sameWindow) {
    var first = true; //could we make an onlyOnce bool function

    idList.forEach(function (id) {
        var item = engines.findEngineById(id);
        if (item.Engines) {
            item.Engines.forEach(function (item) {
                searchByEngine(item, terms, first && sameWindow);
                first = false;
            });

        } else {
            searchByEngine(item, terms, first && sameWindow);
            first = false;
        }


    });

}

function searchByItem(item, terms) {
    if (item.Engines) {

        item.Engines.forEach(function (group) {
            searchByEngine(group, terms, false);
        });

    } else {
        searchByEngine(item, terms, false);
    }

}

function searchByEngine(engine, terms, sameWindow) {
    if (engine.IsPost == true) {

        //needs current tab
        //chrome.tabs.create({ url: "/loading.html", selected: false, index: tab.index + 1 });
        //may have to encode test witm &
        chrome.tabs.create({
            url: "/loading.html?eid=" + engine.Id + "&term=" + terms,
            selected: false
        });

    } else {
        searchByUrl(engine.SearchUrl, terms, sameWindow);
    }
    lastEngine = engine; //is just for set last engine, maybe should update this to a function setLastEngine()
}

//todo try not to directly use this as it is only for item that don't exist in the enginelist
//todo background... mybe even make private
//e.g a google sitesearch
//in the future thing like last engine used won't work here
function searchByUrl(url, terms, sameWindow) {



    var combinedSearchUrl = getFullSearchUrl(terms, url);
    OpenPage(combinedSearchUrl, sameWindow);
    this.searchHistory.add(terms);
}

//move to search
function getFullSearchUrl(terms, searchUrl) {
    var combinedSearchUrl = searchUrl.replace(/searchcenter/ig, encodeURIComponent(terms));
    return combinedSearchUrl;
}


function searchDomain(domain, searchTerm) {
    var eng = this.engines.findFirstEngineByDomain(domain, true);
    if (eng) {
        log("found");
        searchByEngine(eng, searchTerm, getOpenSearchInSameTab());
    } else {
        //do a google site search
        searchByUrl('http://www.google.com/search?sourceid=chrome&ie=UTF-8&q=searchcenter&as_sitesearch=' + domain, searchTerm, getOpenSearchInSameTab());
    }
}

//TODO test how many times this gets hit
function getSelection() {
    log("injecting selection script");
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tabs) {
        log("tabs.length:" + tabs.length);
        if (tabs.length > 0) {
            tab = tabs[0];
            log("tab.url:" + tab.url);

            if (is_url(tab.url)) {
                log("inject sucess");
                chrome.tabs.executeScript(null, {
                    file: "contentScripts/getSelection.js",
                    allFrames: true
                }, () => {
                    return chrome.runtime.lastError;
                });
            }
        }
    });
}

function OpenPage(pageUrl, sameTab) {
    chrome.tabs.query({
        active: true
    }, function (tabs) {
        tab = tabs[0];
        if (sameTab) {
            chrome.tabs.update(tab.id, {
                url: pageUrl
            });
        } else {
            chrome.tabs.create({
                url: pageUrl,
                selected: false,
                index: tab.index + 1
            });


        }
    });
}


function addCurrentWebsite() {
    log("exe opensearch script");
    chrome.tabs.executeScript(null, {
        file: "contentScripts/openSearch.js",
        allFrames: false
    });
}

//move to settings
function setOpenSearchInNewTab(same) {
    localStorage["NewTab"] = same;
}

//move to settings
function getOpenSearchInNewTab() {
    return localStorage["NewTab"] == 'true';

}
//TODO move to settings
//maybe rename to openPageInCurrentTab
function getOpenSearchInSameTab() {
    return !getOpenSearchInNewTab();
}

//********************** Search History


this.searchHistory = function () {
    //enhance could move this into a db

    var historyList = [];
    return {
        add: function (searchTerms) {
            log("add history:" + searchTerms);
            //localStorage["History"] = searchTerms;
            //should search for dup;s and remove them
            //have a max of 10
            //save???
            if (historyList[0]) {
                if (historyList[0] != searchTerms) {
                    historyList.unshift(searchTerms);
                }
            } else {
                historyList.unshift(searchTerms);
            }
        },
        //lastTerm: function() {
        //should obsolete this
        //even a litte bit of a privacy issue... not really
        //     var history = localStorage["History"];
        //      if (!history)
        //         return "";
        //      return history;
        //  },
        term: function (index) {
            //return lastterm if index does not exist
            //is this ? : even needed historyList must always exists
            return historyList ? historyList[index] : null;

        },

        get history() {
            return historyList;
        } //,setInterval history(){value}


        //would be good to make this an []
        //previousTerm(term)
        //nextTerm(term)//not found it's blank.. or self
    }
}();


//*********** cache

function getCachedImage(imageUrl) {
    return imageCache.getCachedImage(imageUrl);
};


function ClearImageCache() {
    return imageCache.ClearCache();
}



//********* Open Search

function addTrainedWebsite(message) {
    log("adding trained search");

    var eng = engine.CreateEngine(message.engineName, message.favIcon, message.href);

    engines.addEngine(eng);
    notify.popup(function (view) {
        view.openSearchAdded();
    });
}


function addOpenSearch(message) {

    if (message.found == true) {
        getXml(message.href, function (xml) {

            log("recieved definition file");
            //todo should trycatch in opensearch.xml is malformed

            var engineName, icon, searchUrl;
            //todo update these to Xpaths so you only need to get check for one element
            engineName = xml.getElementsByTagName("ShortName")[0].childNodes[0].nodeValue;
            log("engine name:" + engineName);

            //since Image is optional it might no be included
            var imageElement = xml.getElementsByTagName("Image")[0];
            if (imageElement) {
                icon = imageElement.childNodes[0].nodeValue;
            } else {
                //TODO search for favicon in page
                icon = "images/blankIcon.png"
            }


            searchUrl = xml.getElementsByTagName("Url")[0].attributes.getNamedItem("template").nodeValue.toString();
            searchUrl = searchUrl.replace("{searchTerms}", "searchcenter");
            searchUrl = searchUrl.replace(/{\w*\?}/g, ""); //removes optional arguments (page={startindex?})

            //maybe move this into engineList

            var eng = engine.CreateEngine(engineName, icon, searchUrl, message.href);
            engines.addEngine(eng);
            //update popup with engineadded logic
            notify.popup(function (view) {
                view.openSearchAdded();
            });



            //http://www.amazon.com/ bug
            //todo may have index attibutes other than {searchterm}


            //check that the ajax call works

            //can we work out if the image is there?


        }, function (errorMessage) {
            notify.popup(function (view) {
                view.addSiteError();
            });
        });
    } else {
        notify.popup(function (view) {
            view.addSiteUnsupported();
        });
    }
}


function attachShortCut(tabId) {
    if (!hotKeyScript) {
        hotKeyScript = generateHotKeyScript();
    }

    chrome.tabs.executeScript(tabId, {
        code: hotKeyScript
    }, () => {
        if (chrome.runtime.lastError)
            log("addshortcut:" + chrome.runtime.lastError.message);
    });
}


function generateHotKeyScript() {
    var info = this.settings.searchBarHotKey;
    //or attach event to update with
    var extendedPropertys = "";
    if (info.ctrlKey) {
        extendedPropertys += " && e.ctrlKey ";
    }
    if (info.shiftKey) {
        extendedPropertys += " && e.shiftKey ";
    }
    if (info.altKey) {
        extendedPropertys += " && e.altKey ";
    }
    return "document.addEventListener('keydown', keyPress, false); " +
        "function keyPress(e) {" +
        "   if (e.keyCode == " + info.keyCode + extendedPropertys +
        ") {" +
        "      document.removeEventListener('keydown', keyPress,false);" +
        "       chrome.extension.sendRequest({ msg: 'quickSearch' }); " +
        "   }" +
        "}";
}


//************** helper methods


//use a callBack for async, otherwise sync
function GetJSON(url, callBack) {
    var httpRequest = new XMLHttpRequest();

    if (callBack) {
        httpRequest.open("GET", url, true);
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState == 4) {
                if (httpRequest.responseText != "")
                    callBack(JSON.parse(httpRequest.responseText));
            }
        }
        httpRequest.send(null);
    } else {
        httpRequest.open("GET", url, false);
        httpRequest.send(null);
        if (httpRequest.responseText != "") {
            return JSON.parse(httpRequest.responseText);
        } else {
            return null
        }
    }

}


function getXml(url, callBackSuccess, callBackFailure) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.open("GET", url, true);
    httpRequest.onreadystatechange = function () {

        if (httpRequest.readyState == 4) {
            if (httpRequest.status == 200 || httpRequest.status == 0) {
                if (httpRequest.responseXML) {
                    callBackSuccess(httpRequest.responseXML);
                } else {
                    //not valid Xml
                    //call the failed callBack
                    if (callBackFailure)
                        callBackFailure({
                            Message: "Invalid Xml file"
                        });
                    log("not valid XML");

                }
                //alert(xmlhttp.getAllResponseHeaders());
            } else {
                if (callBackFailure)
                    callBackFailure({
                        Message: "Network failure/Invalid file location"
                    });
                log("not point logging");
            }
        }

    }


    httpRequest.send(null);
    xmlDoc = httpRequest.responseXML;
}

String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, "");
}


function inspect(data) {
    log(data);
}

function log(message) {
    console.log(message);

    if (settings.debugMode) {
        // notify.popup(function(view) {
        //view.addSiteUnsupported(); 
        //   });
        notify.debugView(function (debugView) {
            debugView.DisplayLog(message);
        });


    }
}