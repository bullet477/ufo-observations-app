let mapData;
let graphData;
let fullData;

let smallestDate = new Date("1900");
let largestDate = new Date("2020");

//D3.js canvases
var textArea;
var barChartArea;
var heatMap;

//D3.js svg elements
var selectedAreaText;

//variables for selection
var selectedRegion;

var oldRatios = [];

let map;
let markerSettings = {
    stroke: false,
    keyboard: false,
    interactive: false,
    color: "#ca2f2f"
};

let timeline;
let timelineWrapper;
let timelineWrapperLeftOffset;
let timelineWrapperWidth;
let timelineLine;
let timelineDate;
let timelineDragThing;
let timelineDragThingWidth;
let yearsRange = 1;

let graph;

let draggingTimeline = false;
let lastOldestObservationId = 0;
let lastNewestObservationId = 0;
let lastSelectedDate;

let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let events = [
    {
        date: "2/24/1942",
        name: "Battle of Los Angeles",
        description: "A rumored attack by Japan and subsequent anti-aircraft artillery barrage over Los Angeles."
    },
    {
        date: "6/14/1947",
        name: "Roswell UFO incident",
        description: "A USAAF balloon crashed at a ranch near Roswell, New Mexico."
    },
    {
        date: "8/13/1953",
        name: "The War of the Worlds",
        description: "Release of the movie The War of the Worlds."
    },
    {
        date: "7/1/1978",
        name: "Space Invaders",
        description: "Release of the arcade game Space Invaders."
    },
    {
        date: "6/11/1982",
        name: "E.T. the Extra-Terrestrial",
        description: "Release of the movie E.T. the Extra-Terrestrial."
    },
    /*{
        date: "6/25/1996",
        name: "Independence Day",
        description: "Release of the movie Independence Day."
    },*/
    {
        date: "3/13/1997",
        name: "Phoenix Lights",
        description: "UFOs observed in the sky over Arizona, Nevada and the Mexican state of Sonora."
    },
    {
        date: "7/11/2006",
        name: "O'Hare International Airport UFO sighting",
        description: "12 United Airlines employees and a few witnesses outside the airport at Chicago O'Hare International Airport reported a UFO sighting"
    },
];

document.addEventListener('DOMContentLoaded', onDocumentReady);

function onDocumentReady() {
    timeline = document.getElementById("js-timeline");
    timelineWrapper = document.getElementById("js-timeline-line-wrapper");
    timelineLine = document.getElementById("js-timeline-line");
    timelineDragThing = document.getElementById("js-timeline-drag-thing");
    timelineDate = document.getElementById("js-timeline-drag-thing-date");

    timelineWrapperLeftOffset = timelineWrapper.getBoundingClientRect().left;
    timelineWrapperWidth = timelineWrapper.getBoundingClientRect().width;
    timelineDragThingWidth = timelineDragThing.getBoundingClientRect().width;

    graph = d3.select("#js-graph-wrapper").append("svg")
        .attr("width",d3.select("#js-graph-wrapper").node().clientWidth)
        .attr("height",d3.select("#js-graph-wrapper").node().clientHeight);

    timelineDragThing.addEventListener("mousedown", onTimelineMouseDown);
    
    window.addEventListener("mouseup", onTimelineMouseUp);
    window.addEventListener("mousemove", onMouseOver);
    window.addEventListener('resize', onViewportResize);
}

function onViewportResize() {
    map.fitBounds([
        [24.66093, -66.0059],
        [49.5508, -127.4414]
    ]);
}

d3.csv("./public/ufo_sighting_data.csv")
    .get(function(error, rows) {
        fullData = rows;

        fullData = prepareBaseData(fullData);
        mapData = prepareMapData(fullData);
        graphData = prepareGraphData(fullData);

        map = L.map('mapid',
            {
                dragging: false,
                zoomControl: false,
                attributionControl: false,
                scrollWheelZoom: false,
                touchZoom: false,
            }
        );

        map.fitBounds([
            [24.66093, -66.0059],
            [48.5508, -127.4414]
        ]);

        L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            maxZoom: 18,
            id: 'bullet47/ck4wzefth2wro1dl7v3lodc3s',
            accessToken: 'pk.eyJ1IjoiYnVsbGV0NDciLCJhIjoiY2szc242YjdsMDg1cjNsbW5sa3dwbTdxdiJ9.cAFGwCLN1_9xIigftaZGPA'
        }).addTo(map);

        markers = L.layerGroup();

        smallestDate = new Date(mapData[0].date);
        largestDate = new Date(mapData[mapData.length - 1].date);
        lastSelectedDate = smallestDate;

        renderTimelineLabels();
        updateMapAndTimeline(0);
        renderGraph();
    }
);

function prepareBaseData(tempData) {
    tempData = tempData.filter(item => !item.country.localeCompare("us") && item.Date_time && new Date(item.Date_time).getFullYear() >= 1940);
    tempData.sort((a, b) => (new Date(a.Date_time) >= new Date(b.Date_time)) ? 1 : -1);

    return tempData;
}

function prepareMapData(tempData) {
    tempData = d3.nest()
        .key(function(d) { return (new Date(d.Date_time).getMonth() + 1) + "/1/" + new Date(d.Date_time).getFullYear(); })
        .key(function(d) { return Math.round(d.latitude/2) * 2; })
        .key(function(d) { return Math.round(d.longitude/2) * 2; })
        .rollup(function(v) { return {"count": v.length, "latitude": d3.mean(v, function(g) {return g.latitude}), "longitude": d3.mean(v, function(g) {return g.longitude})}})
        .entries(tempData);

    let flatData = [];
    for (let i = 0; i < tempData.length; i ++) {
        for (let j = 0; j < tempData[i].values.length; j ++) {
            for (let k = 0; k < tempData[i].values[j].values.length; k ++) {
                flatData.push(
                    {
                        "date": tempData[i].key,
                        "count": tempData[i].values[j].values[k].value.count,
                        "latitude": tempData[i].values[j].values[k].value.latitude,
                        "longitude": tempData[i].values[j].values[k].value.longitude
                    });
            }
        }
    }

    return flatData;
}

function prepareGraphData(tempData) {
    let graphData = [];

    let nestedData = d3.nest()
        .key(function(d) { return (new Date(d.Date_time).getMonth() + 1) + "/1/" + new Date(d.Date_time).getFullYear(); })
        .rollup(function(v) { return v.length})
        .entries(tempData);

    let currentDate = new Date(nestedData[0].key);
    let currentIdx = 0;

    while (currentDate <= largestDate && currentIdx < nestedData.length) {
        if ((currentDate - new Date(nestedData[currentIdx].key)) === 0) {
            graphData.push(nestedData[currentIdx]);
            currentIdx++;
        }
        else {
            graphData.push({ key: (new Date(currentDate).getMonth() + 1) + "/1/" + new Date(currentDate).getFullYear(), value: 0});
        }

        currentDate.setMonth(currentDate.getMonth()+1);
    }

    return graphData;
}

function renderGraph() {
    let maxValue = 0;

    graphData.forEach(function(data) {
        if (data.value > maxValue) maxValue = data.value;
    });

    let barWidth = graph.node().clientWidth / graphData.length;
    let graphHeight = graph.node().clientHeight;

    graphData.forEach(function(data, i) {
        graph.append('rect')
            .attrs({ x: i*barWidth, y: graphHeight - data.value/maxValue * graphHeight, width: barWidth + 1, height: data.value/maxValue * graphHeight, fill: 'red'         });
    });
}

function renderTimelineLabels() {
    let labelYear = smallestDate.getFullYear();
    labelYear = Math.ceil(labelYear / 10) * 10;
    let labelDate = new Date("1/1/" + labelYear);

    while (labelDate <= largestDate) {
        let eventDateFormat = (labelDate.getMonth() + 1) + "/" + labelDate.getDate() + "/" + labelDate.getFullYear();

        timelineLine.innerHTML += "<div class='timeline-year js-timeline-date' data-date='" + eventDateFormat + "' style='left:" + getTimelinePositionFromDate(labelDate) + "px'><span class='event-date'>" + labelDate.getFullYear() + "</span></div>";
        timelineLine.innerHTML += "<div class='timeline-year-line' style='left: " + getTimelinePositionFromDate(labelDate) + "px'></div>";

        labelDate.setFullYear(labelDate.getFullYear() + 10);
    }

    for (let i = 0; i < events.length; i ++) {
        let eventDate = new Date(events[i].date);
        let eventDateFormat = (eventDate.getMonth() + 1) + "/" + eventDate.getDate() + "/" + eventDate.getFullYear();
        let eventDateHumanFormat = eventDate.getDate() + "." + (eventDate.getMonth() + 1) + "." + eventDate.getFullYear();
        timelineLine.innerHTML += "<div class='timeline-event-line' style='left: " + getTimelinePositionFromDate(eventDate) + "px'></div>";
        timelineLine.innerHTML += "<div class='timeline-event js-timeline-date js-timeline-event' data-date='" + eventDateFormat + "' style='left:" + getTimelinePositionFromDate(eventDate) + "px'><span class='event-name js-event-info'>" + events[i].name + "</span><span class='event-date js-event-info'>" + eventDateHumanFormat + "</span><span class='event-desc js-event-more-info'>" + events[i].description + "</span></div>";
    }

    for (let e of document.getElementsByClassName("js-timeline-date")) {
        e.addEventListener("click", onTimelineDateClicked);
    }
}

function onTimelineDateClicked(e) {
    let date = e.target.closest(".js-timeline-date").dataset.date;
    setTimelineDate(new Date(date));
}

function onTimelineMouseDown(e) {
    e.preventDefault();
    draggingTimeline = true;
}

function onTimelineMouseUp() {
    draggingTimeline = false;
}

function onMouseOver(e) {
    if (draggingTimeline) updateMapAndTimeline(getTimelinePositionFromMouse(e.clientX));
}

function setTimelineDate(date) {
    updateMapAndTimeline(getTimelinePositionFromDate(date));
}

function getTimelinePositionFromMouse(mousePositionX) {
    let timelinePosition = mousePositionX - timelineWrapperLeftOffset;

    if (timelinePosition < 0) timelinePosition = 0;
    else if (timelinePosition > timelineWrapperWidth) timelinePosition = timelineWrapperWidth;

    return timelinePosition;
}

function getTimelinePositionFromDate(date) {
    let ratio = (date.getTime() - smallestDate.getTime()) / (largestDate.getTime() - smallestDate.getTime());

    if (ratio > 1) return timelineWrapperWidth;
    if (ratio < 0) return 0;

    return ratio * timelineWrapperWidth;
}

const clampNumber = (num, a, b) => Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));

function updateMapAndTimeline(timelinePosition) {
    let smallestDateMs = smallestDate.getTime();
    let largestDateMs = largestDate.getTime();
    let currentDateMs = smallestDateMs + (timelinePosition/timelineWrapperWidth)*(largestDateMs-smallestDateMs);
    let currentDate = new Date(currentDateMs);

    let timelineDates = document.getElementsByClassName("js-timeline-event");

    for (let i = 0; i < timelineDates.length; i ++) {
        timelineDates.item(i).style.transform = "translateX(-50%) scale(" + clampNumber(Math.pow(1 - Math.abs(timelinePosition - (timelineDates.item(i).getBoundingClientRect().left - timelineWrapperLeftOffset)) / timelineWrapperWidth, 2), 0.5, 1) + ")";
    }

    timelineDragThing.style.left = timelinePosition + "px";
    timelineDate.innerHTML = months[currentDate.getMonth()] + " " + currentDate.getFullYear();
    updateMap(currentDate);
}

// we're rendering observations which occurred in interval (earliest date, selected date on the timeline)
// lenght of the interval is in years - number of the years is specified in yearsRange variable
function updateMap(selectedDate) {
    let selectedDateInMs = selectedDate.getTime();

    // calculate earliest date from the interval
    let earliestDate = new Date(selectedDateInMs);
    earliestDate.setFullYear(selectedDate.getFullYear() - yearsRange);
    let earliestDateInMs = earliestDate.getTime();

    let dateIntervalDifference = selectedDateInMs - earliestDateInMs;

    markers.clearLayers();

    // now to check which observations will be rendered we would have to iterate through approx. 60 000 data items
    // solution - skip the data items, which don't belong in the interval

    // first determine if we are moving forwards or backwards in time

    // check whether currently selected date is newer date
    if (lastSelectedDate.getTime() <= selectedDateInMs) {
        // skip the data which are older than the lower bound of the interval
        let length = mapData.length;
        for (let i = lastOldestObservationId; i < length; i ++) {
            let observationDateInMs = new Date(mapData[i].date).getTime();

            // skip observations which occurred after the selected date
            // and remember the upper interval boundary so we can skip it in case we're going back in time
            if (observationDateInMs > selectedDateInMs) {
                lastNewestObservationId = i;
                break;
            }

            if (observationDateInMs >= earliestDateInMs) {
                renderMarker(mapData[i], calculateMarkerOpacity(earliestDateInMs, observationDateInMs, dateIntervalDifference));
            }
            else lastOldestObservationId = i;
        }
    }
    else {
        // identical logic as in the previous branch, only reversed
        for (let i = lastNewestObservationId; i >= 0; i --) {
            let observationDateInMs = new Date(mapData[i].date).getTime();

            if (observationDateInMs < earliestDateInMs) {
                lastOldestObservationId = i;
                break;
            }

            if (observationDateInMs <= selectedDateInMs) {
                renderMarker(mapData[i], calculateMarkerOpacity(earliestDateInMs, observationDateInMs, dateIntervalDifference));
            }
            else lastNewestObservationId = i;
        }
    }

    lastSelectedDate = selectedDate;

    map.addLayer(markers);
}

function renderMarker(observation, opacity) {
    markerSettings.radius = 5*Math.sqrt(observation.count);
    markerSettings.fillOpacity = opacity;
    let marker = L.circleMarker([observation.latitude, observation.longitude], markerSettings);

    markers.addLayer(marker);
}

function calculateMarkerOpacity(earliestDateInMs, observationDateInMs, dateIntervalDifference) {
    return (observationDateInMs - earliestDateInMs) / dateIntervalDifference
}