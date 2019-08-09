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

function isURL(str_url) {// 验证url
    var strRegex = "^((https|http)?://)"
    + "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?" // ftp的user@
    + "(([0-9]{1,3}\.){3}[0-9]{1,3}" // IP形式的URL- 199.194.52.184
    + "|" // 允许IP和DOMAIN（域名）
    + "([0-9a-z_!~*'()-]+\.)*" // 域名- www.
    + "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\." // 二级域名
    + "[a-z]{2,6})" // first level domain- .com or .museum
    + "(:[0-9]{1,4})?" // 端口- :80
    + "((/?)|" // a slash isn't required if there is no file name
    + "(/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+/?)$";
    var re = new RegExp(strRegex);
    return re.test(str_url);
}

function isLocalRequest(uri) {
    return !!uri.match(/^https?:\/\/(127\.0\.0\.1|localhost)|^file:\/\//);
}

//a whole domina/url object
//isUrl
//getparams
//getport
//etc
//getprotocal
//gethost
