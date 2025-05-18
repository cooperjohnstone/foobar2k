/*----------------------------------------------
Date: 2016/09/26
Author: btx258
----------------------------------------------*/

var BD_CFG = {
    // DEBUG: true,
    DL_SVR: "http://music.baidu.com",
    S_SRH: "http://music.baidu.com/search",
    L_SRH: "http://music.baidu.com/search/lrc",
    S_LK_INF: "http://play.baidu.com/data/music/songlink",
    S_INF: "http://play.baidu.com/data/music/songinfo",
    P_MAX: 2,
    L_NUM_LOW: 5,
    L_NUM_MAX: 10,
    HTTP_RETRY: 1,
    SRH_E1: 1,
    SRH_E2: 2
};
var bd_http = {
    handle: null,
    type: null
};
var bd_abort = {
    handle: null,
    isvalid: true
};

function get_my_name() {
    return "BaiduMusic|百度音乐";
}

function get_version() {
    return "0.2.1";
}

function get_author() {
    return "btx258";
}

function start_search(info, callback) {
    bd_abort.handle = callback;
    var cfg = {
        num: 0,
        search: null
    };
    cfg.search = BD_CFG.SRH_E1;
    bd_search(info, callback, cfg);
    if (cfg.num < BD_CFG.L_NUM_LOW) {
        cfg.search = BD_CFG.SRH_E2;
        bd_search(info, callback, cfg);
    }
    bd_http.handle = null;
    bd_http.type = null;
    bd_abort.handle = null;
    bd_abort.isvalid = true;
}

function bd_search(info, callback, cfg){
    // download several pages
    var page = null;
    for (page = 0; page < BD_CFG.P_MAX && cfg.num < BD_CFG.L_NUM_MAX; page++) {
        if (bd_is_aborting()){
            // bd_trace("INFO-bd_search-IsAborting Abort");
            break;
        }
        var i = null, j = null, key = null, obj = null;
        var new_lyric = null, xml_text = null, json_text = null;
        var songlist = null, songinfo = null, linkinfo = null, songids = null;
        // download the search result page (HTML file)
        key = bd_normalize(info.Title) + "+" + bd_normalize(info.Artist);
        if (cfg.search == BD_CFG.SRH_E1) {
            xml_text = bd_download(BD_CFG.L_SRH, "key=" + key + "&start=" + page*10);
        } else if (cfg.search == BD_CFG.SRH_E2) {
            xml_text = bd_download(BD_CFG.S_SRH, "key=" + key + "&start=" + page*20);
        }
        if (xml_text) {
            // get the IDs of songs
            obj = null;
            json_text = xml_text.match(/[^-]\bdata-musicicon\b(?!-)[^>\{]*\{[^>]*\}/g);
            if (json_text) {
                json_text = "[" + json_text.join(",") + "]";
                // &quot; is quotation mark (")
                json_text = json_text.replace(/(&quot;|\')/g, "\"");
                json_text = json_text.replace(/[^-]\bdata-musicicon\b(?!-)[^>\{]*/g, "");
                // bd_trace("INFO-json_text-idlist:\n" + json_text);
                try {
                    obj = bd_json(json_text);
                    for (i = 0; i < obj.length; i++) {
                        songids = (i === 0 ? obj[i].id : songids + "," + obj[i].id);
                    }
                    // bd_trace("INFO-songids: " + songids);
                } catch (e) {
                    // bd_trace("FAILED-queryId-json message: " + e.message);
                    obj = null;
                }
            }
            if (obj) {
                songlist = {};
                songlist.queryId = obj;
                // get the infomation of songs
                for (i = 4; i < 6; i++) {
                    obj = null;
                    if (i == 4) {
                        // download the "songinfo" page (json file) and get the data
                        json_text = bd_download(BD_CFG.S_INF, "songIds=" + songids);
                    } else if (i == 5) {
                        // download the "songlink" page (json file) and get the data
                        json_text = bd_download(BD_CFG.S_LK_INF, "songIds=" + songids);
                    }
                    if (json_text) {
                        // bd_trace("INFO-json loop: " + i + ", json_text:\n" + json_text);
                        try {
                            obj = bd_json(json_text);
                            obj = obj.data.songList;
                        } catch (e) {
                            // bd_trace("FAILED-json loop: " + i + ", message: " + e.message);
                            obj = null;
                        }
                    } else {
                        // bd_trace("FAILED-json-content-null loop: " + i);
                    }
                    if (!obj) {
                        obj = bd_create_array(songlist.queryId.length);
                    } else if (obj.length < songlist.queryId.length) {
                        // bd_trace("FAILED-json-legth loop: " + i + ", difference: " + (obj.length - songlist.queryId.length));
                        for (j = obj.length; j < songlist.queryId.length; j++) {
                            obj.push({});
                        }
                    }
                    if (i == 4) {
                        // download the "songinfo" page (json file) and get the data
                        songinfo = obj;
                    } else if (i == 5) {
                        // download the "songlink" page (json file) and get the data
                        linkinfo = obj;
                    }
                }
                // merge the data and download the lyrics
                new_lyric = fb.CreateLyric();
                for (i = 0, j = 0; i < linkinfo.length; i++) {
                    if (bd_is_aborting()){
                        // bd_trace("INFO-AddLyric-IsAborting Abort");
                        break;
                    }
                    // merge the data
                    if (linkinfo[i].queryId == songinfo[j].queryId) {
                        if (songinfo[j].songName && songinfo[j].songName !== "") {
                            linkinfo[i].songName = songinfo[j].songName;
                        }
                        if (songinfo[j].artistName && songinfo[j].artistName !== "") {
                            linkinfo[i].artistName = songinfo[j].artistName;
                        }
                        if (songinfo[j].albumName && songinfo[j].albumName !== "") {
                            linkinfo[i].albumName = songinfo[j].albumName;
                        }
                    }
                    if (linkinfo[i].queryId == songinfo[j].queryId || !songinfo[j].queryId || songinfo[j].queryId === "") {
                        j++;
                    }
                    // download the lyrics
                    if (linkinfo[i].lrcLink && linkinfo[i].lrcLink !== "") {
                        if (linkinfo[i].lrcLink.search(/^http/i) === 0) {
                            xml_text = bd_download(linkinfo[i].lrcLink, null);
                        } else {
                            xml_text = bd_download(BD_CFG.DL_SVR + linkinfo[i].lrcLink, null);
                        }
                        if (xml_text && xml_text !== "") {
                            new_lyric.Title = bd_capitalize(linkinfo[i].songName);
                            new_lyric.Artist = bd_capitalize(linkinfo[i].artistName);
                            new_lyric.Album = bd_capitalize(linkinfo[i].albumName);
                            new_lyric.Source = get_my_name();
                            new_lyric.LyricText = xml_text;
                            callback.AddLyric(new_lyric);
                            // bd_trace("INFO-addLyric cfg.num: " + cfg.num + ", i: " + i);
                            if (++cfg.num >= BD_CFG.L_NUM_MAX) {
                                // bd_trace("INFO-cfg.num-max");
                                break;
                            }
                        } else {
                            // bd_trace("FAILED-lyric-content-null loop: " + i);
                        }
                    } else {
                        // bd_trace("FAILED-lrcLink-null loop: " + i);
                    }
                }
                new_lyric.Dispose();
            } else {
                // bd_trace("FAILED-queryId-no data");
                break;
            }
        } else {
            // bd_trace("FAILED-search-can't open");
            break;
        }
    }
}

function bd_download(url, param) {
    // bd_trace("INFO-bd_download-url: " + url + ", param: " + param);
    // retry several times at most
    var i = null, xml_text = null;
    for (i = 0; i < BD_CFG.HTTP_RETRY; i++) {
        if (!bd_http.handle) {
            try {
                bd_http.handle = utils.CreateHttpClient();
                bd_http.type = "u_c";
            } catch (e) {
                // bd_trace("ERROR-bd_download-CreateHttpClient message: " + e.message);
                try {
                    bd_http.handle = utils.CreateHttpRequest("GET");
                    bd_http.type = "u_r";
                } catch (err) {
                    // bd_trace("ERROR-bd_download-CreateHttpRequest message: " + err.message);
                    try {
                        bd_http.handle = new ActiveXObject("Microsoft.XMLHTTP");
                        bd_http.type = "ie";
                    } catch (error) {
                        // bd_trace("ERROR-bd_download-ActiveXObject message: " + error.message);
                        bd_http.handle = null;
                        bd_http.type = null;
                        continue;
                    }
                }
            }
            // bd_trace("INFO-bd_download-bd_http.type: " + bd_http.type);
        }
        try {
            if (param) {
                url += "?" + encodeURI(param);
            }
            if (bd_http.type == "u_c") {
                xml_text = bd_http.handle.Request(url, "GET");
                if (bd_http.handle.StatusCode == 200) {
                    return xml_text;
                }
            } else if (bd_http.type == "u_r") {
                xml_text = bd_http.handle.Run(url);
                return xml_text;
            } else if (bd_http.type == "ie") {
                bd_http.handle.open("GET", url, false);
                bd_http.handle.send();
                if (bd_http.handle.readyState == 4 && bd_http.handle.status == 200) {
                    xml_text = bd_http.handle.responseText;
                    return xml_text;
                }
            }
        } catch (e) {
            // bd_trace("ERROR-bd_download-request message: " + e.message);
            continue;
        }
    }
    // bd_trace("FAILED-bd_download");
    return null;
}

function bd_json(str) {
    if (typeof JSON == 'object') {
        return JSON.parse(str);
    } else {
        try {
            // Method 1: eval
            return eval("(" + str + ")");
        } catch (e) {
            // bd_trace("ERROR-bd_json-eval message: " + e.message);
            try {
                // Method 2: new Function
                return (new Function('return ' + str))();
            } catch (err) {
                // bd_trace("ERROR-bd_json-Function message: " + e.message);
                throw new SyntaxError('FAILED-bd_json');
                // Method 3: json2.js
            }
        }
    }
}

function bd_normalize(str) {
    var s = null;
    if (str) {
        s = str;
        // !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
        s = s.replace(/([\u0021-\u002F]|[\u003A-\u0040]|[\u005B-\u0060]|[\u007B-\u007E])+/g, " ");
        // ！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～
        s = s.replace(/([\uFF01-\uFF20]|[\uFF3B-\uFF40]|[\uFF5B-\uFF5E])+/g, " ");
        // ·×‐‑‒–—―‖‗‘’‚‛“”„‟…‧‰、。〇〈〉《》「」『』【】〔〕〖〗〜・
        s = s.replace(/(\u00B7|\u00D7|[\u2010-\u201F]|[\u2026-\u2027]|\u2030|[\u3001-\u3002]|[\u3007-\u3011]|[\u3014-\u3017]|\u301C|\u30FB)+/g, " ");
        s = s.replace(/\s+/g, " ");
    } else {
        s = "";
    }
    return s;
}

function bd_capitalize(str) {
    var s = null;
    if (str) {
        s = str;
        s = s.toLowerCase().replace(/(\b[a-z])/g, function(c) {
            return c.toUpperCase();
        }
        );
    } else {
        s = "";
    }
    return s;
}

function bd_create_array(length) {
    var arr = null, i = null;
    arr = new Array(length);
    for (i = 0; i < arr.length; i++) {
        arr[i] = {};
    }
    return arr;
}

function bd_is_aborting() {
    if (bd_abort.isvalid) {
        try {
            return bd_abort.handle.IsAborting();
        } catch (e) {
            // bd_trace("ERROR-bd_is_aborting message: " + e.message);
            bd_abort.isvalid = false;
        }
    }
    return false;
}

function bd_trace(str) {
    if (BD_CFG.DEBUG) {
        fb.trace("BD_DEBUG> " + str);
    }
}

// function encodeUnicode(str) {
//     var i = null, s = "";
//     for (i = 0; i < str.length; i++) {
//         s += "\\u" + ("0000" + str.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
//     }
//     return s;
// }
//
// function decodeUnicode(str) {
//     return unescape(str.replace(/\\/g, "%"));
// }
//
