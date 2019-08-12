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
    domain = ""
    // logger.log("domainaddr:" + address); //should return newtab?
    if (address != null && address !== undefined) {
        domainlist = address.toString().match(/^https?:\/\/([^\/]*)\//ig);

        if (domainlist != null) domain = domainlist[0];
    }
    return domain
}

function is_url(str) {
    regexp = /^(?:(?:https?):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
    if (regexp.test(str)) {
        return true;
    } else {
        return false;
    }
}



function isLocalRequest(uri) {
    return !!uri.match(/^https?:\/\/(127\.0\.0\.1|localhost)|^file:\/\//);
}

//a whole domina/url object
//is_url
//getparams
//getport
//etc
//getprotocal
//gethost