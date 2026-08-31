import { Schedule, Course } from "../../../classes/index.js";
import { renderCourse, updateUI } from "../index.js";
import { ExtensionSettingsManager } from "../../../utils/tools/config.js";
import { createExportButton } from "../../../utils/components/exportButton.js";
import { createBulkSettings } from "../../../utils/components/bulkSettings.js";
import { createScheduleSettings } from "../../../utils/components/scheduleSettings.js";
import { Settings } from "../../../utils/tools/setting.js";


/**
 * Renders a schedule
 * @param {Schedule} schedule The schedule to render
 * @returns {HTMLDivElement} the container element
 */
export async function renderSchedule(schedule, excludeAsyncByDefault = true) {
    const extSettings = await ExtensionSettingsManager.getAll();
    const scheduleContainer = document.createElement("div");
    const classesContainer = document.createElement("div");

    classesContainer.classList.toggle("classes", true);
    scheduleContainer.classList.toggle("schedule", true);

    scheduleContainer.id = schedule.id;


    const grouped = schedule.groupCourses(extSettings.courseCategorization);
    const entries = Object.entries(grouped).filter(e => e[1].length > 0);


    // const uncategorizedGroup = document.createElement('div');
    // const h2 = document.createElement('h2');



    // h2.textContent = "Uncategorized";
    // uncategorizedGroup.classList.add("classGroup");
    // if (!entries.every(e => e[1].length <= 1)) uncategorizedGroup.append(h2);

    const specialCategories = ["waitlisted", "no meeting time", "uncategorized"];
    for (const [category, courses] of entries) {
        if (courses.length === 0) continue;
        // if (courses.length === 1) {
        //     uncategorizedGroup.append(renderCourse(schedule, courses[0], excludeAsyncByDefault));
        //     continue;
        // }
        const classGroup = document.createElement('div');
        const label = document.createElement('label');
        const categoryCheckbox = document.createElement("input");
        const groupNameContainer = document.createElement("div");
        const hr = document.createElement('hr');

        categoryCheckbox.type = "checkbox";
        categoryCheckbox.checked = !courses.every(e => !e.getSetting("includecourse"));
        categoryCheckbox.id = `${Settings.convertSettingToId(category)}_${schedule.id}`;
        label.textContent = category;
        label.htmlFor = categoryCheckbox.id;

        groupNameContainer.classList.add("groupNameContainer");
        groupNameContainer.append(label, categoryCheckbox);

        if (entries.length !== 1) classGroup.append(groupNameContainer);
        classGroup.classList.add("classGroup");

        for (const course of courses) {
            const courseElement = renderCourse(schedule, course, excludeAsyncByDefault);
            classGroup.append(courseElement);

        }

        if (specialCategories.includes(category.toLowerCase())) classGroup.classList.add(Settings.convertSettingToId(category));
        classesContainer.append(classGroup);
        // if (category !== entries[entries.length - 1][0]) classesContainer.append(hr);
    }

    // if (Object.keys(grouped).length < 2) {
    //     h2.remove();
    // }
    // const hasUncategorized = uncategorizedGroup.querySelector("details.class");
    // if (hasUncategorized) {
    //     classesContainer.append(uncategorizedGroup);
    // } else {
    //     const hrs = Array.from(classesContainer.querySelectorAll("hr"));
    //     console.log(hrs);
    //     hrs[hrs.length - 1].remove();
    // }


    // for (const course of schedule.getCourses()) {

    //     const classGroups = Array.from(classesContainer.querySelectorAll(".classGroup"));
    //     let targetClassGroup = classGroups.find(
    //         e => e.querySelector("h2")?.textContent?.toLowerCase() === course.getCourseCode().toLowerCase()
    //     );

    //     if (course.hasNoMeetingInfo()) {
    //         targetClassGroup = classGroups.find(
    //             e => e.querySelector("h2")?.textContent?.toLowerCase() === course.getCourseCode().toLowerCase()
    //         )
    //     }

    //     const courseElement = renderCourse(schedule, course, popUpPage);

    //     if (targetClassGroup) {
    //         targetClassGroup.append(courseElement)
    //     } else {
    //         targetClassGroup = document.createElement("div");
    //         const h2 = document.createElement('h2');

    //         targetClassGroup.classList.add("classGroup");
    //         h2.textContent = course.getCourseCode();

    //         targetClassGroup.append(h2, courseElement)

    //     }

    //     classesContainer.append(targetClassGroup);

    // }


    scheduleContainer.append(
        classesContainer,
        await createScheduleSettings(schedule),
        createBulkSettings(schedule, scheduleContainer),
        createExportButton(schedule)
    );
    updateUI(schedule, classesContainer);
    return scheduleContainer;
}