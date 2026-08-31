import { Schedule, Course } from "../../../classes/index.js";
import { updateSessionStorage } from "../../../utils/tools/storage.js";
import { wait } from "../../../utils/tools/timeRelatedUtils.js";
import { Settings } from "../../../utils/tools/setting.js";
import { ExtensionSettingsManager } from "../../../utils/tools/config.js";

/**
 * Renders a course
 * @param {Schedule} schedule
 * @param {Course} course the course to render
 * @returns {Element} the rendered html "details" element
 */
export function renderCourse(schedule, course, excludeAsyncByDefault = true) {

    let defaultPerCourseSettings;

    ExtensionSettingsManager.getAll().then(e => {
        defaultPerCourseSettings = e.perCourseSettings;
    })
    const popUpPage = window.location.pathname.includes("pages/popup");
    const keysToEditName = ["e", "f2"];
    let editingName = false;
    const {
        courseTitle,
        displayName,
        courseCode,
        days,
        time,
        startDate,
        endDate,
        startTime,
        endTime,
        buildingName,
        roomNumber,
        section,
        prof,
        waitlisted,
        noMeetingInfo,
        id
    } = course.toJSON();

    const isImport = window.location.pathname.includes("webpages/import");

    const clas = document.createElement("details");
    const summary = document.createElement("summary");
    const displayNameSpan = document.createElement("span");
    const courseCodeSpan = document.createElement("span");
    const checkbox = document.createElement("input");
    const options = document.createElement("div");
    const courseDetails = document.createElement("div");
    const br = document.createElement("br");
    const existingClasses = Array.from(document.querySelectorAll(".class"));
    const index = schedule.findCourseIndex(course.id);

    clas.id = course.id;


    const renameClass = (e, isKeyBoard = false) => {

        if (e.target.tagName !== "SPAN" && !isKeyBoard) return;
        if (editingName) return;

        const displayNameSpan = summary.querySelector('span.displayName');
        const courseCodeSpan = summary.querySelector("span.courseCode");
        const checkbox = summary.querySelector('input[type="checkbox"]')
        const summaryContentContainer = summary.querySelector(".summaryContent");

        const textInput = document.createElement('input');
        if (!checkbox.checked || checkbox.disabled) return;

        summary.classList.toggle("nameEdit", true);

        // actionHistory.push(`User double clicks Class #${index + 1} to rename it`);
        clas.open = true;





        textInput.type = "text";
        textInput.value = displayNameSpan.textContent;

        summaryContentContainer.replaceChildren(courseCodeSpan, textInput);
        textInput.focus();
        textInput.select();


        editingName = true;

        const handleSpaceBar = (e) => {
            if (e.key === " ") e.preventDefault();
        }


        const finalizeText = async (reset = false) => {
            const oldName = displayNameSpan.textContent.slice();
            let trimmed = textInput.value.trim().replace(/[\\,;`\r\n\x00-\x1F]/g, "").split(" ").filter(e => e !== "").join(" ");
            if (
                reset ||
                /^\s*$/.test(textInput.value) ||
                trimmed.toLowerCase() === courseTitle.toLowerCase() ||
                !trimmed
            ) {
                // actionHistory.push(`User renames Class #${index + 1} from ${displayNameSpan.textContent} to \`${trimmed}\``);
                trimmed = courseTitle;
            }

            displayNameSpan.textContent = trimmed;

            const event = new CustomEvent("course-change", {
                detail: {
                    course,
                    changedProperty: "displayName",
                    oldValue: oldName,
                    newValue: trimmed

                },
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);

            course.setDisplayName(trimmed);

            summaryContentContainer.replaceChildren(courseCodeSpan, displayNameSpan);
            summary.classList.toggle("nameEdit", false);

            editingName = false;

        }



        summary.addEventListener('keyup', handleSpaceBar);

        textInput.addEventListener('blur', () => {
            finalizeText();
        })
        textInput.addEventListener('keydown', async (e) => {
            if (!editingName) return;

            switch (e.key.toLowerCase()) {
                case "enter": {
                    textInput.blur();
                    e.preventDefault();
                    break;
                }
            }

        })
    }

    summary.addEventListener('dblclick', renameClass)

    summary.addEventListener('keydown', async (e) => {
        if (keysToEditName.includes(e.key.toLowerCase())) {
            if (editingName) return;
            await wait(100);
            renameClass(e, true);
        }
    });


    if (noMeetingInfo) clas.classList.add('notIncluded');


    // configure checkbox
    checkbox.type = "checkbox";

    if (noMeetingInfo) {
        checkbox.checked = excludeAsyncByDefault ? false : course.getSetting("includecourse");
    } else {
        checkbox.checked = course.getSetting("includecourse");
    }
    checkbox.setAttribute("data-setting", "includecourse");
    checkbox.id = "includecourse" + "_" + course.id;
    checkbox.classList.add("courseCheckbox");

    // add course code + name
    const courseStr = displayName;

    const summaryContent = document.createElement("div");
    summaryContent.classList.add("summaryContent");

    displayNameSpan.classList.add("displayName");
    courseCodeSpan.classList.add("courseCode");
    displayNameSpan.textContent = courseStr;
    courseCodeSpan.textContent = `${courseCode}: `

    summaryContent.append(courseCodeSpan, displayNameSpan);

    summary.append(summaryContent, checkbox);

    course.setSetting("includecourse", checkbox.checked);

    clas.classList.add("class");
    options.classList.add("courseOptions");
    courseDetails.classList.add("classDetails");





    const hasLocation = !course.isOnline();


    const infoObj = {
        noMeetingInfo,
        waitlisted,
        "Course Code": courseCode,
        "Section": section.toUpperCase(),
        "Professors": prof.join(", "),
        "Class Active": `${startDate} - ${endDate}`,
        "Days": days.replaceAll(",", ", "),
        "Time": `${startTime} - ${endTime}`,
        "Location": hasLocation ? `${buildingName} ${roomNumber}` : "No location found; likely online",

    }

    // adds the class deatils
    for (const [key, value] of Object.entries(infoObj)) {
        const div = document.createElement('div');
        const valueSpan = document.createElement('span');
        const keySpan = document.createElement('span');
        const b = document.createElement('b');

        div.classList.add("classDetail");

        if (!value) continue;

        if (key === "waitlisted") {
            div.append("This class is WAITLISTED. If included, this will be indicated by the prefix: [WL].");
            courseDetails.append(div);
            continue;
        } else if (key === "noMeetingInfo") {

            const list = document.createElement('ul');

            const li = document.createElement('li');
            const li2 = document.createElement('li');
            const li3 = document.createElement('li');
            const li4 = document.createElement('li');

            li.textContent = "asynchronous";
            li2.textContent = "unfinalized (aka TBA)";
            li3.textContent = "research-based";
            li4.textContent = "or something else."

            list.append(li, li2, li3, li4);
            div.append(
                `The meeting information for this class could not be found. This course is likely:`,
                list,
                `If you include this course in your .ics file, the extension will create only ONE (1) all-day event on ${startDate}.`,

            );
            courseDetails.append(div);
            continue;
        } else if (key === "Course Code") {
        }



        b.textContent = key + "";
        keySpan.append(b);
        keySpan.classList.add('classDetailKey');

        valueSpan.textContent = value;
        valueSpan.classList.add('classDetailValue');

        div.append(keySpan, " ", valueSpan);
        courseDetails.append(div);
        if (key === "Class Active" && noMeetingInfo) break;
    }

    // load in per-class options
    for (const option of Settings.CourseSettings.slice(1)) {
        const id = Settings.convertSettingToId(option);

        const optionElement = document.createElement("div");
        optionElement.classList.add("courseOption");

        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.name = id + "_" + course.id;
        checkbox.id = id + "_" + course.id;
        checkbox.setAttribute("data-setting", id);
        checkbox.checked = course.getSetting(id);
        if (
            ((option.includes("location") && (!hasLocation || noMeetingInfo))) ||
            ((option.includes("professor") && prof[0] === "No professor found")) ||
            (option.includes('code') && !courseCode)
        ) {
            checkbox.checked = false;
            checkbox.disabled = true;
            checkbox.classList.add("disabled");
            course.setSetting(id, checkbox.checked);
        }
        label.setAttribute("for", checkbox.id);
        label.textContent = option;

        optionElement.append(checkbox, label);
        options.append(optionElement);


    }


    clas.append(summary, br, courseDetails, options);
    // if (noMeetingInfo) {
    //     course.setSetting("includecourse", false);
    // }

    return clas;
}