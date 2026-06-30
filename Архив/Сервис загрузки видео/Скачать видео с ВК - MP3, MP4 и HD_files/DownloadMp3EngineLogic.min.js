InitPreDownloadTime = 6;
InitDownLoadVideoTime = 6;
InitConvesionTime = 6;
TotalTime = InitPreDownloadTime + InitDownLoadVideoTime + InitConvesionTime;
PreDownLoadPrecntage = Math.floor(InitPreDownloadTime / TotalTime * 100);
var DownLoadVideoTime = [];
var AfterDownloadTime = [];
var ActualConvertVideoPrecntage = [];
var DownLoadVideoPrecntage = [];
var ConversionPrecntage = [];
var PreDownLoadStartTime = [];
var IsPreDownLoadFinish = [];
var IsDownloadVideoFinish = [];
var IsAfterDownloadFinish = [];
var ErrorOccured = [];
var ActualDownLoadVideoPrecntage = [];
var GeneralVideoSize = [];
var Ids = [];
var myObjects = [];
var MyServer = [];
var songLink = [];
var formats = [];
var qualities = [];
var mediaTypes = [];
var sourceNames = [];
var percentageTimerStarted = [];
var cacheKiller = [];
var checkNewReturnZeoCount = [];
var PreDownloadPageAccess = [];
var DownloadPageAccess = [];
var CheckPageAccess = [];
var PlaylistSource = "defult";
var env = "online/";
initVars(0);
var mp3host;
var ajaxCall;
if (location.protocol == "http:") {
    ajaxCall = window.location.hostname.replace("www.", "");
    mp3host = ajaxCall
} else {
    ajaxCall = "workerserverbl.com";
    mp3host = ajaxCall
} if (window.location.hostname == "127.0.0.1") {
    mp3host = "workerserverbl.com";
    ajaxCall = "workerserverbl.com"
} function getServerName() {
    v = Math.floor(Math.random() * 12) + 1;
    if (v == 0) { Server = "server1" } else if (v == 1) { Server = "server2" } else if (v == 2) { Server = "server3" } else if (v == 3) { Server = "server4" } else if (v == 4) { Server = "server6" } else if (v == 5) { Server = "server9" } else if (v == 6) { Server = "server12" } else if (v == 7) { Server = "server14" } else if (v == 8) { Server = "server17" } else if (v == 9) { Server = "server18" } else if (v == 10) { Server = "server19" } else if (v == 11) { Server = "server20" } else { Server = "server21" } return Server
} function getServerName2() {
    v = Math.floor(Math.random() * 10);
    if (v == 0) { Server = "server2" } else if (v == 1) { Server = "server4" } else if (v == 2) { Server = "server6" } else if (v == 3) { Server = "server14" } else if (v == 4) { Server = "server15" } else if (v == 5) { Server = "server16" } else if (v == 6) { Server = "server17" } else if (v == 7) { Server = "server18" } else if (v == 8) { Server = "server19" } else if (v == 9) { Server = "server20" } else { Server = "server21" } return Server
} function initVars(index) {
    if (MyServer[index] == "country2") { MyServer[index] = getServerName2() } else { MyServer[index] = getServerName() } cacheKiller[index] = 20;
    checkNewReturnZeoCount[index] = 0;
    DownLoadVideoTime[index] = InitDownLoadVideoTime;
    AfterDownloadTime[index] = InitConvesionTime;
    formats[index] = "MP3";
    formats[index] = "sd";
    DownLoadVideoPrecntage[index] = Math.floor(DownLoadVideoTime[index] / TotalTime * 100);
    ConversionPrecntage[index] = Math.floor(AfterDownloadTime[index] / TotalTime * 100);
    PreDownLoadStartTime[index] = (new Date).getTime();
    IsPreDownLoadFinish[index] = false;
    IsDownloadVideoFinish[index] = false;
    IsAfterDownloadFinish[index] = false;
    ErrorOccured[index] = false;
    percentageTimerStarted[index] = false;
    ActualConvertVideoPrecntage[index] = 0;
    ActualDownLoadVideoPrecntage[index] = 0;
    GeneralVideoSize[index] = 0;
    Ids[index] = 0;
    songLink[index] = "";
    PlaylistSource = "defult"
} function dispatchErrorEvent(errorMsg, index, sourceName) {
    var ErrorEvent = document.createEvent("Event");
    ErrorEvent.initEvent("ErrorEvent", true, true);
    ErrorOccured[index] = true;
    ErrorEvent.customData = errorMsg;
    ErrorEvent.index = index;
    ErrorEvent.sourceName = sourceName;
    window.dispatchEvent(ErrorEvent)
} function StartDownloadProcess(url, index, format, quality, PremiumToken, fromContent) {
    PremiumToken = typeof PremiumToken !== "undefined" ? PremiumToken : null;
    StartDownloadProcessImpl(url, index, format, quality, PremiumToken, fromContent)
} function StartDownloadProcessImpl(url, index, format, quality, PremiumToken, fromContent) {
    initVars(index);
    formats[index] = format;
    qualities[index] = quality;
    percentageTimerStarted[index] = true;
    setTimeout(function (temp) { return function () { PrecntageCalc(temp) } }(index), 500);
    PreDownloadPageAccess[index] = GetAjaxAccess();
    PreDownloadPageAccess[index].onreadystatechange = function (CurrUrl, CurrIndex, CurrFormat, CurrQuality, CurrPremiumToken, CurrFromContent) {
        return function () {
            if (PreDownloadPageAccess[CurrIndex].readyState == 4 && PreDownloadPageAccess[CurrIndex].status == 200) {
                var myJSONtext = PreDownloadPageAccess[CurrIndex].responseText;
                var myObject = JSON.parse(myJSONtext);
                sourceNames[CurrIndex] = myObject.SourceName;
                if (myObject.Result == "Error") {
                    if (myObject.Error == "Country2") {
                        if (MyServer[CurrIndex] != "server2" && MyServer[CurrIndex] != "server6" && MyServer[CurrIndex] != "server7" && MyServer[CurrIndex] != "server13" && MyServer[CurrIndex] != "server14" && MyServer[CurrIndex] != "server15" && MyServer[CurrIndex] != "server16" && MyServer[CurrIndex] != "server17" && MyServer[CurrIndex] != "server18" && MyServer[CurrIndex] != "server19" && MyServer[CurrIndex] != "server20" && MyServer[CurrIndex] != "server21") {
                            MyServer[CurrIndex] = "country2";
                            StartDownloadProcessImpl(CurrUrl, CurrIndex, CurrFormat, CurrQuality, CurrPremiumToken, CurrFromContent);
                            return
                        } else { dispatchErrorEvent("Country", CurrIndex, myObject.SourceName) }
                    } else {
                        var PopError = true;
                        if (myObject.Error == "TooLong") {
                            myObject.TooLong = true;
                            PopError = true
                        } FireParsingFiniedEvent(myObject, CurrIndex);
                        if (PopError) { dispatchErrorEvent(myObject.Error, CurrIndex, myObject.SourceName) }
                    }
                } else { if (myObject.Result == "Playlist") { HandlePlaylist(myObject, CurrIndex) } else if (myObject.Dummy == "Direct") { HandleDirect(myObject, CurrIndex) } else { HandleIndirect(myObject, CurrIndex) } }
            }
        }
    }(url, index, format, quality, PremiumToken, fromContent);
    LinkPreDownload = "";
    premiumParam = "";
    if (PremiumToken != 0) { premiumParam = "&token=" + PremiumToken } postParams = "";
    if (fromContent != null) { postParams = fromContent } LinkPreDownload = location.protocol + "//" + MyServer[index] + "." + ajaxCall + "/" + env + "PreDownload.php?url=" + encodeURIComponent(url) + "&format=" + format + "&quality=" + quality + premiumParam + "&statBeh=" + statBeh + "&speed=" + SHA(url);
    if (postParams == "") {
        PreDownloadPageAccess[index].open("GET", LinkPreDownload, true);
        PreDownloadPageAccess[index].send()
    } else {
        PreDownloadPageAccess[index].open("POST", LinkPreDownload, true);
        PreDownloadPageAccess[index].setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        PreDownloadPageAccess[index].send(postParams)
    }
} function HandlePlaylist(myObject, index) {
    IsPreDownLoadFinish[0] = true;
    var PlaylistRetrievedEvent = document.createEvent("Event");
    PlaylistRetrievedEvent.initEvent("PlaylistRetrievedEvent", true, true);
    PlaylistRetrievedEvent.playlist = myObject.playlist;
    PlaylistRetrievedEvent.header = myObject.header;
    PlaylistRetrievedEvent.source = myObject.source;
    PlaylistRetrievedEvent.sourceName = myObject.SourceName;
    PlaylistRetrievedEvent.IsPrivate = false;
    if ("private" in myObject) { if (myObject["private"] == true) { PlaylistRetrievedEvent.IsPrivate = true } } PlaylistRetrievedEvent.HasMore = false;
    if (myObject.SourceName == "InstagramUser" && myObject.playlist.length == 120) { PlaylistRetrievedEvent.HasMore = true } else if (myObject.SourceName == "FacebookPages" && myObject.playlist.length == 60) { PlaylistRetrievedEvent.HasMore = true } PlaylistRetrievedEvent.index = index;
    window.dispatchEvent(PlaylistRetrievedEvent)
} function DownloadFinished(index) {
    IsAfterDownloadFinish[index] = true;
    var DownloadFinisedEvent = document.createEvent("Event");
    DownloadFinisedEvent.initEvent("DownloadFinised", true, true);
    DownloadFinisedEvent.customData = songLink[index];
    DownloadFinisedEvent.sourceName = sourceNames[index];
    DownloadFinisedEvent.index = index;
    window.dispatchEvent(DownloadFinisedEvent)
} function HandleDirect(myObject, index) {
    songLink[index] = myObject.FlvUrl;
    myObject.TooLong = false;
    FireParsingFiniedEvent(myObject, index);
    DownloadFinished(index)
} function HandleIndirect(myObject, index) {
    mediaTypes[index] = myObject.Media;
    if (myObject.Dummy != "") {
        SongFileName = myObject.SongName + "." + formats[index].toLowerCase();
        if (IsDirect) { songLink[index] = location.protocol + "//" + myObject.Dummy + "." + mp3host + "/mp3/" + myObject.Id + ".mp3" } else { songLink[index] = location.protocol + "//" + myObject.Dummy + "." + mp3host + "/" + env + "mp3.php?id=" + myObject.Id + "&mp3=" + SongFileName + "&quality=" + qualities[index].toLowerCase() + "&token1=" + myObject.token1 + "&token2=" + myObject.token2 + "&isPhoto=" + (mediaTypes[index] == "Photo") }
    } else { songLink[index] = "" } myObject.TooLong = false;
    FireParsingFiniedEvent(myObject, index);
    ReCalcPrecntage(myObject.VideoSize, index);
    IsPreDownLoadFinish[index] = true;
    Ids[index] = myObject.Id;
    if (myObject.Dummy != "") { DownloadFinished(index) } else {
        myObjects[index] = myObject;
        Download(index)
    }
} function GetValue(value, defaultValue) { if (typeof value === "undefined") { return defaultValue } else { return value } } function FireParsingFiniedEvent(myObject, index) {
    var ParsingFiniedEvent = document.createEvent("Event");
    ParsingFiniedEvent.initEvent("ParsingFiniedEvent", true, true);
    ParsingFiniedEvent.SongName = GetValue(myObject.SongName, "");
    ParsingFiniedEvent.sourceName = GetValue(myObject.SourceName, "Unknown-checkit");
    ParsingFiniedEvent.VideoUrl = GetValue(myObject.VideoUrl, "");
    ParsingFiniedEvent.VideoHDUrl = GetValue(myObject.VideoHDUrl, "");
    if (index < songLink.length) { ParsingFiniedEvent.mp3 = songLink[index] } ParsingFiniedEvent.index = index;
    ParsingFiniedEvent.Length = GetValue(myObject.Length, 0);
    ParsingFiniedEvent.Image = GetValue(myObject.Image, "");
    ParsingFiniedEvent.TooLong = GetValue(myObject.TooLong, false);
    ParsingFiniedEvent.Media = GetValue(myObject.Media, "");
    window.dispatchEvent(ParsingFiniedEvent)
} IsDirect = false;
function Download(index) {
    if (percentageTimerStarted[index] == false) {
        percentageTimerStarted[index] == true;
        setTimeout(function (temp) { return function () { PrecntageCalc(temp) } }(index), 500)
    } myObject = myObjects[index];
    Id = myObject.Id;
    SongFileName = myObject.SongName + "." + formats[index].toLowerCase();
    FlvUrl = myObject.FlvUrl;
    VideoSize = myObject.VideoSize;
    DownloadPageAccess[index] = GetAjaxAccess();
    DownloadPageAccess[index].onreadystatechange = function (CurrentIndex, CurrentId, CurrentSongFileName, CurrentToken1, CurrentToken2) { return function () { if (DownloadPageAccess[CurrentIndex].readyState == 4 && DownloadPageAccess[CurrentIndex].status == 200) { if (DownloadPageAccess[CurrentIndex].responseText == 1) { if (IsDirect) { songLink[CurrentIndex] = location.protocol + "//" + MyServer[CurrentIndex] + "." + mp3host + "/mp3/" + CurrentId + ".mp3" } else { songLink[CurrentIndex] = location.protocol + "//" + MyServer[CurrentIndex] + "." + mp3host + "/" + env + "mp3.php?id=" + CurrentId + "&mp3=" + CurrentSongFileName + "&quality=" + qualities[index].toLowerCase() + "&token1=" + CurrentToken1 + "&token2=" + CurrentToken2 + "&isPhoto=" + (mediaTypes[index] == "Photo") } DownloadFinished(CurrentIndex) } } } }(index, Id, SongFileName, myObject.token1, myObject.token2);
    Link = location.protocol + "//" + MyServer[index] + "." + ajaxCall + "/" + env + "Download.php?time_stamp=" + Id + "&video_url=" + encodeURIComponent(FlvUrl) + "&video_size=" + VideoSize + "&format=" + formats[index] + "&quality=" + qualities[index] + "&isPhoto=" + (mediaTypes[index] == "Photo");
    DownloadPageAccess[index].open("GET", Link, true);
    DownloadPageAccess[index].send();
    GeneralVideoSize[index] = VideoSize;
    CheckVideoSize(index)
} function GetAjaxAccess() { if (window.XMLHttpRequest) { return new XMLHttpRequest } else { return new ActiveXObject("Microsoft.XMLHTTP") } } var waitTime = 2e3;
function CheckVideoSize(index) {
    CheckPageAccess[index] = GetAjaxAccess();
    cacheKiller[index]++;
    if (cacheKiller[index] >= 50) { waitTime = 1e4 } else if (cacheKiller[index] >= 40) { waitTime = 8e3 } else if (cacheKiller[index] >= 30) { waitTime = 6e3 } else if (cacheKiller[index] >= 23) { waitTime = 4e3 } LinkCheck = location.protocol + "//" + MyServer[index] + "." + ajaxCall + "/" + env + "check-new.php?id=" + Ids[index] + "&superDummy=" + cacheKiller[index] + "&format=" + formats[index];
    CheckPageAccess[index].open("GET", LinkCheck, true);
    CheckPageAccess[index].onreadystatechange = function (temp, CurrWaitTime) {
        return function () {
            if (CheckPageAccess[temp].readyState == 4 && CheckPageAccess[temp].status == 200) {
                if (IsAfterDownloadFinish[temp] == false) {
                    var res = CheckPageAccess[temp].responseText.trim();
                    if (res == "0") { checkNewReturnZeoCount[index]++ } if (checkNewReturnZeoCount[index] > 6) { return } if (res.substr(0, 1) == "c") {
                        IsDownloadVideoFinish[temp] = true;
                        ActualConvertVideoPrecntage[temp] = res.substr(1);
                        if (ActualConvertVideoPrecntage[temp] < 100) { setTimeout(function (InnerTemp) { return function () { CheckVideoSize(InnerTemp) } }(temp), CurrWaitTime) }
                    } else if (!IsDownloadVideoFinish[temp]) {
                        FileSize = res;
                        ActualDownLoadVideoPrecntage[temp] = Math.floor(FileSize / GeneralVideoSize[temp] * 100);
                        if (ActualDownLoadVideoPrecntage[temp] >= 100) { IsDownloadVideoFinish[temp] = true } setTimeout(function (InnerTemp) { return function () { CheckVideoSize(InnerTemp) } }(temp), CurrWaitTime)
                    }
                }
            }
        }
    }(index, waitTime);
    CheckPageAccess[index].send()
} function PrecntageCalc(index) {
    if (ErrorOccured[index] == false) {
        precentage = 0;
        if (formats[index] == "MP4" && sourceNames[index] != "Facebook" && sourceNames[index] != "facebook" && (sourceNames[index] != "Twitter" || UGSOB_Junction) && sourceNames[index] != "FacebookPrivateOnline" && sourceNames[index] != "Periscope" && sourceNames[index] != "Vimeo" && (sourceNames[index] != "YouTube" || Re_Junction)) { precentage = Math.floor(PrecntageSectionCalc(InitPreDownloadTime, PreDownLoadStartTime[index]) * 100) } else if (!IsPreDownLoadFinish[index]) { precentage = Math.floor(PrecntageSectionCalc(InitPreDownloadTime, PreDownLoadStartTime[index]) * PreDownLoadPrecntage) } else if (!IsDownloadVideoFinish[index]) { precentage = Math.floor(ActualDownLoadVideoPrecntage[index] / 100 * DownLoadVideoPrecntage[index]) + PreDownLoadPrecntage } else if (!IsAfterDownloadFinish[index]) { precentage = Math.floor(ActualConvertVideoPrecntage[index] / 100 * ConversionPrecntage[index]) + PreDownLoadPrecntage + DownLoadVideoPrecntage[index] } if (!IsAfterDownloadFinish[index]) {
            var PrecntageUpdatedEvent = document.createEvent("Event");
            PrecntageUpdatedEvent.initEvent("PrecntageUpdated", true, true);
            PrecntageUpdatedEvent.precentage = precentage;
            PrecntageUpdatedEvent.index = index;
            window.dispatchEvent(PrecntageUpdatedEvent);
            setTimeout(function (temp) { return function () { PrecntageCalc(temp) } }(index), 500)
        }
    }
} function PrecntageSectionCalc(TotalSectioTime, SectionStartTime) {
    TimeOver = ((new Date).getTime() - SectionStartTime) / 1e3;
    if (TimeOver > TotalSectioTime) { TimeOver = TotalSectioTime } return TimeOver / TotalSectioTime
} function ReCalcPrecntage(VideoSize, index) {
    DownLoadRate = 15e5;
    DownLoadVideoTime[index] = Math.ceil(VideoSize / DownLoadRate);
    AfterDownloadTime[index] = Math.ceil(VideoSize / 2e6);
    UpdatedTotalTime = DownLoadVideoTime[index] + AfterDownloadTime[index];
    DownLoadVideoPrecntage[index] = Math.floor(DownLoadVideoTime[index] / UpdatedTotalTime * (100 - PreDownLoadPrecntage));
    ConversionPrecntage[index] = Math.floor(AfterDownloadTime[index] / UpdatedTotalTime * (100 - PreDownLoadPrecntage))
} function checkInput(url) {
    ThisSite = window.location.hostname;
    return (ThisSite == "" || url.indexOf(ThisSite) == -1) && url.indexOf("youtubeto.com") == -1 && url.length > 1
} var SHA = function (string) {
    function RotateLeft(lValue, iShiftBits) { return lValue << iShiftBits | lValue >>> 32 - iShiftBits } function AddUnsigned(lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = lX & 2147483648;
        lY8 = lY & 2147483648;
        lX4 = lX & 1073741824;
        lY4 = lY & 1073741824;
        lResult = (lX & 1073741823) + (lY & 1073741823);
        if (lX4 & lY4) { return lResult ^ 2147483648 ^ lX8 ^ lY8 } if (lX4 | lY4) { if (lResult & 1073741824) { return lResult ^ 3221225472 ^ lX8 ^ lY8 } else { return lResult ^ 1073741824 ^ lX8 ^ lY8 } } else { return lResult ^ lX8 ^ lY8 }
    } function F(x, y, z) { return x & y | ~x & z } function G(x, y, z) { return x & z | y & ~z } function H(x, y, z) { return x ^ y ^ z } function I(x, y, z) { return y ^ (x | ~z) } function FF(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b)
    } function GG(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b)
    } function HH(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b)
    } function II(a, b, c, d, x, s, ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b)
    } function ConvertToWordArray(string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWords_temp1 = lMessageLength + 8;
        var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - lNumberOfWords_temp1 % 64) / 64;
        var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        var lWordArray = Array(lNumberOfWords - 1);
        var lBytePosition = 0;
        var lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - lByteCount % 4) / 4;
            lBytePosition = lByteCount % 4 * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | string.charCodeAt(lByteCount) << lBytePosition;
            lByteCount++
        } lWordCount = (lByteCount - lByteCount % 4) / 4;
        lBytePosition = lByteCount % 4 * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | 128 << lBytePosition;
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray
    } function WordToHex(lValue) {
        var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0;
            lCount <= 3;
            lCount++) {
                lByte = lValue >>> lCount * 8 & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2)
        } return WordToHexValue
    } function Utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0;
            n < string.length;
            n++) {
                var c = string.charCodeAt(n);
            if (c < 128) { utftext += String.fromCharCode(c) } else if (c > 127 && c < 2048) {
                utftext += String.fromCharCode(c >> 6 | 192);
                utftext += String.fromCharCode(c & 63 | 128)
            } else {
                utftext += String.fromCharCode(c >> 12 | 224);
                utftext += String.fromCharCode(c >> 6 & 63 | 128);
                utftext += String.fromCharCode(c & 63 | 128)
            }
        } return utftext
    } var x = Array();
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
    string = string.replace(/[^A-Za-z0-9]/g, "");
    string = Utf8Encode(string);
    x = ConvertToWordArray(string);
    a = 1732584193;
    b = 4023233417;
    c = 2562383102;
    d = 271733878;
    for (k = 0;
        k < x.length;
        k += 16) {
            AA = a;
        BB = b;
        CC = c;
        DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 3614090360);
        d = FF(d, a, b, c, x[k + 1], S12, 3905402710);
        c = FF(c, d, a, b, x[k + 2], S13, 606105819);
        b = FF(b, c, d, a, x[k + 3], S14, 3250441966);
        a = FF(a, b, c, d, x[k + 4], S11, 4118548399);
        d = FF(d, a, b, c, x[k + 5], S12, 1200080426);
        c = FF(c, d, a, b, x[k + 6], S13, 2821735955);
        b = FF(b, c, d, a, x[k + 7], S14, 4249261313);
        a = FF(a, b, c, d, x[k + 8], S11, 1770035416);
        d = FF(d, a, b, c, x[k + 9], S12, 2336552879);
        c = FF(c, d, a, b, x[k + 10], S13, 4294925233);
        b = FF(b, c, d, a, x[k + 11], S14, 2304563134);
        a = FF(a, b, c, d, x[k + 12], S11, 1804603682);
        d = FF(d, a, b, c, x[k + 13], S12, 4254626195);
        c = FF(c, d, a, b, x[k + 14], S13, 2792965006);
        b = FF(b, c, d, a, x[k + 15], S14, 1236535329);
        a = GG(a, b, c, d, x[k + 1], S21, 4129170786);
        d = GG(d, a, b, c, x[k + 6], S22, 3225465664);
        c = GG(c, d, a, b, x[k + 11], S23, 643717713);
        b = GG(b, c, d, a, x[k + 0], S24, 3921069994);
        a = GG(a, b, c, d, x[k + 5], S21, 3593408605);
        d = GG(d, a, b, c, x[k + 10], S22, 38016083);
        c = GG(c, d, a, b, x[k + 15], S23, 3634488961);
        b = GG(b, c, d, a, x[k + 4], S24, 3889429448);
        a = GG(a, b, c, d, x[k + 9], S21, 568446438);
        d = GG(d, a, b, c, x[k + 14], S22, 3275163606);
        c = GG(c, d, a, b, x[k + 3], S23, 4107603335);
        b = GG(b, c, d, a, x[k + 8], S24, 1163531501);
        a = GG(a, b, c, d, x[k + 13], S21, 2850285829);
        d = GG(d, a, b, c, x[k + 2], S22, 4243563512);
        c = GG(c, d, a, b, x[k + 7], S23, 1735328473);
        b = GG(b, c, d, a, x[k + 12], S24, 2368359562);
        a = HH(a, b, c, d, x[k + 5], S31, 4294588738);
        d = HH(d, a, b, c, x[k + 8], S32, 2272392833);
        c = HH(c, d, a, b, x[k + 11], S33, 1839030562);
        b = HH(b, c, d, a, x[k + 14], S34, 4259657740);
        a = HH(a, b, c, d, x[k + 1], S31, 2763975236);
        d = HH(d, a, b, c, x[k + 4], S32, 1272893353);
        c = HH(c, d, a, b, x[k + 7], S33, 4139469664);
        b = HH(b, c, d, a, x[k + 10], S34, 3200236656);
        a = HH(a, b, c, d, x[k + 13], S31, 681279174);
        d = HH(d, a, b, c, x[k + 0], S32, 3936430074);
        c = HH(c, d, a, b, x[k + 3], S33, 3572445317);
        b = HH(b, c, d, a, x[k + 6], S34, 76029189);
        a = HH(a, b, c, d, x[k + 9], S31, 3654602809);
        d = HH(d, a, b, c, x[k + 12], S32, 3873151461);
        c = HH(c, d, a, b, x[k + 15], S33, 530742520);
        b = HH(b, c, d, a, x[k + 2], S34, 3299628645);
        a = II(a, b, c, d, x[k + 0], S41, 4096336452);
        d = II(d, a, b, c, x[k + 7], S42, 1126891415);
        c = II(c, d, a, b, x[k + 14], S43, 2878612391);
        b = II(b, c, d, a, x[k + 5], S44, 4237533241);
        a = II(a, b, c, d, x[k + 12], S41, 1700485571);
        d = II(d, a, b, c, x[k + 3], S42, 2399980690);
        c = II(c, d, a, b, x[k + 10], S43, 4293915773);
        b = II(b, c, d, a, x[k + 1], S44, 2240044497);
        a = II(a, b, c, d, x[k + 8], S41, 1873313359);
        d = II(d, a, b, c, x[k + 15], S42, 4264355552);
        c = II(c, d, a, b, x[k + 6], S43, 2734768916);
        b = II(b, c, d, a, x[k + 13], S44, 1309151649);
        a = II(a, b, c, d, x[k + 4], S41, 4149444226);
        d = II(d, a, b, c, x[k + 11], S42, 3174756917);
        c = II(c, d, a, b, x[k + 2], S43, 718787259);
        b = II(b, c, d, a, x[k + 9], S44, 3951481745);
        a = AddUnsigned(a, AA);
        b = AddUnsigned(b, BB);
        c = AddUnsigned(c, CC);
        d = AddUnsigned(d, DD)
    } var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
    return temp.toLowerCase()
};
isiOS = false;
isMobileVersion = false;
iswidget = false;
PlaylistErrorDesc = "PlaylistErrorDesc";
PlaylistErrorTitle = "PlaylistErrorTitle";
var taskDetails = [];
var PlaylistDetails = [];
var dataRetrieved = false;
var TaskCounter = 0;
var PlaylistCounter = 0;
var CurrentTasksHolder = null;
var TaskAtSameTime = 3;
var MP3WaitBetweenTasks = 3e3;
var MP4WaitBetweenTasks = 6e3;
var suggestCallBack;
if (IsSearchable) {
    $(document).ready(function () {
        $("#url").autocomplete({
            source: function (request, response) {
                if (!request.term.startsWith("http") && !request.term.startsWith("www")) { $.getJSON("https://suggestqueries.google.com/complete/search?callback=?", { hl: "en", ds: "yt", jsonp: "suggestCallBack", q: request.term, client: "youtube" }) } else { response([]) } suggestCallBack = function (data) {
                    var suggestions = [];
                    $.each(data[1], function (key, val) { suggestions.push({ value: val[0] }) });
                    response(suggestions)
                }
            }
        })
    })
} function Convert(format, quality, syb, fromContent, url) {
    var syb = typeof syb !== "undefined" ? syb : true;
    var fromContent = typeof fromContent !== "undefined" ? fromContent : null;
    index = TaskCounter;
    ++TaskCounter;
    var UrlToConvert = "";
    if (typeof url !== "undefined") { UrlToConvert = url } else {
        UrlToConvert = document.getElementById("url").value;
        document.getElementById("url").value = ""
    } UrlToConvert = PreServerRequest(UrlToConvert, index, syb);
    if (UrlToConvert != null) {
        CurrentTasksHolder.style.display = "block";
        taskDetails[index] = { Format: format, Quality: quality, URL: UrlToConvert, Progress: -1, StartFunc: null, IsAbleStartDownload: true, PlaylistParent: -1, ParticpentCheckbox: null, fromContent: fromContent != null };
        if (SendGoogleAnalyticsEvents) { FireAnalyticEvent("send", "event", Usages, "Conversion Started", format + quality) } StartDownloadProcess(UrlToConvert, index, format, quality, GetPremiumToken(), fromContent)
    }
} function GetPremiumToken() { if (isHappy) { return getCookie("session_token") } else { return 0 } } function PreServerRequest(url, index, syb) {
    if (url.indexOf("fc2.com") != -1) {
        ShowErrorMessage(GeneralErrorTitle, FC2Explanation, 0, "", "Parse-Error_ViaMainSite (fc2)");
        return null
    } if (url.indexOf("vimeo.com") != -1) {
        ShowErrorMessage(GeneralErrorTitle, BlogVimeoExplanation, 0, "", "Parse-Error_ViaMainSite (vimeo)");
        return null
    } if (syb == false) {
        if (url.indexOf("youtube.com") != -1 || url.indexOf("y2u.be") != -1 || url.indexOf("youtu.be") != -1 || url.indexOf("i.ytimg.com") != -1 || url.indexOf(".") == -1) {
            ShowErrorMessage(PleaseEnterSupportedUrlTitle, PleaseEnterSupportedUrl, 0, "", "InvalidInput_ViaMainSite");
            if (SendGoogleAnalyticsEvents) { FireAnalyticEvent(Usages, "Bad Input", url) } return null
        }
    } if (checkInput(url)) {
        CreateTasksHolder();
        AddAd(index, CurrentTasksHolder);
        var TaskDiv = CreateTask(index);
        CurrentTasksHolder.insertBefore(TaskDiv, CurrentTasksHolder.childNodes[0]);
        initVars(index);
        return url
    } else {
        ShowErrorMessage(PleaseEnterSupportedUrlTitle, PleaseEnterSupportedUrl, 0, "", "InvalidInput_ViaMainSite");
        if (SendGoogleAnalyticsEvents) { FireAnalyticEvent(Usages, "Bad Input", url) } return null
    }
} function reset(index) {
    initVars(index);
    $("#url").val("")
} window.addEventListener("ParsingFiniedEvent", function (e) {
    if (SendGoogleAnalyticsEvents) {
        FireAnalyticEvent("Download By Domain", e.sourceName, taskDetails[e.index].Format + " " + taskDetails[e.index].Quality);
        if (e.sourceName == "FacebookPrivateOnline") { FireAnalyticEvent("Facebook-Private", "Success", "JS") } else if (taskDetails[e.index].fromContent == true) { FireAnalyticEvent("Facebook-Private", "Success", "POST Source") }
    } var CurrentTask = document.getElementById("Task" + e.index);
    UpdateTaskDetails(CurrentTask, e.Image, e.SongName, SecondsToDurtionFormat(e.Length), e.index);
    if ((taskDetails[e.index].Format == "MP3" || taskDetails[e.index].Format == "M4A" || taskDetails[e.index].Format == "AAC" || taskDetails[e.index].Format == "WAV" || taskDetails[e.index].Format == "MKV" || taskDetails[e.index].Format == "AVI") && e.mp3 == "" && document.getElementById("progress" + e.index) == null || e.sourceName == "Facebook" || e.sourceName == "facebook" || e.sourceName == "Twitter" && !UGSOB_Junction || e.sourceName == "FacebookPrivateOnline" || e.sourceName == "YouTube" && !Re_Junction || e.sourceName == "Vimeo" || e.sourceName == "Periscope") {
        CreateConvertingTaskDetails(e.index);
        if (SendGoogleAnalyticsEvents) { FireAnalyticEvent(Usages, "ParsingFiniedEvent", "progress") }
    } else { if (SendGoogleAnalyticsEvents) { FireAnalyticEvent(Usages, "ParsingFiniedEvent", "NoProgress") } }
}, false);
window.addEventListener("PlaylistRetrievedEvent", function (e) {
    if (iswidget) {
        if (SendGoogleAnalyticsEvents) { FireAnalyticEvent("Playlist Blocked", e.sourceName + " (playlist)", taskDetails[e.index].Format + " " + taskDetails[e.index].Quality) } ShowErrorMessage(PlaylistErrorTitle, PlaylistErrorDesc, e.index, CTAPlaylistLink, "PlaylistWidget");
        return
    } if (SendGoogleAnalyticsEvents) {
        FireAnalyticEvent("Download By Domain", e.sourceName + " (playlist)", taskDetails[e.index].Format + " " + taskDetails[e.index].Quality);
        FireAnalyticEvent(Usages, "Playlist Retrieved", e.playlist.length)
    } PlaylistIndex = PlaylistCounter;
    ++PlaylistCounter;
    var SelectedTasks = 0;
    if (isHappy) { SelectedTasks = e.playlist.length } PlaylistDetails[PlaylistIndex] = { AllDoawnloaded: false, CompletedTasks: 0, ErrorTasks: 0, SelectedTasks: SelectedTasks, Tasks: [], FirstTaskIndex: TaskCounter, LastTaskDownloaded: e.playlist.length };
    if (e.playlist.length > 1) { CreatePlaylistHeader(e, PlaylistIndex) } var FirstPlaylistTaskDiv = null;
    for (var i = e.playlist.length - 1;
        i >= 0;
        i--) {
            AddAd(i, CurrentTasksHolder);
        index = TaskCounter;
        ++TaskCounter;
        PlaylistDetails[PlaylistIndex].Tasks[index - PlaylistDetails[PlaylistIndex].FirstTaskIndex] = isHappy;
        var url = "";
        if (e.playlist[i].id.lastIndexOf("http", 0) === 0) { url = e.playlist[i].id } else { url = "https://www.youtube.com/watch?v=" + e.playlist[i].id } taskDetails[index] = { Format: taskDetails[e.index].Format, Quality: taskDetails[e.index].Quality, URL: url, Progress: -1, StartFunc: null, IsAbleStartDownload: true, PlaylistParent: PlaylistIndex, ParticpentCheckbox: null };
        var PlaylistTaskDiv = CreateTask(index);
        var PlaylistTaskHolder;
        if (isPremiumSupported && (ABCPremium != "D" || isHappy)) {
            PlaylistTaskHolder = document.createElement("div");
            PlaylistTaskHolder.className = "PlaylistTaskHolder center";
            var playlistTaskCheckbox = document.createElement("input");
            playlistTaskCheckbox.type = "checkbox";
            playlistTaskCheckbox.className = "playlistTaskCheckbox";
            playlistTaskCheckbox.checked = isHappy;
            playlistTaskCheckbox.onclick = function (tempIndex, tempPlaylistIndex, tempCheckBox) {
                return function () {
                    if (!PlaylistDetails[tempPlaylistIndex].AllDoawnloaded) {
                        var IsCheckedAllow = true;
                        if (!isHappy && tempCheckBox.checked && PlaylistDetails[tempPlaylistIndex].SelectedTasks + 1 > 3) { IsCheckedAllow = false } if (IsCheckedAllow) {
                            PlaylistDetails[tempPlaylistIndex].Tasks[tempIndex - PlaylistDetails[tempPlaylistIndex].FirstTaskIndex] = tempCheckBox.checked;
                            if (tempCheckBox.checked) { ++PlaylistDetails[tempPlaylistIndex].SelectedTasks } else { --PlaylistDetails[tempPlaylistIndex].SelectedTasks }
                        } else {
                            tempCheckBox.checked = !tempCheckBox.checked;
                            GoPremiumMsg()
                        }
                    }
                }
            }(index, PlaylistIndex, playlistTaskCheckbox);
            taskDetails[index].ParticpentCheckbox = playlistTaskCheckbox;
            PlaylistTaskHolder.appendChild(playlistTaskCheckbox);
            PlaylistTaskHolder.appendChild(PlaylistTaskDiv);
            PlaylistTaskDiv.className = PlaylistTaskDiv.className + " PremiumTask"
        } else { PlaylistTaskHolder = PlaylistTaskDiv } if (FirstPlaylistTaskDiv == null) { FirstPlaylistTaskDiv = PlaylistTaskDiv } CurrentTasksHolder.insertBefore(PlaylistTaskHolder, CurrentTasksHolder.childNodes[0]);
        UpdateTaskDetails(PlaylistTaskDiv, e.playlist[i].img, e.playlist[i].name, e.playlist[i].Duration, index);
        if (e.playlist[i].name == "[Private Video]") { CreateErrorLine(index, PrivateVideoTitle, PrivateVideoExplanation, CTAMainLink, "PrivateInPlaylist", DownloadHereFree) } else { CreatePlaylistInnerTaskDownloadButton(PlaylistTaskDiv, e, i, index) }
    } var CurrentTask = document.getElementById("Task" + e.index);
    CurrentTask.style.display = "none";
    if (e.IsPrivate == true) { createLinkableMessageAfterTask(relatedplaylist, CTAMainLink, "related_playlist_private", FirstPlaylistTaskDiv) } if (e.HasMore == true) { if (e.sourceName == "InstagramUser") { createLinkableMessageAfterTask(instagramMore, CTAInstagramLink, "instagram_more", FirstPlaylistTaskDiv) } else if (e.sourceName == "FacebookPages") { createLinkableMessageAfterTask(instagramMore.replace("120", "60"), CTAInstagramLink, "facebook_page_more", FirstPlaylistTaskDiv) } } if (e.playlist.length == 1) { FirstPlaylistTaskDiv.getElementsByClassName("DownloadButton")[0].click() }
}, false);
function createLinkableMessageAfterTask(message, link, event, FirstPlaylistTaskDiv) {
    if (SendGoogleAnalyticsEvents) { FireAnalyticEvent(Usages, "Playlist Retrieved", event) } relatedDiv = document.createElement("div");
    relatedDiv.className = "center related greenButton TaskButton DownloadButton";
    relatedDiv.innerHTML = message;
    relatedDiv.setAttribute("onclick", 'ExecuteRedirect("' + link + '","' + event + '", true)');
    CurrentTasksHolder.insertBefore(relatedDiv, FirstPlaylistTaskDiv.nextSibling)
} window.addEventListener("PrecntageUpdated", function (e) { moveProgress(e.precentage + "%", e.index) }, false);
window.addEventListener("DownloadFinised", function (e) {
    if (SendGoogleAnalyticsEvents) { FireAnalyticEvent(Usages, "DownloadFinised", taskDetails[e.index].Format + taskDetails[e.index].Quality) } var CurrentTask = document.getElementById("Task" + e.index);
    var Firefox = UserAgent.indexOf("Firefox") > -1;
    var Safari = UserAgent.indexOf("Safari") > -1;
    var Chrome = UserAgent.indexOf("Chrome") > -1;
    var Explorer = !Firefox && !Safari && !Chrome;
    domain = window.location.hostname.replace("www.", "");
    var DirectDownload = e.customData.indexOf(domain) > -1 || e.customData.indexOf("workerserverbl.com") > -1;
    if (isiOS == true) { CreateDownloadSaveAsButton(CurrentTask, e.customData, true) } else {
        if (DirectDownload) {
            if (Firefox || Safari) {
                var NewDownloadProcess = document.createElement("iframe");
                var html = '<body><script>window.location ="' + e.customData + '";</script></body>';
                NewDownloadProcess.src = "data:text/html;charset=utf-8," + encodeURI(html);
                NewDownloadProcess.width = 0;
                NewDownloadProcess.height = 0;
                document.getElementById("hiddenIframes").appendChild(NewDownloadProcess)
            } else { window.open(e.customData, "_self") } CreateSuccessLine(CurrentTask);
            if (taskDetails[e.index].Format == "MP3") { CurrentTask.getElementsByClassName("MP3Cutter")[0].style.display = "block" }
        } else { CreateDownloadSaveAsButton(CurrentTask, e.customData, e.customData.indexOf("itag=22") == -1 && e.customData.indexOf("dl=1") == -1) }
    } if (e.sourceName == "YouKu") { createLinkableMessageAfterTask(youKuMore, CTAMainLink, "YouKu_more", CurrentTask) } HandleTaskFinishInPlaylist(e.index, true)
}, false);
window.addEventListener("ErrorEvent", function (e) {
    url = taskDetails[e.index].URL;
    var tempMsgOrInTask = true;
    var tempTitle = GeneralErrorTitle;
    var temlExplanation = GeneralErrorBody;
    var tempCTA = CTAMainLink;
    var tempErrorType = "";
    var tempCTAText = DownloadHereFree;
    if (e.customData == "TooLong") {
        tempMsgOrInTask = false;
        tempTitle = videoTooLongTitle;
        temlExplanation = videoTooLongExplanation;
        tempCTA = CTATooLong;
        tempErrorType = "TooLong_ViaMainSite";
        tempCTAText = TooLongCallToAction
    } else if (e.customData == "Private Playlist") {
        if (e.sourceName == "InstagramUser") {
            tempTitle = PrivateInstagramUserTitle;
            temlExplanation = PrivateInstagramUserExplanation;
            tempErrorType = "Private-InstagramAccount"
        } else {
            tempTitle = PrivatePlaylistTitle;
            temlExplanation = PrivatePlaylistExplanation;
            tempErrorType = "Private-Playlist_ViaMainSite"
        }
    } else if (e.customData == "Playlist Search Zero Results") {
        tempTitle = ZeroResult;
        temlExplanation = ZeroResult;
        tempErrorType = "Zero-Results_ViaMainSite"
    } else if (e.customData == "Playlist Error") { tempErrorType = "Playlist Error_ViaMainSite" } else if (e.customData == "Cant download direct") { tempErrorType = "Cant download direct" } else if (e.customData == "private") {
        tempTitle = PrivateVideoTitle;
        temlExplanation = PrivateVideoExplanation;
        tempErrorType = "private_ViaMainSite"
    } else if (e.customData == "Country") {
        tempMsgOrInTask = false;
        tempErrorType = "Country_ViaMainSite"
    } else if (e.customData == "Url not recognized") {
        tempTitle = PleaseEnterSupportedUrlTitle;
        temlExplanation = PleaseEnterSupportedUrl;
        tempErrorType = "Url-not-recognized_ViaMainSite"
    } else if (e.customData == "Format not supported") {
        tempTitle = CantDownloadFormatTitle.replace("XXX", e.sourceName);
        temlExplanation = CantDownloadFormatBody.replace("XXX", e.sourceName);
        tempErrorType = "Format-not-supported_ViaMainSite"
    } else { tempErrorType = "Parse-Error_ViaMainSite" } if (tempErrorType == "Parse-Error_ViaMainSite" || tempErrorType == "Url not recognized") { if (url.indexOf("twitter.com/") != -1) { tempErrorType = tempErrorType + " (twitter)" } else if (url.indexOf("video.fc2.com/") != -1) { tempErrorType = tempErrorType + " (fc2)" } else if (vMode) { tempErrorType = tempErrorType + " (vimeo)" } } if (e.customData == "") { e.customData = "Unknown Error" } if (taskDetails[e.index].PlaylistParent > -1) { tempMsgOrInTask = false } if (iswidget || tempMsgOrInTask) {
        ShowErrorMessage(tempTitle, temlExplanation, e.index, tempCTA, tempErrorType)
    } else { CreateErrorLine(e.index, tempTitle, temlExplanation, tempCTA, tempErrorType, tempCTAText) } if (SendGoogleAnalyticsEvents) {
        FireAnalyticEvent("Error", e.customData, taskDetails[e.index].Format + taskDetails[e.index].Quality + ":" + url);
        if (e.customData != "Country" && e.customData != "Private" && e.customData != "TooLong" && e.customData != "Private Playlist" && e.customData != "Playlist Search Zero Results" && e.customData != "Video unavialable") { FireAnalyticEvent("Error By Domain", getDomain(url), e.customData) } FireAnalyticEvent(Usages, "Error", e.customData)
    } reset(e.index);
    HandleTaskFinishInPlaylist(e.index, false)
}, false);
function ShowNewMessage(title, content, t, index) {
    document.getElementById("IframeShowNewMessageOldDesgin").src = reshaForJS + "ShowNewMessageOldDesgin.php?Title=" + encodeURIComponent(title) + "&Desc=" + encodeURIComponent(content);
    $("#IframeHodlerShowNewMessageOldDesgin").fadeIn(150, function () { });
    document.getElementById("Task" + index).style.display = "none"
} function ShowErrorMessage(Error, ErrorExplanation, index, ErrorLink, ErrorType) {
    if (ErrorType == "private_facebook_ViaMainSite") {
        if (SendGoogleAnalyticsEvents) { FireAnalyticEvent("Facebook-Private", "Show message", "") } if (url.indexOf("/posts/") > -1) {
            document.getElementById("IframeErrorMessage").src = reshaForJS + "ErrorMessage.php?ErrorTitle=" + encodeURIComponent(FacebookUrlNotRecognizedTitle) + "&ErrorDesc=" + encodeURIComponent(FacebookUrlNotRecognizedDesc) + "&ErrorLink=" + encodeURIComponent(ErrorLink) + "&ErrorType=" + encodeURIComponent(ErrorType) + "&lang=" + encodeURIComponent(langForJS) + "&mobile=" + isMobileVersion + "&ShowLink=" + !cfg;
            $("#IframeHodlerErrorMessage").fadeIn(150, function () { })
        } else {
            format = taskDetails[index].Format;
            quality = taskDetails[index].Quality;
            OpenFacebookPrivateHandlerMessage(reshaForJS + "FacebookPrivateHandler.php?url=" + encodeURIComponent(url) + "&quality=" + encodeURIComponent(quality) + "&format=" + encodeURIComponent(format) + "&lang=" + langForJS)
        }
    } else if (ErrorType == "Parse-Error_ViaMainSite (twitter)" || ErrorType == "Url not recognized (twitter)") {
        document.getElementById("IframeErrorMessage").src = reshaForJS + "ErrorMessage.php?ErrorTitle=" + encodeURIComponent(PleaseEnterSupportedUrlTitle) + "&ErrorDesc=" + encodeURIComponent(TwitterUrlNotRecognizedDesc + '<div><img  src="' + reshaCDNForJs + 'imgs\\WhereIsTwitterUrlV2.png"></div>') + "&ErrorLink=" + encodeURIComponent(ErrorLink) + "&ErrorType=" + encodeURIComponent(ErrorType) + "&lang=" + encodeURIComponent(langForJS) + "&mobile=" + isMobileVersion + "&ShowLink=" + !cfg;
        $("#IframeHodlerErrorMessage").fadeIn(150, function () { })
    } else if (ErrorType == "Parse-Error_ViaMainSite (vimeo)" || ErrorType == "Url not recognized (vimeo)") {
        document.getElementById("IframeErrorMessage").src = reshaForJS + "ErrorMessage.php?ErrorTitle=" + encodeURIComponent(Error) + "&ErrorDesc=" + encodeURIComponent(BlogVimeoExplanation) + "&ErrorLink=" + encodeURIComponent(ErrorLink) + "&ErrorType=" + encodeURIComponent(ErrorType) + "&lang=" + encodeURIComponent(langForJS) + "&mobile=" + isMobileVersion + "&ShowLink=" + !cfg;
        $("#IframeHodlerErrorMessage").fadeIn(150, function () { })
    } else if (ErrorType == "Parse-Error_ViaMainSite (fc2)" || ErrorType == "Url not recognized (fc2)") {
        document.getElementById("IframeErrorMessage").src = reshaForJS + "ErrorMessage.php?ErrorTitle=" + encodeURIComponent(Error) + "&ErrorDesc=" + encodeURIComponent(FC2Explanation) + "&ErrorLink=" + encodeURIComponent(ErrorLink) + "&ErrorType=" + encodeURIComponent(ErrorType) + "&lang=" + encodeURIComponent(langForJS) + "&mobile=" + isMobileVersion + "&ShowLink=" + !cfg;
        $("#IframeHodlerErrorMessage").fadeIn(150, function () { })
    } else {
        document.getElementById("IframeErrorMessage").src = reshaForJS + "ErrorMessage.php?ErrorTitle=" + encodeURIComponent(Error) + "&ErrorDesc=" + encodeURIComponent(ErrorExplanation) + "&ErrorLink=" + encodeURIComponent(ErrorLink) + "&ErrorType=" + encodeURIComponent(ErrorType) + "&lang=" + encodeURIComponent(langForJS) + "&mobile=" + isMobileVersion + "&ShowLink=" + !cfg;
        $("#IframeHodlerErrorMessage").fadeIn(150, function () { })
    } taskDiv = document.getElementById("Task" + index);
    if (taskDiv != null) { if (iswidget) { taskDiv.style.visibility = "hidden" } else { taskDiv.style.display = "none" } }
} function CreateErrorLine(index, Error, ErrorExplanation, ErrorPage, ErrorType, CalltoActionText) {
    var CurrentTask = document.getElementById("Task" + index);
    var SecondLine = CurrentTask.getElementsByClassName("SecondLineTaskDetails")[0];
    SecondLine.innerHTML = "";
    var TaskError = document.createElement("div");
    TaskError.className = "TaskError TaskMessage";
    SecondLine.appendChild(TaskError);
    var divCheckmark = CreateErrorMark();
    TaskError.appendChild(divCheckmark);
    var TaskErrorText = document.createElement("div");
    TaskErrorText.className = "TaskMessageText TaskMessageTextError";
    var AdditionalText = "";
    if (!isMobileVersion && !cfg) { AdditionalText = " >>" } TaskErrorText.innerHTML = Error + AdditionalText;
    TaskError.appendChild(TaskErrorText);
    var ABErrorType = ErrorType;
    if (ABCPremium == "F" && ErrorType == "TooLong_ViaMainSite") {
        var TaskErrorCalltoAction2 = document.createElement("div");
        TaskErrorCalltoAction2.className = "TaskErrorCalltoAction TaskButton greenButton";
        TaskErrorCalltoAction2.innerHTML = PremiumCallToAction;
        TaskError.appendChild(TaskErrorCalltoAction2);
        TaskErrorCalltoAction2.onclick = function (tempType, tempPage) { return function () { ExecuteRedirect(tempPage, tempType, true) } }(ABErrorType, CTAPremium);
        var OrCTA = document.createElement("span");
        OrCTA.className = "OrCTA";
        OrCTA.innerHTML = orTranslation;
        TaskError.appendChild(OrCTA)
    } var TaskErrorCalltoAction = document.createElement("div");
    TaskErrorCalltoAction.className = "TaskErrorCalltoAction TaskButton greenButton";
    TaskErrorCalltoAction.innerHTML = CalltoActionText;
    if (!cfg) { TaskError.appendChild(TaskErrorCalltoAction) } TaskErrorCalltoAction.onclick = function (tempType, tempPage) { return function () { ExecuteRedirect(tempPage, tempType, true) } }(ABErrorType, ErrorPage);
    var ErrorDetailsBaloon = document.createElement("div");
    ErrorDetailsBaloon.className = "ErrorDetailsBaloon";
    ErrorDetailsBaloon.innerHTML = ErrorExplanation;
    TaskErrorCalltoAction.appendChild(ErrorDetailsBaloon);
    CurrentTask.getElementsByClassName("ShareTask")[0].style.visibility = "hidden";
    CurrentTask.getElementsByClassName("ShareTask")[0].style.display = "none";
    CurrentTask.getElementsByClassName("spinner")[0].style.display = "none";
    CurrentTask.getElementsByClassName("TaskImage")[0].style.display = "block";
    CurrentTask.onmouseover = function (temp) { return function () { temp.style.visibility = "visible" } }(ErrorDetailsBaloon);
    CurrentTask.onmouseout = function (temp) { return function () { temp.style.visibility = "hidden" } }(ErrorDetailsBaloon);
    $(ErrorDetailsBaloon).css("margin-top", -61 - $(ErrorDetailsBaloon).height() + "px")
} function CreateSuccessLine(CurrentTask) {
    var SecondLine = CurrentTask.getElementsByClassName("SecondLineTaskDetails")[0];
    SecondLine.innerHTML = "";
    var TaskSuccess = document.createElement("div");
    TaskSuccess.className = "TaskSuccess TaskMessage";
    SecondLine.appendChild(TaskSuccess);
    var divCheckmark = CreateCheckMark();
    TaskSuccess.appendChild(divCheckmark);
    var TaskSuccessText = document.createElement("div");
    TaskSuccessText.className = "TaskMessageText";
    TaskSuccessText.innerHTML = DownloadSuccessfully;
    TaskSuccess.appendChild(TaskSuccessText);
    $(TaskSuccess).fadeIn(500, function () { })
} function CreateCheckMark() {
    var divCircleOuter = document.createElement("div");
    divCircleOuter.className = "checkmark_circle_outer";
    var divCircle = document.createElement("div");
    divCircle.className = "checkmark_circle SuccessMark";
    var divStem = document.createElement("div");
    divStem.className = "checkmark_stem";
    var divKick = document.createElement("div");
    divKick.className = "checkmark_kick";
    var divCheckmark = document.createElement("span");
    divCheckmark.className = "checkmark";
    divCircleOuter.appendChild(divCircle);
    divCheckmark.appendChild(divCircleOuter);
    divCheckmark.appendChild(divStem);
    divCheckmark.appendChild(divKick);
    return divCheckmark
} function CreateErrorMark() {
    var divCircleOuter = document.createElement("div");
    divCircleOuter.className = "checkmark_circle_outer";
    var divCircle = document.createElement("div");
    divCircle.className = "checkmark_circle ErrorMark";
    var divStem = document.createElement("div");
    divStem.className = "errormark_stem";
    var divKick = document.createElement("div");
    divKick.className = "errormark_kick";
    var divCheckmark = document.createElement("span");
    divCheckmark.className = "checkmark";
    divCircleOuter.appendChild(divCircle);
    divCheckmark.appendChild(divCircleOuter);
    divCheckmark.appendChild(divStem);
    divCheckmark.appendChild(divKick);
    return divCheckmark
} function getDomain(url) {
    temp = url.split("://");
    if (temp.length > 1) { url = temp[1] } url = url.replace("www.", "");
    return url.split("/")[0]
} function htmlEncode(html) { return document.createElement("a").appendChild(document.createTextNode(html)).parentNode.innerHTML } function UpdateTaskDetails(Task, Image, Name, Duration, index) {
    if (Image != "" && Image != null && Image != "null") { Task.getElementsByClassName("TaskImage")[0].src = Image } Task.getElementsByClassName("spinner")[0].style.display = "none";
    Task.getElementsByClassName("TaskImage")[0].style.display = "block";
    Task.getElementsByClassName("duration")[0].innerHTML = "  - " + htmlEncode(CutVideoName(Duration));
    Task.getElementsByClassName("SongName")[0].innerHTML = htmlEncode(CutVideoName(Name));
    var ShareTask = Task.getElementsByClassName("ShareTask")[0];
    if (Sharable) {
        ShareTask.style.display = "block";
        ShareTask.onclick = function (temp, VideoName) {
            return function () {
                document.getElementById("IframeShareMessage").src = reshaForJS + "ShareMessage.php?sharelink=" + encodeURIComponent(SiteName + "?task=" + taskDetails[temp].Format + "&url=" + encodeURIComponent(taskDetails[temp].URL)) + "&ShareFormat=" + taskDetails[temp].Format + "&ShareVideo=" + encodeURIComponent(VideoName) + "&lang=" + encodeURIComponent(langForJS);
                $("#IframeHodlerShareMessage").fadeIn(150, function () { })
            }
        }(index, Name)
    }
} function CreateConvertingTaskDetails(index) {
    var CurrentTask = document.getElementById("Task" + index);
    var ConvertingTaskDetails = CurrentTask.getElementsByClassName("SecondLineTaskDetails")[0];
    ConvertingTaskDetails.innerHTML = "";
    var TaskConvertButton = document.createElement("div");
    TaskConvertButton.className = "TaskButton convertTask";
    TaskConvertButton.innerHTML = Converting + "...";
    ConvertingTaskDetails.appendChild(TaskConvertButton);
    var progressTask = document.createElement("div");
    progressTask.className = "meter MainMeter";
    progressTask.id = "progress" + index;
    var parentDiv = document.createElement("div");
    parentDiv.className = "parent";
    var InnerProgressTask = document.createElement("span");
    InnerProgressTask.id = "inner-progress";
    progressTask.appendChild(InnerProgressTask);
    parentDiv.appendChild(progressTask);
    ConvertingTaskDetails.appendChild(parentDiv)
} function CreatePlaylistHeader(e, PlaylistIndex) {
    var PlaylistHeader = document.createElement("div");
    PlaylistHeader.className = "PlaylistHeader";
    var playlistHeaderContnet = document.createElement("div");
    playlistHeaderContnet.className = "playlistHeaderContnet center";
    PlaylistHeader.appendChild(playlistHeaderContnet);
    if (false && !isMobileVersion) {
        var playlistHeaderimgHolder = document.createElement("div");
        playlistHeaderimgHolder.className = "playlistHeaderimgHolder";
        playlistHeaderContnet.appendChild(playlistHeaderimgHolder);
        var playlistHeaderImg = document.createElement("img");
        playlistHeaderImg.className = "playlistHeaderImg";
        playlistHeaderImg.src = e.header.img;
        playlistHeaderimgHolder.appendChild(playlistHeaderImg)
    } var playlistHeaderDetails = document.createElement("div");
    playlistHeaderDetails.className = "playlistHeaderDetails";
    playlistHeaderContnet.appendChild(playlistHeaderDetails);
    var playlistHeaderTitle = document.createElement("div");
    playlistHeaderTitle.className = "playlistHeaderTitle";
    playlistHeaderTitle.innerHTML = htmlEncode(e.header.name);
    playlistHeaderDetails.appendChild(playlistHeaderTitle);
    var playlistHeaderCounter = document.createElement("div");
    playlistHeaderCounter.className = "playlistHeaderCounter";
    playlistHeaderCounter.innerHTML = htmlEncode(e.playlist.length + " " + videos);
    playlistHeaderDetails.appendChild(playlistHeaderCounter);
    if (isPremiumSupported && (ABCPremium != "D" || isHappy)) {
        var playlistDownloadSelectArea = document.createElement("div");
        playlistDownloadSelectArea.className = "PlaylistDownloadSelectArea";
        playlistDownloadSelectArea.id = "PlaylistDownloadSelectArea" + PlaylistIndex;
        playlistHeaderDetails.appendChild(playlistDownloadSelectArea);
        var playlistSelectAll = document.createElement("div");
        playlistSelectAll.className = "PlaylistSelect";
        var playlistDownloadSelectedButton = document.createElement("div");
        playlistDownloadSelectedButton.className = "playlistDownloadSelectedButton";
        if (isMobileVersion) {
            playlistDownloadSelectArea.appendChild(playlistDownloadSelectedButton);
            playlistDownloadSelectArea.appendChild(playlistSelectAll)
        } else {
            playlistDownloadSelectArea.appendChild(playlistSelectAll);
            playlistDownloadSelectArea.appendChild(playlistDownloadSelectedButton)
        } var playlistDownloadSelectedButtonImage = document.createElement("div");
        playlistDownloadSelectedButtonImage.id = "selectAllImage";
        playlistDownloadSelectedButton.appendChild(playlistDownloadSelectedButtonImage);
        var playlistDownloadSelectedButtonText = document.createElement("div");
        playlistDownloadSelectedButtonText.className = "playlistDownloadSelectedButtonText";
        playlistDownloadSelectedButtonText.innerHTML = DownloadSelectedText;
        playlistDownloadSelectedButton.appendChild(playlistDownloadSelectedButtonText);
        var playlistSelectAllText = document.createElement("div");
        playlistSelectAllText.className = "PlaylistSelectText";
        playlistSelectAllText.innerHTML = SelectAllText;
        playlistSelectAll.appendChild(playlistSelectAllText);
        var playlistSelectAllCheckbox = document.createElement("input");
        playlistSelectAllCheckbox.type = "checkbox";
        playlistSelectAllCheckbox.className = "PlaylistSelectCheckbox";
        playlistSelectAllCheckbox.checked = isHappy;
        playlistSelectAllCheckbox.onclick = function (tempPlaylistIndex, tempCheckBox) {
            return function () {
                if (!isHappy) {
                    playlistSelectAllCheckbox.checked = !playlistSelectAllCheckbox.checked;
                    GoPremiumMsg()
                } else {
                    if (!PlaylistDetails[tempPlaylistIndex].AllDoawnloaded) {
                        for (var i = 0;
                            i < PlaylistDetails[tempPlaylistIndex].Tasks.length;
                            i++) {
                                PlaylistDetails[tempPlaylistIndex].Tasks[i] = tempCheckBox.checked;
                            var CurrTaskCheckbox = taskDetails[i + PlaylistDetails[tempPlaylistIndex].FirstTaskIndex].ParticpentCheckbox;
                            if (CurrTaskCheckbox != null) { CurrTaskCheckbox.checked = tempCheckBox.checked }
                        } if (tempCheckBox.checked) { PlaylistDetails[tempPlaylistIndex].SelectedTasks = PlaylistDetails[tempPlaylistIndex].Tasks.length } else { PlaylistDetails[tempPlaylistIndex].SelectedTasks = 0 }
                    }
                }
            }
        }(PlaylistIndex, playlistSelectAllCheckbox);
        playlistSelectAll.appendChild(playlistSelectAllCheckbox);
        function GetPlaylistSelectedCount(index) {
            var count = 0;
            for (var i = PlaylistDetails[index].LastTaskDownloaded - 1;
                i >= 0;
                i--) { if (PlaylistDetails[index].Tasks[i]) { count++ } } return count
        } playlistDownloadSelectedButton.onclick = function (GameArea, CurrentPlaylistIndex) {
            return function () {
                if (GetPlaylistSelectedCount(CurrentPlaylistIndex) == 0) { return } if (SendGoogleAnalyticsEvents) { FireAnalyticEvent("Premium", "DownloadSelected", "") } PlaylistDetails[CurrentPlaylistIndex].AllDoawnloaded = true;
                GameArea.innerHTML = "";
                var playlistDownloadingButton = document.createElement("div");
                playlistDownloadingButton.id = "playlistDownloadingButton" + CurrentPlaylistIndex;
                playlistDownloadingButton.className = "playlistDownloadingButton";
                playlistDownloadingButton.innerHTML = Converting + "...";
                GameArea.appendChild(playlistDownloadingButton);
                var playlistProgressArea = document.createElement("div");
                playlistProgressArea.className = "playlistProgressArea";
                GameArea.appendChild(playlistProgressArea);
                var playlistProgressText = document.createElement("div");
                playlistProgressText.className = "playlistProgressText";
                playlistProgressText.id = "playlistProgressText" + CurrentPlaylistIndex;
                playlistProgressText.innerHTML = Downloaded + " " + PlaylistDetails[CurrentPlaylistIndex].CompletedTasks + "/" + PlaylistDetails[CurrentPlaylistIndex].SelectedTasks;
                playlistProgressArea.appendChild(playlistProgressText);
                var playlistProgress = document.createElement("div");
                playlistProgress.className = "meter MainMeter";
                playlistProgress.id = "progressPlaylist" + CurrentPlaylistIndex;
                var parentDiv = document.createElement("div");
                parentDiv.className = "playlistProgressParent";
                var InnerProgressTask = document.createElement("span");
                InnerProgressTask.id = "inner-progress";
                playlistProgress.appendChild(InnerProgressTask);
                parentDiv.appendChild(playlistProgress);
                playlistProgressArea.appendChild(parentDiv);
                for (var i = PlaylistDetails[CurrentPlaylistIndex].LastTaskDownloaded - 1;
                    i >= 0;
                    i--) {
                        if (PlaylistDetails[CurrentPlaylistIndex].Tasks[i]) {
                            var CurrentTask = i + PlaylistDetails[CurrentPlaylistIndex].FirstTaskIndex;
                            if (taskDetails[CurrentTask].IsAbleStartDownload) {
                                var CurrentSecondLineTaskDetails = document.getElementById("SecondLineTaskDetails" + CurrentTask);
                                CurrentSecondLineTaskDetails.innerHTML = "";
                                var InQueue = document.createElement("div");
                                InQueue.className = "InQueue";
                                InQueue.innerHTML = InQueueText;
                                CurrentSecondLineTaskDetails.appendChild(InQueue)
                            }
                        }
                } LunchTasksInPlaylist(TaskAtSameTime, CurrentPlaylistIndex, true)
            }
        }(playlistDownloadSelectArea, PlaylistIndex)
    } else {
        var playlistDownloadAllButton = document.createElement("div");
        playlistDownloadAllButton.className = "downloadAppButtonNew greenButton";
        playlistDownloadAllButton.id = "downloadPlaylistSoftwareNew";
        if (!cfg) { playlistHeaderDetails.appendChild(playlistDownloadAllButton) } var playlistDownloadAllButtonText = document.createElement("div");
        playlistDownloadAllButtonText.className = "playlistDownloadAllButtonText";
        playlistDownloadAllButtonText.innerHTML = DownloadAllByOneClick;
        if (e.source == "Rutube") { playlistDownloadAllButtonText.innerHTML = DownloadAllAsSingleFileText } else if (e.source == "Instagram") { PlaylistSource = "instagram" } playlistDownloadAllButton.appendChild(playlistDownloadAllButtonText);
        playlistDownloadAllButton.onclick = function (temp) { return function () { if (SendGoogleAnalyticsEvents) { FireAnalyticEvent(Usages, "Playlist download by one click", temp) } if (temp == "instagram") { ExecuteRedirect(CTAInstagramLink, "AfterConverting-InstagramPlaylist_ViaMainSite", true) } else { ExecuteRedirect(CTAPlaylistLink, "AfterConverting-Playlist_ViaMainSite", true, e.header.name, e.header.img) } } }(PlaylistSource)
    } if (sexptospo) {
        var exportToSpotifyButton = document.createElement("div");
        classname = "downloadAppButtonNew greenButton";
        if (cfg) { classname = classname + " exportToSpotifyButtonExtraForG" } exportToSpotifyButton.className = classname;
        exportToSpotifyButton.id = "exportToSpotifyButton";
        playlistHeaderDetails.appendChild(exportToSpotifyButton);
        var playlistDownloadAllButtonText = document.createElement("div");
        playlistDownloadAllButtonText.className = "playlistDownloadAllButtonText";
        playlistDownloadAllButtonText.innerHTML = "Export to spotify";
        exportToSpotifyButton.appendChild(playlistDownloadAllButtonText);
        exportToSpotifyButton.onclick = function () {
            var link = document.createElement("a");
            link.href = "https://www.tunemymusic.com/?source=" + window.location.hostname;
            link.target = "_blank";
            link.setAttribute("rel", "noreferrer");
            document.body.appendChild(link);
            link.click()
        }
    } TaskResults = document.getElementById("TaskResults");
    TaskResults.insertBefore(PlaylistHeader, TaskResults.childNodes[0])
} var showAlert = true;
function CreateDownloadSaveAsButton(task, link, rightClick) {
    var SecondLine = task.getElementsByClassName("SecondLineTaskDetails")[0];
    SecondLine.innerHTML = "";
    var LinkElement = document.createElement("a");
    LinkElement.href = link;
    if (rightClick) {
        LinkElement.target = "_blank";
        if (platform == "Desktop") {
            LinkElement.onclick = function () {
                if (showAlert) {
                    showAlert = false;
                    alert(RightClickSaveAs);
                    if (SendGoogleAnalyticsEvents) { FireAnalyticEvent(Usages, "RightClickMessage", platform) } return false
                } else { return true }
            }
        } LinkElement.innerHTML = RightClickSaveAs;
        LinkElement.className = "SaveAsLink greenButton DownloadButton TaskButton"
    } else {
        LinkElement.innerHTML = DownloadText;
        LinkElement.className = "TaskButton DownloadButton greenButton"
    } SecondLine.appendChild(LinkElement)
} function CreatePlaylistInnerTaskDownloadButton(PlaylistTaskDiv, e, i, index) {
    var TaskConvertButton = document.createElement("div");
    TaskConvertButton.className = "TaskButton DownloadButton greenButton";
    if (e.playlist[i].Media == "Video") { if (taskDetails[index].Quality == "hd") { TaskConvertButton.innerHTML = DownloadText + " " + taskDetails[index].Format + '<span class="DownloadHDTaskTest"> HD</span>' } else { TaskConvertButton.innerHTML = DownloadText + " " + taskDetails[index].Format } } else { TaskConvertButton.innerHTML = DownloadText + " " + Photo } TaskConvertButton.onclick = function (temp) {
        return function () {
            taskDetails[temp].IsAbleStartDownload = false;
            if (SendGoogleAnalyticsEvents) {
                FireAnalyticEvent(Usages, "Convert clicked", "OnTask-" + taskDetails[temp].Format + taskDetails[temp].Quality);
                FireAnalyticEvent(Usages, "Conversion Started", taskDetails[temp].Format + taskDetails[temp].Quality)
            } StartDownloadProcess(taskDetails[temp].URL, temp, taskDetails[temp].Format, taskDetails[temp].Quality, GetPremiumToken(), null);
            CreateConvertingTaskDetails(temp)
        }
    }(index);
    taskDetails[index].StartFunc = TaskConvertButton.onclick;
    var DownloadTaskDetails = PlaylistTaskDiv.getElementsByClassName("SecondLineTaskDetails")[0];
    DownloadTaskDetails.appendChild(TaskConvertButton)
} function CutVideoName(video) {
    if (video == null || typeof video === "undefined") { return "" } CurrentVideoName = video;
    OriginLength = CurrentVideoName.length;
    CurrentVideoName = CurrentVideoName.substring(0, Math.min(50, OriginLength));
    if (OriginLength > CurrentVideoName.length) { CurrentVideoName = CurrentVideoName + "..." } return CurrentVideoName
} function CreateTasksHolder() {
    TaskResults = document.getElementById("TaskResults");
    if (TaskResults.childNodes[0].className == "PlaylistHeader") {
        CurrentTasksHolder = document.createElement("div");
        CurrentTasksHolder.className = "TasksHolder";
        TaskResults.insertBefore(CurrentTasksHolder, TaskResults.childNodes[0])
    } else if (CurrentTasksHolder == null) { CurrentTasksHolder = TaskResults.childNodes[1] }
} function CreateTask(index) {
    var TaskDiv = document.createElement("div");
    TaskDiv.className = "Task center";
    TaskDiv.id = "Task" + index;
    var TaskImageDiv = document.createElement("div");
    TaskImageDiv.className = "TaskImageHolder";
    TaskDiv.appendChild(TaskImageDiv);
    var TaskSpinnerDiv = document.createElement("div");
    TaskSpinnerDiv.className = "spinner";
    var TaskSpinnerdb1Div = document.createElement("div");
    TaskSpinnerdb1Div.className = "double-bounce1";
    var TaskSpinnerdb2Div = document.createElement("div");
    TaskSpinnerdb2Div.className = "double-bounce2";
    TaskSpinnerDiv.appendChild(TaskSpinnerdb1Div);
    TaskSpinnerDiv.appendChild(TaskSpinnerdb2Div);
    TaskImageDiv.appendChild(TaskSpinnerDiv);
    var TaskImage = document.createElement("img");
    TaskImage.className = "TaskImage";
    TaskImageDiv.appendChild(TaskImage);
    var TaskDetails = document.createElement("div");
    TaskDetails.className = "TaskDetails";
    TaskDiv.appendChild(TaskDetails);
    var SongName = document.createElement("div");
    SongName.className = "SongName";
    TaskDetails.appendChild(SongName);
    var duration = document.createElement("div");
    duration.className = "duration";
    TaskDetails.appendChild(duration);
    var ShareTask = document.createElement("div");
    ShareTask.className = "ShareTask MoreOptionsBtn";
    TaskDetails.appendChild(ShareTask);
    var ShareTaskText = document.createElement("div");
    ShareTaskText.className = "ShareTaskText";
    if (!isMobileVersion) { ShareTaskText.innerHTML = Share } ShareTask.appendChild(ShareTaskText);
    var MP3Cutter = document.createElement("div");
    MP3Cutter.className = "MP3Cutter MoreOptionsBtn";
    MP3Cutter.onclick = function () { ExecuteRedirect(MP3CutterLink, "MP3Cutter_ViaMainSite", true) };
    var MP3CutterText = document.createElement("div");
    MP3CutterText.className = "MP3CutterText";
    MP3Cutter.appendChild(MP3CutterText);
    TaskDetails.appendChild(MP3Cutter);
    var SecondLineDetails = document.createElement("div");
    SecondLineDetails.className = "SecondLineTaskDetails";
    SecondLineDetails.id = "SecondLineTaskDetails" + index;
    TaskDetails.appendChild(SecondLineDetails);
    return TaskDiv
} function moveProgress(value, index) {
    if (taskDetails[index].Progress != value) {
        $(function () { $("#progress" + index + " > span").each(function () { $(this).data("origWidth", value).animate({ width: $(this).data("origWidth") }, 500) }) });
        taskDetails[index].Progress = value
    }
} function SecondsToDurtionFormat(totalSec) {
    if (totalSec == 0) { return "" } else {
        var hours = parseInt(totalSec / 3600) % 24;
        var minutes = parseInt(totalSec / 60) % 60;
        var seconds = totalSec % 60;
        return (hours == 0 ? "" : hours + ":") + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds)
    }
} function setCookie(cname, cvalue, exdays) {
    var d = new Date;
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1e3);
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires + ";path=/"
} function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(";");
    for (var i = 0;
        i < ca.length;
        i++) {
            var c = ca[i];
        while (c.charAt(0) == " ") c = c.substring(1);
        if (c.indexOf(name) != -1) { return c.substring(name.length, c.length) }
    } return 0
} function HandleTaskFinishInPlaylist(TaskIndex, TaskSuccess) {
    var CurrentPlaylistIndex = taskDetails[TaskIndex].PlaylistParent;
    if (CurrentPlaylistIndex > -1 && PlaylistDetails[CurrentPlaylistIndex].AllDoawnloaded && PlaylistDetails[CurrentPlaylistIndex].Tasks[TaskIndex - PlaylistDetails[CurrentPlaylistIndex].FirstTaskIndex]) {
        if (TaskSuccess) {
            ++PlaylistDetails[CurrentPlaylistIndex].CompletedTasks;
            var CurrentplaylistProgressText = document.getElementById("playlistProgressText" + CurrentPlaylistIndex);
            CurrentplaylistProgressText.innerHTML = Downloaded + " " + PlaylistDetails[CurrentPlaylistIndex].CompletedTasks + "/" + PlaylistDetails[CurrentPlaylistIndex].SelectedTasks;
            $(function () { $("#progressPlaylist" + CurrentPlaylistIndex + " > span").each(function () { $(this).data("origWidth", PlaylistDetails[CurrentPlaylistIndex].CompletedTasks / PlaylistDetails[CurrentPlaylistIndex].SelectedTasks * 100 + "%").animate({ width: $(this).data("origWidth") }, 400) }) })
        } else { ++PlaylistDetails[CurrentPlaylistIndex].ErrorTasks } if (PlaylistDetails[CurrentPlaylistIndex].ErrorTasks + PlaylistDetails[CurrentPlaylistIndex].CompletedTasks == PlaylistDetails[CurrentPlaylistIndex].SelectedTasks) {
            var CurrentplaylistProgress = document.getElementById("progressPlaylist" + CurrentPlaylistIndex);
            CurrentplaylistProgress.style.display = "none";
            var CurrentplaylistDownloadingButton = document.getElementById("playlistDownloadingButton" + CurrentPlaylistIndex);
            CurrentplaylistDownloadingButton.style.display = "none";
            var CurrentplaylistDownloadSelectArea = document.getElementById("PlaylistDownloadSelectArea" + CurrentPlaylistIndex);
            var TaskSuccess = document.createElement("div");
            TaskSuccess.className = "PlaylistSuccess";
            var divCheckmark = CreateCheckMark();
            TaskSuccess.appendChild(divCheckmark);
            var TaskSuccessText = document.createElement("div");
            TaskSuccessText.className = "TaskMessageText";
            TaskSuccessText.innerHTML = DownloadSuccessfully;
            TaskSuccess.appendChild(TaskSuccessText);
            CurrentplaylistDownloadSelectArea.insertBefore(TaskSuccess, CurrentplaylistDownloadSelectArea.childNodes[0])
        } else { LunchTasksInPlaylist(1, CurrentPlaylistIndex, false) }
    }
} function LunchTasksInPlaylist(TasksToLunch, CurrentPlaylistIndex, IsFirstLunch) {
    for (var i = PlaylistDetails[CurrentPlaylistIndex].LastTaskDownloaded - 1;
        i >= 0 && TasksToLunch > 0;
        i--) {
            --PlaylistDetails[CurrentPlaylistIndex].LastTaskDownloaded;
        if (PlaylistDetails[CurrentPlaylistIndex].Tasks[i]) {
            var CurrentTask = i + PlaylistDetails[CurrentPlaylistIndex].FirstTaskIndex;
            if (taskDetails[CurrentTask].IsAbleStartDownload) {
                --TasksToLunch;
                if (taskDetails[CurrentTask].StartFunc != null) {
                    var WaitToLunch = 0;
                    if (!IsFirstLunch) { if (taskDetails[CurrentTask].Format == "MP3") { WaitToLunch = MP3WaitBetweenTasks } else { WaitToLunch = MP4WaitBetweenTasks } } setTimeout(taskDetails[CurrentTask].StartFunc, WaitToLunch)
                }
            }
        }
    }
} function GoPremiumMsg() { ShowErrorMessage(TooManyTitleText, TooManyDescText, 0, CTAPlaylistLink, "AfterConverting-Playlist_ViaMainSite" + "(" + ABCPremium + ")") }