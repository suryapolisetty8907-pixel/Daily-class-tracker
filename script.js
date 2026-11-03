
const STORAGE_KEY = "dailyClassTracker_v1";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

let records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

const $ = id => document.getElementById(id);

function localDate(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getClasses(date) {
    if (!records[date]) records[date] = [];
    return records[date];
}

function escapeHTML(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
}

const selectedDate = $("selectedDate");
const classList = $("classList");
const dialog = $("classDialog");

selectedDate.value = localDate();

$("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "short"
});

function renderClasses() {
    const date = selectedDate.value;
    const classes = getClasses(date);
    const day = new Date(date + "T12:00:00").getDay();

    $("dayHeading").textContent = new Date(date + "T12:00:00")
        .toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long"
        }) + " — Classes";

    classList.innerHTML = "";

    $("emptyMessage").hidden = classes.length > 0 || day === 0 || day === 6;

    if (day === 0 || day === 6) {
        $("emptyMessage").hidden = false;
        $("emptyMessage").textContent = "No college today. Enjoy your day!";
    } else {
        $("emptyMessage").textContent = "No classes added. Click Add Class.";
    }

    let total = 0, completed = 0;

    classes.forEach((item, i) => {
        const tasks = item.tasks || [];
        total += tasks.length;
        completed += tasks.filter(t => t.done).length;

        const card = document.createElement("article");
        card.className = "class-card";

        card.innerHTML = `
            <div class="class-head">
                <div>
                    <h3>${i+1}. ${escapeHTML(item.subject)}</h3>
                    <div class="meta">${escapeHTML(item.time)} · ${escapeHTML(item.teacher)}</div>
                </div>
                <button class="delete" data-delete="${i}">Delete</button>
            </div>

            <div class="notes-grid">
                <div class="note-box taught">
                    <h4>📚 What Sir Taught</h4>
                    <textarea data-note="taught" data-index="${i}"
                    placeholder="Write what sir taught...">${escapeHTML(item.taught)}</textarea>
                </div>

                <div class="note-box hostel">
                    <h4>🏠 Hostel Work</h4>
                    <textarea data-note="hostel" data-index="${i}"
                    placeholder="Write each task on a new line...">${escapeHTML(item.hostel)}</textarea>

                    <button class="primary save-tasks" data-save="${i}">
                        Save Tasks
                    </button>

                    <div class="task-list">
                        ${tasks.map((t,j) => `
                            <label class="task ${t.done ? "done" : ""}">
                                <input type="checkbox" data-class="${i}"
                                data-task="${j}" ${t.done ? "checked" : ""}>
                                <span>${escapeHTML(t.text)}</span>
                            </label>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;

        classList.appendChild(card);
    });

    $("classCount").textContent = classes.length;
    $("taskCount").textContent = total;
    $("completedCount").textContent = completed;
}

function renderWeek() {
    const chosen = new Date(selectedDate.value + "T12:00:00");
    const monday = new Date(chosen);
    monday.setDate(chosen.getDate() + (chosen.getDay() === 0 ? -6 : 1-chosen.getDay()));

    const container = $("weeklySchedule");
    container.innerHTML = "";

    DAYS.forEach((day, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);

        const date = localDate(d);
        const classes = records[date] || [];

        const card = document.createElement("div");
        card.className = "day-card";

        card.innerHTML = `
            <h3>${day}</h3>
            <p>${date}</p>
            <p class="count">${classes.length} Classes</p>
            ${classes.map(c => `<p>${escapeHTML(c.time)} - ${escapeHTML(c.subject)}</p>`).join("")}
        `;

        card.onclick = () => {
            selectedDate.value = date;
            renderClasses();
            document.querySelector('[data-page="dashboard"]').click();
        };

        container.appendChild(card);
    });
}

classList.addEventListener("input", e => {
    const field = e.target.dataset.note;
    const index = e.target.dataset.index;

    if (!field || index === undefined) return;

    getClasses(selectedDate.value)[Number(index)][field] = e.target.value;
    save();
});

classList.addEventListener("click", e => {
    const saveButton = e.target.closest("[data-save]");

    if (saveButton) {
        const i = Number(saveButton.dataset.save);
        const item = getClasses(selectedDate.value)[i];

        const text = classList.querySelector(
            `[data-note="hostel"][data-index="${i}"]`
        ).value;

        const oldTasks = item.tasks || [];

        item.tasks = text.split("\n").map(s => s.trim()).filter(Boolean)
            .map(text => ({
                text,
                done: oldTasks.find(t => t.text === text)?.done || false
            }));

        save();
        renderClasses();
        return;
    }

    const del = e.target.closest("[data-delete]");

    if (del && confirm("Delete this class?")) {
        getClasses(selectedDate.value).splice(Number(del.dataset.delete), 1);
        save();
        renderClasses();
        renderWeek();
    }
});

classList.addEventListener("change", e => {
    if (!e.target.matches("[data-task]")) return;

    const classes = getClasses(selectedDate.value);
    classes[Number(e.target.dataset.class)]
        .tasks[Number(e.target.dataset.task)].done = e.target.checked;

    save();
    renderClasses();
});

$("addClassBtn").onclick = () => {
    const day = new Date(selectedDate.value + "T12:00:00").getDay();

    if (day === 0 || day === 6) {
        alert("College classes are Monday to Friday.");
        return;
    }

    $("classForm").reset();
    dialog.showModal();
};

$("closeDialog").onclick = () => dialog.close();
$("cancelDialog").onclick = () => dialog.close();

$("classForm").addEventListener("submit", e => {
    e.preventDefault();

    const item = {
        subject: $("subject").value.trim(),
        teacher: $("teacher").value.trim(),
        time: $("classTime").value,
        taught: "",
        hostel: "",
        tasks: []
    };

    if (!item.subject || !item.time) return;

    const classes = getClasses(selectedDate.value);
    classes.push(item);
    classes.sort((a,b) => a.time.localeCompare(b.time));

    save();
    dialog.close();
    renderClasses();
    renderWeek();
});

selectedDate.addEventListener("change", renderClasses);

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".nav-btn").forEach(b =>
            b.classList.toggle("active", b === btn)
        );

        document.querySelectorAll(".page").forEach(p =>
            p.classList.toggle("active", p.id === btn.dataset.page)
        );

        if (btn.dataset.page === "timetable") renderWeek();
    };
});

renderClasses();
renderWeek();
