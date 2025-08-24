// methods

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function buildICSEvent(
  title,
  buildingName,
  roomNumber,
  days,
  startDate,
  endDate,
  startTime,
  endTime
) {
  const uid = crypto.randomUUID();
  const dayFormat = formatDays(days);
  const location = `Building: ${buildingName} | Room: ${roomNumber}`;

  const [month, day, year] = endDate.split("/");
  const [startMonth, startDay, startYear] = startDate.split("/");

  const startDate = new Date(
    `${startYear}-${startMonth}-${parseInt(startDay) + 1}`
  );
  // used to offset the days from the start date of the class. otherwise, every class will appear on the start date in iCloud maps.
  const indexes = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  };
  const difference = indexes[dayFormat.split(",")[0]] - startDate.getDay();
  startDate.setDate(startDate.getDate() + difference);

  const today = new Date();

  // build .ics manually, since an .ics file is just plain text.
  // I'm using an array here to properly do the spacing, as seen in lines.join("\r\n"). using a template literal otherwise would have resulted in problems, especially
  // in google calendar.
  // .ics date format: YYYYMMDDTHHmmss, which is what formatDate() is converting the time to.
  const lines = [
    `BEGIN:VEVENT`,
    `UID:${uid}`,
    `DTSTAMP:${today.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"}`,
    `SUMMARY:${title}`,
    `DTSTART;TZID=America/New_York:${formatDate(
      `${(startDate.getMonth() + 1).toString().padStart(2, "0")}/${startDate
        .getDate()
        .toString()
        .padStart(2, "0")}/${startDate.getFullYear()}`,
      startTime
    )}`,
    `DTEND;TZID=America/New_York:${formatDate(
      `${(startDate.getMonth() + 1).toString().padStart(2, "0")}/${startDate
        .getDate()
        .toString()
        .padStart(2, "0")}/${startDate.getFullYear()}`,
      endTime
    )}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${dayFormat};UNTIL=${year}${month}${day}T235959Z`,
    `LOCATION:${location}`,
    `END:VEVENT`,
  ];
  return lines.join("\r\n");
}

function buildICSFile(events) {
  // simply creates a calendar with the previously created events in it.
  return `BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nPRODID:-//Sir Jal//Calendar Extension 1.0//EN\nBEGIN:VTIMEZONE\nTZID:America/New_York\nX-LIC-LOCATION:America/New_York\nBEGIN:DAYLIGHT\nTZOFFSETFROM:-0500\nTZOFFSETTO:-0400\nTZNAME:EDT\nDTSTART:19700308T020000\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\nEND:DAYLIGHT\nBEGIN:STANDARD\nTZOFFSETFROM:-0400\nTZOFFSETTO:-0500\nTZNAME:EST\nDTSTART:19701101T020000\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\nEND:STANDARD\nEND:VTIMEZONE\n${events.join(
    "\n"
  )}\nEND:VCALENDAR`
    .split("\n")
    .join("\r\n");
}

// parses all courses
async function fetchSchedule() {
  // this is injected into the webpage, therefore is utilizing the webpage's DOM, not the extension's.

  // regular expressions to match the start and end times and the start and end dates.
  const extractTimeRegex =
    /\d{2}:\d{2}\s{2}(?:AM|PM)\s*-\s*\d{2}:\d{2}\s{2}(?:AM|PM)/;
  const dateRegex = /(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}/g;

  const classes = Array.from(document.querySelectorAll(".listViewWrapper")); // i despise the ElementList type, so im converting it to Array
  const Schedule = [];
  for (const _class of classes) {
    const index = classes.indexOf(_class); // allows us to easily access course info

    // course info
    const courseInfo = document.querySelectorAll(".list-view-course-info-div")[
      index
    ].textContent; // example: 'Differential Calculus | Mathematics 1551 Section L01 | Class Begin: 08/18/2025 | Class End: 12/11/2025'

    const meetingInformation = document.querySelectorAll(
      ".listViewMeetingInformation"
    )[index].textContent; // example: '08/18/2025 -- 12/11/2025   FridaySMTWTFS   03:30  PM - 04:20  PM Type: Class Location: Georgia Tech-Atlanta * Building: Skiles Room: 254'

    const [courseTitle, courseDesc, classBegin, classEnd] =
      courseInfo.split(" | ");

    // day and time
    const day = document.querySelectorAll(".ui-pillbox-summary.screen-reader")[
      index
    ].textContent; // example: "Friday", or "None"

    if (day === "None") continue; // this is usually only the case for online ASYNCHRONOUS classes.

    const time = meetingInformation.match(extractTimeRegex)[0];

    const [startTime, endTime] = time.split(" - ");

    // location
    const buildingStringIndex = meetingInformation.indexOf("Building");
    const buildingAndRoom = meetingInformation.substring(buildingStringIndex);
    const buildingName = buildingAndRoom
      .substring(0, buildingAndRoom.indexOf("Room"))
      .replace("Building: ", "")
      .trim();
    const roomNumber = buildingAndRoom
      .substring(buildingAndRoom.indexOf("Room"))
      .replace("Room: ", "")
      .trim();

    // push to schedule array
    Schedule.push({
      courseTitle,
      day,
      time,
      startDate: classBegin.match(dateRegex).join(),
      endDate: classEnd.match(dateRegex).join(),
      startTime,
      endTime,
      buildingName,
      roomNumber,
    });
    console.log("HERE IS SCHEDULE");
    console.log(Schedule);
  }
  chrome.runtime.sendMessage(Schedule);
}

async function createDownload(content, filename = "schedule.ics") {
  // self explanatory
  const blob = new Blob([content], { type: "text/calendar;charset=utf8" });
  const url = URL.createObjectURL(blob);
  return url;
}
// delay function, utilizing Promises
async function wait(time) {
  return new Promise((res, rej) => {
    setTimeout(res, time);
  });
}
// checks for classes
async function checkForClasses() {
  // utilizes chrome's messaging system

  // if no classes are seen
  if (document.querySelectorAll(".listViewWrapper").length === 0) {
    chrome.runtime.sendMessage("noClass");
  }
  // if the website is technically correct but not in the right section
  if (
    document.querySelector("h1")?.textContent !==
    "View Registration Information"
  ) {
    chrome.runtime.sendMessage("differentSection");
  }
}

// Main Code
const button = document.querySelector("button"); // fetches the convert button, as it comes first and we are not using .querySelectorAll()
const message = document.querySelector(".message");

let schedule; // this is set by fetchSchedule()

getCurrentTab().then((tab) => {
  const currentUrl = new URL(tab.url);
  const hostName = currentUrl.hostname;
  const targetHostName = "registration.banner.gatech.edu";
  if (hostName !== targetHostName) {
    button.toggleAttribute("disabled", true);
    message.classList.add("error", "show");
    // the error message is pre set upon the extension loading up (check HTML), hence no reason to set .textContent to anything
    return;
  }
  // injects function checkForClasses into the webpage
  chrome.scripting.executeScript({
    func: checkForClasses,
    target: { tabId: tab.id },
  });
});

// listeners for chrome's messaging system
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // triggered by function checkForClasses
  if (msg === "noClass") {
    message.textContent = 'Please click on "Schedule Details" to continue';
    message.classList.add("show", "alert");
    button.toggleAttribute("disabled", true);
    return;
  }
  // triggered by function checkForClasses
  if (msg === "differentSection") {
    message.innerHTML = `While the website is correct, this extension works best on the <strong>View Registration Information</strong> page`;
    message.classList.add("show", "alert");
    button.disabled = true;
    return;
  }

  // otherwise, message triggered by function fetchSchedule, which means we are receiving the schedule.
  schedule = msg;
});

// event listener for convert button
button.addEventListener("click", async () => {
  button.textContent = "Converting schedule...";
  button.toggleAttribute("disabled", true);

  const tab = await getCurrentTab();
  console.log(tab.id);

  // injects function fetchSchedule into webpage
  chrome.scripting.executeScript({
    func: fetchSchedule,
    target: { tabId: tab.id },
  });

  await wait(1000 * 2); // waits 2 seconds, gives extension time to parse schedule
  const events = [];

  for (const course of schedule) {
    const {
      courseTitle,
      day,
      time,
      startDate,
      endDate,
      startTime,
      endTime,
      buildingName,
      roomNumber,
    } = course;

    const event = buildICSEvent(
      courseTitle,
      buildingName,
      roomNumber,
      day,
      startDate,
      endDate,
      startTime,
      endTime
    );
    events.push(event);
  }

  const icsText = buildICSFile(events);

  const url = await createDownload(icsText);
  // creates "a" tag that links to the download
  message.innerHTML = `<span> Your download is ready: </span> <span> <a href=${url} download="schedule.ics">Download Schedule</a>.<br>You may now use the file to import your courses to your calendar.</span>`;
  message.classList.add("show", "success");
  button.textContent = "Conversion Completed";
});

// formats date and time to YYYYMMDDTHHmmss format
// assumes dateStr argument follows this format: DD/MM/YYYY
function formatDate(dateStr, timeStr) {
  const [month, day, year] = dateStr.split("/");
  // turn time to 24h time
  const [time, AMPM] = timeStr.split("  ");
  let [hour, minute] = time.split(":");

  if (AMPM === "PM" && hour !== "12") {
    hour = parseInt(hour) + 12; // add 12 to hour to convert to 24 hr time;  6 pm + 12 = 18:00
  }
  return `${year}${month}${day}T${hour}${minute}00`;
}

// formats days to .ics format. Wednesdays -> WE, Fridays -> FR
function formatDays(days) {
  // Thursdays,Fridays

  const split = days.split(",");
  for (let i = 0; i < split.length; i++) {
    const day = split[i];
    const correctFormat = day.substring(0, 2).toUpperCase();
    split[i] = correctFormat;
  }

  return split.join(",");
}
