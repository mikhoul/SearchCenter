/* Logger */
/* this should be overridable in subsuquest page, i.e bgPage, optionsPage, PopupPage */

var logger = (function () {
    var myLogger = {};

    // basic logger that should be overridden
    myLogger.log = function (value) {
        if (console) {
            console.log(value);
        }
    };

    return myLogger;
}());


/* InitPage */
/* set Focus */

/// due to a bug in chrome 18 normal page textbox focus does not work in a popup
///... this is the workaround
// todo this should not be in common as it's popup specfifc
function setPageFocus() {
    if (location.search !== "?foo") {
        location.search = "?foo";
    }
}

/* Url Helper */
// todo obsolete this with a url helper
function getDomain(address) {
    domain=""
    logger.log("attempting to grab domain");
    logger.log("addr:"+address); //should return newtab?
    if (address != null && address !== undefined){
        domainlist=address.toString().match(/^https?:\/\/([^\/]*)\//ig);

        if (domainlist!=null)  domain=domainlist[0];
    }
    return domain
}


//a whole domina/url object
//isUrl
//getparams
//getport
//etc
//getprotocal
//gethost
