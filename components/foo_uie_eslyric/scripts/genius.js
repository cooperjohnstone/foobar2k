/*----------------------------------------------
Date: 2016/09/06
Author: zeremy
----------------------------------------------*/


var xmlhttp = new ActiveXObject("Msxml2.ServerXMLHTTP.6.0");

function get_my_name() {
	return "Genius";
}

function get_version() {
	return "0.0.1";
}

function get_author() {
	return "zeremy";
}

function start_search(info, callback) {
	var url = "http://genius.com";

	var title = process_keywords(info.Title);
	var artist = process_keywords(info.Artist);

	var search_url = url + "/" + artist + "-" + title + "-lyrics";

	try {
		xmlhttp.open("GET", search_url, false);
		xmlhttp.send();
	} catch (e) {
		fb.trace(get_my_name() + ": Error getting access to site.");
		return;
	}

	var new_lyric = callback.CreateLyric();

	if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

		var str = xmlhttp.responseText.match(/<lyrics class="lyrics".*[\s\S]+.*?<\/lyrics>/g);

		var lyrics = str[0].replace(/<[^>]*>/g, "").replace(/googletag.+/g, "");

		new_lyric.Title = info.Title;
		new_lyric.Artist = info.Artist;
		new_lyric.Source = get_my_name();
		new_lyric.Location = search_url;
		new_lyric.LyricText = lyrics;
		callback.AddLyric(new_lyric);

	}
	new_lyric.Dispose();
}

function process_keywords(str) {
	var s = str;
	s = s.split(" ").join("-").toLowerCase();
	return s;
}
