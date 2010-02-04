/*
 * Web Task Timer Firefox Jetpack Plug-in  
 *
 * developed by Emre Sevinc
 *
 *
 * License: GNU GPL v3 
 * See http://www.gnu.org/licenses/gpl.html
 *
 */


var manifest = {
    // firstRunPage: '',

    settings: [
	{
	    name: "twitter",
	    type: "group",
	    label: "Twitter",
	    settings: [
		{ name: "username", type: "text", label: "Username" },
		{ name: "password", type: "password", label: "Password" }
	    ]
	}	
    ]
};



/**
 *
 * Icon used for notifications
 *
 */
const myIcon ="http://farm3.static.flickr.com/2773/4329205375_e40c399a4f_s.jpg";


jetpack.future.import("storage.settings");
jetpack.future.import("menu");
jetpack.future.import('clipboard');
jetpack.future.import('slideBar');

/**
 *
 * Initialize the JetPack storage system and bind myStorage to it.
 *
 */

jetpack.future.import("storage.simple"); 
var myStorage = jetpack.storage.simple; 

var cb; // used for slide later, be careful about this

var initialContent = '<style type="text/css"> \
div#content {background-color: white; height: 400px; padding-left: 3px; overflow: auto;} \
div#stats {background-color: white; height: 550px; padding-left: 3px; overflow: auto;-moz-border-radius: 20px} \
div#summaryTitle {background-color: #ECA30F; padding-left: 3px;-moz-border-radius: 20px} \
h4 {font-family: Arial} \
p.score {font-family: Verdana; font-size: 12px;} \
</style> \
<div id="summaryTitle"><h4>Web Task Timer - Top 5</h4></div> \
<div id="stats"></div> \
<div id="summaryTitle"><h4>Web Task Timer Details</h4></div> \
<div id="content"></div> ';

jetpack.slideBar.append({
    width: 350,
    icon: 'http://farm3.static.flickr.com/2773/4329205375_e40c399a4f_s.jpg',
    html: initialContent,
    persist: true,
    onReady: function(slide) {
	cb = slide;
    },
    onSelect: function(slide) {
	displayTimeDetails($(slide.contentDocument).find("#content"));
	displayTimeStatistics($(slide.contentDocument).find("#stats"), 5);
    }
});

function displayTimeDetails(detailsDiv) {
    let toShow = '';
    let timeDetails = jetpack.storage.simple.timeDetails;

    if (!timeDetails) {
	detailsDiv.attr('innerHTML', 'No time details  yet!');
    } 
    else {

	// ORDER BY duration DESC
	timeDetails = timeDetails.sort(function (a, b) {return b.duration - a.duration;});

	for (let i = 0; i < timeDetails.length; i++) {
	    toShow += "<p class=\"score\">Page title: <a href=\"" ;
	    toShow += timeDetails[i].site + "\" target=\"_new\">" +  timeDetails[i].site + "</a><br/>";
	    toShow += "You spent " + formatTime(timeDetails[i].duration);
	    toShow += "<hr/>";
	}		
	
	detailsDiv.attr('innerHTML', toShow);
    }

}


function displayTimeStatistics(statsDiv, topN) {
    let toShow = '';
    let timeDetails = jetpack.storage.simple.timeDetails;
    let topNumItems = 0;
    let chartSites = [];
    let chartNumbers = [];
    let chartUrl = "http://chart.apis.google.com/chart?chbh=a&cht=bhg&chs=300x200&chd=t:";

    if (topN > timeDetails.length) {
	topNumItems = timeDetails.length;
    }
    else {
	topNumItems = topN;
    }

    if (!timeDetails) {
	statsDiv.attr('innerHTML', 'No time details  yet!');
    } 
    else {

	// ORDER BY duration DESC
	timeDetails = timeDetails.sort(function (a, b) {return b.duration - a.duration;});
	
	for (let i = 0; i < topNumItems; i++) {
	    toShow += "<p class=\"score\">Page title: <a href=\"" ;
	    toShow += timeDetails[i].site + "\" target=\"_new\">" +  timeDetails[i].site + "</a><br/>";
	    toShow += "You spent " + formatTime(timeDetails[i].duration);
	    toShow += "<hr/>";

	    chartSites[i] = timeDetails[i].site;
	    chartSites[i] = chartSites[i].split('://')[1];
	    chartNumbers[i] = timeDetails[i].duration;
	}

	chartUrl += chartNumbers.join(',');
	chartUrl += "&chxt=x,y&chxl=1:|";
	chartUrl += chartSites.reverse().join('|');
	chartUrl += "&chxr=0,0," + (10 + chartNumbers[0]);
	chartUrl += "&chds=0,"   + (10 + chartNumbers[0]);
	chartUrl += "&chco=4D89F9";

	// jetpack.tabs.open(chartUrl);

	toShow += '<p><img src="' + chartUrl + '"></p>';

	statsDiv.attr('innerHTML', toShow);
    }

}

// http://chart.apis.google.com/chart?cht=bhg&chs=550x230&chd=t:
// 3600,600,300,60
// &chxt=x,y&chxl=1:
// |blogs.sun.com|friendfeed.com|mail.google.com|code.google.com
// &chxr=0,0,3610
// &chds=0,3610
// &chco=4D89F9
// &chbh=35,0,15
// &chg=8.33,0,5,5

var timer = [];

var previousUrl = "";
var previousTimePassed = ""; // NaN
var currentUrl = "";

function calculateTime() {
    currentUrl = jetpack.tabs.focused.contentWindow.location.href;
    currentUrl = getDomainOfUrl(currentUrl);
    if (previousUrl !== currentUrl) {
	// I landed on a new page
	// so I should record how much time was spent on previous page
	
	let now = Date.now();
	let timePassed = 0; 
	
	if (!isNaN(previousTimePassed)) {
	    timePassed = now - previousTimePassed;
	}
	
	timePassed = timePassed / 1000;
	timePassed = Math.floor(timePassed);
	
	/*
	 * if previousUrl is different from  about;, chrome:, and "" etc.
	 * store the time spent
	 */
	if (previousUrl !== "nonstandard" && previousUrl !== "") {
	    
	    if (timer.hasOwnProperty(previousUrl)) {
		timer[previousUrl] += timePassed;
	    }
	    else {
		timer[previousUrl] = timePassed;
	    }
	    
	    jetpack.notifications.show(formatTime(timer[previousUrl]) + "  passed for " + previousUrl);
	    
	    let timeDetail = {
		'site'     : previousUrl,
		'duration' : timer[previousUrl]
	    };
	    
	    let timeDetails = myStorage.timeDetails;
	    
	    if (!timeDetails) { // if no timeDetails are stored yet
		myStorage.timeDetails = [timeDetail];
	    } 
	    else {
		updateTimeDetails(timeDetail, timeDetails);
	    }
	    
	    jetpack.storage.simple.sync();
	}
	
	// set the current time and URL 
	previousTimePassed = Date.now();
	previousUrl = currentUrl;
    }
}



jetpack.tabs.onReady(calculateTime);

jetpack.tabs.onFocus(calculateTime);


function updateTimeDetails(timeDetail, timeDetails) {
    var i = 0;

    for (i = 0; i < timeDetails.length; i++) {	
	if (timeDetails[i].site === timeDetail.site) {
	    timeDetails[i] = timeDetail;
	    // myStorage.timeDetails = timeDetails;
	    return true;
	}
    }

    timeDetails[timeDetails.length] = timeDetail;
    return true;
}

function formatTime(numSeconds) {    
    var seconds = numSeconds;
    
    var result = "";

    var hours = Math.floor(seconds / (60 * 60));

    seconds = seconds - (hours * (60 * 60));

    var minutes = Math.floor(seconds / 60);
    seconds = seconds - (minutes * 60);

    if (hours >= 1) {
	result = hours + ' hours ' + minutes + ' minutes ' + seconds + ' seconds ';
	return result;
    }

    if (minutes >= 1) {
	result = minutes + ' minutes ' + seconds + ' seconds ';
	return result;
    }

    result = seconds + ' seconds';
    return result;
}


function getDomainOfUrl(url) {
    let result = "";
    let regex = /https?:\/\/.*?\//;
    let match = regex.exec(url);
    if (match) {
	result = match[0].substring(0, match[0].length - 1);	
    }
    else {
	return result = "nonstandard"; // such as about:, chrome:, file:,
    }

    return result;
}


/**
 *
 * Deletes the timer details storage permanently
 *
 */
function deleteTimeDetails() {
    let timeDetails = myStorage.timeDetails;
    timeDetails = null;
    myStorage.timeDetails = timeDetails;
    myStorage.sync();
}

/**
 *
 * The context menu definition
 *
 */
var webTaskTimerMenu =  new jetpack.Menu([    
    {
	label: "Delete web task timer storace",
	command: function () {
	    let currentWindow = jetpack.tabs.focused.contentWindow;
	    let confirmed = false;
	    confirmed =  currentWindow.confirm('Are you sure to delete timer statistics?');
	    if (confirmed) {
		jetpack.notifications.show("Time details are deleted!");
		deleteTimeDetails();
	    }
	    else {
		return false;
	    }
	    return true;
	}
    }
]);

jetpack.menu.context.page.add({
    label: "Web Task Timer",
    icon: "http://farm3.static.flickr.com/2773/4329205375_e40c399a4f_s.jpg",
    menu: webTaskTimerMenu
});
