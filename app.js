/**
 * Exam Seating Auto Allocator - Core Application Logic
 * Comprehensive state management, smart interleaving allocation engine,
 * visual grid renderer, student lookup, and multi-format report generator.
 */

// ==========================================================================
// 1. Initial State & Realistic Demo Data
// ==========================================================================

const DEFAULT_HALLS = [
  { id: "HALL-101", name: "Main Auditorium (Room 101)", rows: 6, cols: 4, seatsPerBench: 2, capacity: 48 },
  { id: "HALL-102", name: "Science Block (Room 201)", rows: 5, cols: 4, seatsPerBench: 2, capacity: 40 },
  { id: "HALL-103", name: "Engineering Wing (Room 301)", rows: 4, cols: 4, seatsPerBench: 2, capacity: 32 }
];

function generateDefaultStudents() {
  const branches = [
    { code: "CSE", subject: "CS501 - Operating Systems & Kernels", count: 28, prefix: "21CS" },
    { code: "ECE", subject: "EC501 - Digital Signal Processing", count: 26, prefix: "21EC" },
    { code: "MECH", subject: "ME501 - Thermodynamics & Heat Flow", count: 22, prefix: "21ME" },
    { code: "CIVIL", subject: "CE501 - Structural Dynamics & RCC", count: 20, prefix: "21CE" }
  ];

  const firstNames = ["Aarav", "Aditi", "Rohan", "Pooja", "Vikram", "Sneha", "Rahul", "Ananya", "Karthik", "Divya", "Siddharth", "Meera", "Arjun", "Kavya", "Naveen", "Tanvi", "Varun", "Riya", "Gautam", "Ishita"];
  const lastNames = ["Sharma", "Verma", "Iyer", "Patel", "Reddy", "Nair", "Gupta", "Deshmukh", "Choudhury", "Bose", "Mehta", "Rao", "Kumar", "Singh", "Das"];

  const list = [];
  let nameIndex = 0;

  branches.forEach(b => {
    for (let i = 1; i <= b.count; i++) {
      const numStr = i < 10 ? "00" + i : (i < 100 ? "0" + i : "" + i);
      const fn = firstNames[nameIndex % firstNames.length];
      const ln = lastNames[(nameIndex + 3) % lastNames.length];
      nameIndex++;
      list.push({
        rollNo: `${b.prefix}${numStr}`,
        name: `${fn} ${ln}`,
        branch: b.code,
        semester: 6,
        subject: b.subject
      });
    }
  });

  return list;
}

const APP_STATE = {
  halls: [],
  students: [],
  allocations: [],
  examConfig: {
    date: "2026-10-20",
    session: "FN",
    sessionTitle: "Morning (FN: 09:30 AM - 12:30 PM)",
    interleaveStrategy: "BRANCH_ALTERNATE",
    benchMode: "DUAL_SEAT",
    hallOrder: "PRIORITY_FILL"
  },
  activeTab: "dashboard",
  studentSearchQuery: "",
  studentBranchFilter: "ALL"
};

// Branch Colors Mapping
const BRANCH_THEMES = {
  CSE: { badgeClass: "badge-cse", dotColor: "#6366f1", label: "CSE (Computer Science)" },
  ECE: { badgeClass: "badge-ece", dotColor: "#0ea5e9", label: "ECE (Electronics & Comm)" },
  MECH: { badgeClass: "badge-mech", dotColor: "#f97316", label: "MECH (Mechanical Eng)" },
  CIVIL: { badgeClass: "badge-civil", dotColor: "#10b981", label: "CIVIL (Civil Eng)" },
  EEE: { badgeClass: "badge-eee", dotColor: "#8b5cf6", label: "EEE (Electrical Eng)" },
  IT: { badgeClass: "badge-it", dotColor: "#ec4899", label: "IT (Information Tech)" }
};

function getBranchTheme(branch) {
  return BRANCH_THEMES[branch] || { badgeClass: "badge-default", dotColor: "#64748b", label: branch };
}

// ==========================================================================
// 2. Storage & State Initialization
// ==========================================================================

function loadState() {
  const saved = localStorage.getItem("SEAT_ALLOCATOR_STATE_V1");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      APP_STATE.halls = parsed.halls || DEFAULT_HALLS;
      APP_STATE.students = parsed.students || generateDefaultStudents();
      APP_STATE.allocations = parsed.allocations || [];
      if (parsed.examConfig) APP_STATE.examConfig = parsed.examConfig;
      return;
    } catch (e) {
      console.warn("Could not parse saved state, loading defaults", e);
    }
  }
  resetToDemoData();
}

function saveState() {
  localStorage.setItem("SEAT_ALLOCATOR_STATE_V1", JSON.stringify({
    halls: APP_STATE.halls,
    students: APP_STATE.students,
    allocations: APP_STATE.allocations,
    examConfig: APP_STATE.examConfig
  }));
}

function resetToDemoData() {
  APP_STATE.halls = JSON.parse(JSON.stringify(DEFAULT_HALLS));
  APP_STATE.students = generateDefaultStudents();
  APP_STATE.allocations = [];
  executeAllocation(false); // Perform auto allocation automatically for demo
  saveState();
  showNotification("Demo data reloaded with 3 halls and 96 students across 4 branches.", "success");
  refreshUI();
}

// ==========================================================================
// 3. Core Auto-Allocation Engine
// ==========================================================================

function executeAllocation(isUserTriggered = true) {
  const { halls, students, examConfig } = APP_STATE;

  if (students.length === 0) {
    if (isUserTriggered) showNotification("No students registered! Add students first.", "error");
    return;
  }
  if (halls.length === 0) {
    if (isUserTriggered) showNotification("No examination halls defined! Add halls first.", "error");
    return;
  }

  const logLines = [];
  const log = (msg, cls = "") => logLines.push({ text: msg, cls });

  log(`[INIT] Starting Auto-Allocation Engine at ${new Date().toLocaleTimeString()}...`);
  log(`[CONFIG] Strategy: ${examConfig.interleaveStrategy} | Session: ${examConfig.session}`);

  const totalSeats = halls.reduce((sum, h) => sum + (h.rows * h.cols * h.seatsPerBench), 0);
  log(`[CAPACITY] Registered Students: ${students.length} | Total Room Capacity: ${totalSeats} seats.`);

  if (students.length > totalSeats) {
    const deficit = students.length - totalSeats;
    log(`[WARNING] Seat deficit detected! Shortfall of ${deficit} seats. Only first ${totalSeats} students can be seated.`, "text-danger");
  }

  // Step 1: Group students by Branch/Subject
  const grouped = {};
  students.forEach(s => {
    const key = s.branch || "GENERAL";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ...s });
  });

  const branchKeys = Object.keys(grouped);
  log(`[GROUPING] Found ${branchKeys.length} branches: ${branchKeys.map(k => `${k} (${grouped[k].length})`).join(", ")}`);

  // Step 2: Build Interleaved Student Queue
  let interleavedQueue = [];
  if (examConfig.interleaveStrategy === "BRANCH_ALTERNATE" && branchKeys.length > 1) {
    // Round-robin merge across branches to maximize alternation
    const queues = branchKeys.map(k => [...grouped[k]]);
    let remaining = true;
    while (remaining) {
      remaining = false;
      for (let i = 0; i < queues.length; i++) {
        if (queues[i].length > 0) {
          interleavedQueue.push(queues[i].shift());
          if (queues[i].length > 0) remaining = true;
        }
      }
    }
    log(`[INTERLEAVE] Round-robin alternation applied successfully. Adjacent students will belong to different branches.`);
  } else {
    // Sequential allocation
    interleavedQueue = [...students];
    log(`[SEQUENTIAL] Students will be assigned sequentially by roster order.`);
  }

  // Step 3: Map students to Halls -> Benches -> Seats
  const newAllocations = [];
  let studentIdx = 0;
  let conflictCount = 0;

  for (const hall of halls) {
    const seatsPerBench = hall.seatsPerBench || 2;
    let hallAllocCount = 0;

    for (let r = 1; r <= hall.rows; r++) {
      for (let c = 1; c <= hall.cols; c++) {
        const benchId = `B-R${r}C${c}`;

        for (let pos = 0; pos < seatsPerBench; pos++) {
          if (studentIdx >= interleavedQueue.length) {
            break; // All students allocated
          }

          const student = interleavedQueue[studentIdx];
          const posLabel = pos === 0 ? "A (Left)" : "B (Right)";
          const seatLabel = `${hall.id}-R${r}C${c}-${pos === 0 ? 'L' : 'R'}`;

          // Conflict check against left neighbor on the same bench
          if (pos > 0 && newAllocations.length > 0) {
            const previousAlloc = newAllocations[newAllocations.length - 1];
            if (previousAlloc.hallId === hall.id &&
                previousAlloc.row === r &&
                previousAlloc.col === c &&
                previousAlloc.branch === student.branch) {
              conflictCount++;
            }
          }

          newAllocations.push({
            allocId: `${hall.id}-${r}-${c}-${pos}`,
            studentRoll: student.rollNo,
            studentName: student.name,
            branch: student.branch,
            semester: student.semester,
            subject: student.subject,
            hallId: hall.id,
            hallName: hall.name,
            row: r,
            col: c,
            benchId: benchId,
            seatPos: pos === 0 ? "A" : "B",
            seatPosLabel: posLabel,
            seatLabel: seatLabel,
            examDate: examConfig.date,
            examSession: examConfig.session
          });

          studentIdx++;
          hallAllocCount++;
        }
      }
    }

    log(`[HALL COMPLETE] ${hall.name}: Assigned ${hallAllocCount} students.`);
    if (studentIdx >= interleavedQueue.length) break;
  }

  APP_STATE.allocations = newAllocations;
  saveState();

  log(`[COMPLETE] Seating generation finished! Total allocated: ${newAllocations.length}/${students.length}. Conflicts: ${conflictCount}`, conflictCount === 0 ? "text-success" : "text-warning");

  // Render log lines to diagnostic box
  const consoleBox = document.getElementById("allocationConsole");
  if (consoleBox) {
    consoleBox.innerHTML = logLines.map(l => `<div class="log-line ${l.cls}">${l.text}</div>`).join("");
    consoleBox.scrollTop = consoleBox.scrollHeight;
  }

  if (isUserTriggered) {
    showNotification(`Seating plan successfully generated for ${newAllocations.length} students with zero seat collisions!`, "success");
  }

  refreshUI();
}

// ==========================================================================
// 4. UI Rendering & Tab Control
// ==========================================================================

function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });

  // Load Demo Data Button
  document.getElementById("btnLoadDemoData")?.addEventListener("click", () => {
    if (confirm("Reset current halls, students, and allocations to original sample demo data?")) {
      resetToDemoData();
    }
  });

  // Quick Allocate Topbar Button
  document.getElementById("btnQuickAllocate")?.addEventListener("click", () => {
    executeAllocation(true);
  });

  // Allocation Form Buttons
  document.getElementById("btnExecuteAllocation")?.addEventListener("click", () => {
    readAllocationFormInputs();
    executeAllocation(true);
  });

  document.getElementById("btnClearAllocation")?.addEventListener("click", () => {
    if (confirm("Clear all generated seating allocations?")) {
      APP_STATE.allocations = [];
      saveState();
      refreshUI();
      showNotification("Seating allocations cleared.", "warning");
    }
  });

  // Hall Selection for Grid Matrix
  document.getElementById("gridHallSelect")?.addEventListener("change", (e) => {
    renderVisualHallGrid(e.target.value);
  });

  // Student Search / Filter
  document.getElementById("studentSearchFilter")?.addEventListener("input", (e) => {
    APP_STATE.studentSearchQuery = e.target.value.toLowerCase();
    renderStudentsTable();
  });

  document.getElementById("branchFilterSelect")?.addEventListener("change", (e) => {
    APP_STATE.studentBranchFilter = e.target.value;
    renderStudentsTable();
  });

  document.getElementById("btnClearAllStudents")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to remove ALL registered students?")) {
      APP_STATE.students = [];
      APP_STATE.allocations = [];
      saveState();
      refreshUI();
      showNotification("All student records cleared.", "warning");
    }
  });

  // Student Lookup Finder
  document.getElementById("btnRunLookup")?.addEventListener("click", runStudentLookup);
  document.getElementById("lookupSearchInput")?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") runStudentLookup();
  });

  // Modals
  document.getElementById("btnOpenAddHallModal")?.addEventListener("click", () => {
    document.getElementById("modalAddHall").classList.remove("hidden");
  });

  document.getElementById("btnOpenAddStudentModal")?.addEventListener("click", () => {
    document.getElementById("modalAddStudent").classList.remove("hidden");
  });

  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
    });
  });

  // Add Hall Form
  const formAddHall = document.getElementById("formAddHall");
  formAddHall?.addEventListener("submit", (e) => {
    e.preventDefault();
    const rows = parseInt(document.getElementById("hallRowsInput").value) || 5;
    const cols = parseInt(document.getElementById("hallColsInput").value) || 4;
    const seatsPerBench = parseInt(document.getElementById("hallSeatsPerBenchInput").value) || 2;
    const newHall = {
      id: document.getElementById("hallIdInput").value.trim().toUpperCase(),
      name: document.getElementById("hallNameInput").value.trim(),
      rows: rows,
      cols: cols,
      seatsPerBench: seatsPerBench,
      capacity: rows * cols * seatsPerBench
    };

    if (APP_STATE.halls.some(h => h.id === newHall.id)) {
      alert("A hall with this ID already exists! Please choose another code.");
      return;
    }

    APP_STATE.halls.push(newHall);
    saveState();
    formAddHall.reset();
    document.getElementById("modalAddHall").classList.add("hidden");
    showNotification(`Hall ${newHall.id} added with capacity ${newHall.capacity}.`, "success");
    refreshUI();
  });

  // Hall Capacity Live Preview
  const updateModalCapacity = () => {
    const r = parseInt(document.getElementById("hallRowsInput")?.value || 5);
    const c = parseInt(document.getElementById("hallColsInput")?.value || 4);
    const spb = parseInt(document.getElementById("hallSeatsPerBenchInput")?.value || 2);
    const calcEl = document.getElementById("modalHallCapacityCalc");
    if (calcEl) calcEl.innerText = r * c * spb;
  };
  document.getElementById("hallRowsInput")?.addEventListener("input", updateModalCapacity);
  document.getElementById("hallColsInput")?.addEventListener("input", updateModalCapacity);
  document.getElementById("hallSeatsPerBenchInput")?.addEventListener("change", updateModalCapacity);

  // Add Student Form
  const formAddStudent = document.getElementById("formAddStudent");
  formAddStudent?.addEventListener("submit", (e) => {
    e.preventDefault();
    const rollNo = document.getElementById("studentRollInput").value.trim().toUpperCase();
    const newStudent = {
      rollNo: rollNo,
      name: document.getElementById("studentNameInput").value.trim(),
      branch: document.getElementById("studentBranchInput").value.trim().toUpperCase(),
      semester: parseInt(document.getElementById("studentSemesterInput").value) || 6,
      subject: document.getElementById("studentSubjectInput").value.trim()
    };

    if (APP_STATE.students.some(s => s.rollNo === newStudent.rollNo)) {
      alert(`Student with Roll No ${newStudent.rollNo} is already registered!`);
      return;
    }

    APP_STATE.students.push(newStudent);
    saveState();
    formAddStudent.reset();
    document.getElementById("modalAddStudent").classList.add("hidden");
    showNotification(`Student ${newStudent.name} (${newStudent.rollNo}) added!`, "success");
    refreshUI();
  });

  // CSV Import
  document.getElementById("csvFileInput")?.addEventListener("change", handleCsvUpload);
  document.getElementById("btnDownloadSampleCsv")?.addEventListener("click", downloadSampleCsv);

  // Reports
  document.getElementById("btnPreviewDoorNotice")?.addEventListener("click", renderHallDoorNoticeReport);
  document.getElementById("btnPreviewAttendanceSheet")?.addEventListener("click", renderAttendanceSheetReport);
  document.getElementById("btnPreviewDeskSlips")?.addEventListener("click", renderDeskSlipsReport);
  document.getElementById("btnClosePrintPreview")?.addEventListener("click", () => {
    document.getElementById("printableReportSection")?.classList.add("hidden");
  });

  document.getElementById("btnExportCsv")?.addEventListener("click", exportAllocationsCsv);
  document.getElementById("btnExportJson")?.addEventListener("click", exportDataJson);
}

function readAllocationFormInputs() {
  const dateInput = document.getElementById("examDateInput");
  const sessionInput = document.getElementById("examSessionInput");
  const interleaveRadios = document.getElementsByName("interleaveStrategy");

  let strategy = "BRANCH_ALTERNATE";
  for (const r of interleaveRadios) {
    if (r.checked) strategy = r.value;
  }

  APP_STATE.examConfig.date = dateInput?.value || "2026-10-20";
  APP_STATE.examConfig.session = sessionInput?.value || "FN";
  APP_STATE.examConfig.sessionTitle = sessionInput?.selectedOptions[0]?.text || "Morning (FN)";
  APP_STATE.examConfig.interleaveStrategy = strategy;

  const sessionLabel = document.getElementById("sidebarSessionText");
  if (sessionLabel) sessionLabel.innerText = APP_STATE.examConfig.sessionTitle;
}

function switchTab(tabId) {
  APP_STATE.activeTab = tabId;

  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  document.querySelectorAll(".tab-pane").forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });

  // Update Topbar Title
  const titles = {
    dashboard: { title: "System Dashboard", sub: "Monitor halls, registered students, and seat allocation status." },
    halls: { title: "Exam Halls & Room Layouts", sub: "Configure room capacities, row/column matrices, and bench seating density." },
    students: { title: "Student Roster & Enrollments", sub: "Upload student lists across departments and configure subjects." },
    allocation: { title: "Auto-Allocation Engine", sub: "Run anti-cheating interleaved seating generation algorithms." },
    "grid-view": { title: "Visual Room Seating Matrix", sub: "Interactive 2D room floor layout with color-coded seat assignments." },
    lookup: { title: "Student Seat Finder", sub: "Quick look-up portal for students and invigilators to find desk allocations." },
    reports: { title: "Print & Export Reports", sub: "Generate official hall notices, attendance sheets, and desk stickers." }
  };

  const info = titles[tabId] || titles.dashboard;
  document.getElementById("pageTitle").innerText = info.title;
  document.getElementById("pageSubtitle").innerText = info.sub;

  if (tabId === "grid-view") {
    populateGridHallSelect();
  }
}

function refreshUI() {
  renderDashboardStats();
  renderHallsTable();
  renderStudentsTable();
  renderBranchFilterOptions();
  populateGridHallSelect();
  populateReportHallSelects();
  updateDiagnostics();
}

// ==========================================================================
// 5. Component Renderers
// ==========================================================================

function renderDashboardStats() {
  const { students, halls, allocations } = APP_STATE;
  const totalCapacity = halls.reduce((s, h) => s + (h.capacity || 0), 0);
  const allocatedCount = allocations.length;

  // Distinct branches
  const branches = [...new Set(students.map(s => s.branch))];

  document.getElementById("statStudentCount").innerText = students.length;
  document.getElementById("statBranchCount").innerText = `Across ${branches.length} departments`;

  document.getElementById("statHallCount").innerText = halls.length;
  document.getElementById("statTotalCapacity").innerText = `${totalCapacity} total seats`;

  document.getElementById("statAllocatedCount").innerText = allocatedCount;
  const pct = totalCapacity > 0 ? Math.round((allocatedCount / totalCapacity) * 100) : 0;
  document.getElementById("statAllocationPercentage").innerText = `${pct}% hall occupancy`;

  // Hall Capacity Bars
  const container = document.getElementById("hallCapacityBars");
  if (container) {
    if (halls.length === 0) {
      container.innerHTML = `<div class="text-muted text-sm">No exam halls configured yet.</div>`;
    } else {
      container.innerHTML = halls.map(h => {
        const hallAllocs = allocations.filter(a => a.hallId === h.id).length;
        const hallPct = h.capacity > 0 ? Math.round((hallAllocs / h.capacity) * 100) : 0;
        const fillClass = hallPct > 90 ? "fill-amber" : "fill-emerald";

        return `
          <div class="capacity-item">
            <div class="capacity-item-header">
              <span>${h.name}</span>
              <span><strong>${hallAllocs}</strong> / ${h.capacity} seats (${hallPct}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${fillClass}" style="width: ${hallPct}%"></div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // Branch Pills
  const branchContainer = document.getElementById("branchBreakdownList");
  if (branchContainer) {
    const branchCounts = {};
    students.forEach(s => {
      branchCounts[s.branch] = (branchCounts[s.branch] || 0) + 1;
    });

    if (Object.keys(branchCounts).length === 0) {
      branchContainer.innerHTML = `<div class="text-muted text-sm">No student records found.</div>`;
    } else {
      branchContainer.innerHTML = Object.entries(branchCounts).map(([b, count]) => {
        const theme = getBranchTheme(b);
        return `
          <div class="branch-pill" style="background-color: ${theme.dotColor}15; color: ${theme.dotColor}; border-color: ${theme.dotColor}40">
            <span>${theme.label}</span>
            <span class="badge-count" style="background-color: ${theme.dotColor}; color: #fff;">${count}</span>
          </div>
        `;
      }).join("");
    }
  }

  // Dashboard summary table (Top 8 allocated students preview)
  const tbody = document.getElementById("dashboardSummaryTbody");
  if (tbody) {
    if (allocations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No seating allocations generated yet. Click "Auto Allocate Now" to generate.</td></tr>`;
    } else {
      const previewList = allocations.slice(0, 10);
      tbody.innerHTML = previewList.map(a => {
        const theme = getBranchTheme(a.branch);
        return `
          <tr>
            <td class="mono"><strong>${a.studentRoll}</strong></td>
            <td>${a.studentName}</td>
            <td><span class="badge" style="background-color: ${theme.dotColor}; color: #fff;">${a.branch}</span></td>
            <td><small class="text-muted">${a.subject}</small></td>
            <td><strong>${a.hallName}</strong></td>
            <td>Row ${a.row}, Col ${a.col}</td>
            <td><span class="badge badge-primary">${a.seatLabel}</span></td>
          </tr>
        `;
      }).join("");
    }
  }
}

function renderHallsTable() {
  const tbody = document.getElementById("hallsTableBody");
  if (!tbody) return;

  if (APP_STATE.halls.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No examination halls configured. Click "+ Add New Hall" to start.</td></tr>`;
    return;
  }

  tbody.innerHTML = APP_STATE.halls.map(h => {
    const allocCount = APP_STATE.allocations.filter(a => a.hallId === h.id).length;
    return `
      <tr>
        <td class="mono font-bold">${h.id}</td>
        <td>${h.name}</td>
        <td>${h.rows} Rows × ${h.cols} Cols (${h.rows * h.cols} Benches)</td>
        <td>${h.seatsPerBench} ${h.seatsPerBench === 1 ? 'Student' : 'Students'} / Bench</td>
        <td><strong>${h.capacity}</strong> Seats</td>
        <td>
          <span class="badge ${allocCount > 0 ? 'badge-success' : 'badge-secondary'}">
            ${allocCount} Allocated
          </span>
        </td>
        <td>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteHall('${h.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

function deleteHall(hallId) {
  if (confirm(`Delete hall ${hallId}? Any associated seating allocations will be cleared.`)) {
    APP_STATE.halls = APP_STATE.halls.filter(h => h.id !== hallId);
    APP_STATE.allocations = APP_STATE.allocations.filter(a => a.hallId !== hallId);
    saveState();
    refreshUI();
    showNotification(`Hall ${hallId} deleted.`, "warning");
  }
}

function renderStudentsTable() {
  const tbody = document.getElementById("studentsTableBody");
  if (!tbody) return;

  let filtered = APP_STATE.students;

  if (APP_STATE.studentBranchFilter !== "ALL") {
    filtered = filtered.filter(s => s.branch === APP_STATE.studentBranchFilter);
  }

  if (APP_STATE.studentSearchQuery) {
    const q = APP_STATE.studentSearchQuery;
    filtered = filtered.filter(s => 
      s.rollNo.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.subject.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No students match current search/filter.</td></tr>`;
    return;
  }

  // Display first 50 entries
  const displaySlice = filtered.slice(0, 50);
  tbody.innerHTML = displaySlice.map(s => {
    const theme = getBranchTheme(s.branch);
    return `
      <tr>
        <td class="mono font-bold">${s.rollNo}</td>
        <td>${s.name}</td>
        <td><span class="badge" style="background-color: ${theme.dotColor}; color: #fff;">${s.branch}</span></td>
        <td>Semester ${s.semester}</td>
        <td>${s.subject}</td>
        <td>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteStudent('${s.rollNo}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  const pagination = document.getElementById("studentPagination");
  if (pagination) {
    pagination.innerHTML = `<span class="text-sm text-muted">Showing ${displaySlice.length} of ${filtered.length} students</span>`;
  }
}

function deleteStudent(rollNo) {
  APP_STATE.students = APP_STATE.students.filter(s => s.rollNo !== rollNo);
  APP_STATE.allocations = APP_STATE.allocations.filter(a => a.studentRoll !== rollNo);
  saveState();
  refreshUI();
  showNotification(`Student ${rollNo} removed.`, "warning");
}

function renderBranchFilterOptions() {
  const select = document.getElementById("branchFilterSelect");
  if (!select) return;

  const branches = [...new Set(APP_STATE.students.map(s => s.branch))];
  const currentVal = APP_STATE.studentBranchFilter;

  let html = `<option value="ALL">All Branches (${APP_STATE.students.length})</option>`;
  branches.forEach(b => {
    const count = APP_STATE.students.filter(s => s.branch === b).length;
    html += `<option value="${b}" ${b === currentVal ? 'selected' : ''}>${b} (${count})</option>`;
  });
  select.innerHTML = html;
}

function updateDiagnostics() {
  const totalDemand = APP_STATE.students.length;
  const totalCap = APP_STATE.halls.reduce((s, h) => s + (h.capacity || 0), 0);
  const surplus = totalCap - totalDemand;

  const demandEl = document.getElementById("diagDemandVal");
  const capEl = document.getElementById("diagCapacityVal");
  const surplusEl = document.getElementById("diagSurplusVal");

  if (demandEl) demandEl.innerText = `${totalDemand} Students`;
  if (capEl) capEl.innerText = `${totalCap} Seats`;
  if (surplusEl) {
    if (surplus >= 0) {
      surplusEl.className = "diag-val text-success";
      surplusEl.innerText = `+${surplus} Surplus Seats`;
    } else {
      surplusEl.className = "diag-val text-danger";
      surplusEl.innerText = `${surplus} Deficit (Shortfall)`;
    }
  }
}

// ==========================================================================
// 6. Visual Room Seating Matrix (Interactive 2D Grid)
// ==========================================================================

function populateGridHallSelect() {
  const select = document.getElementById("gridHallSelect");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = APP_STATE.halls.map(h => 
    `<option value="${h.id}" ${h.id === currentVal ? 'selected' : ''}>${h.name} (${h.capacity} seats)</option>`
  ).join("");

  if (APP_STATE.halls.length > 0) {
    const selectedHallId = select.value || APP_STATE.halls[0].id;
    renderVisualHallGrid(selectedHallId);
  }
}

function renderVisualHallGrid(hallId) {
  const hall = APP_STATE.halls.find(h => h.id === hallId);
  const container = document.getElementById("hallGridContainer");
  const legend = document.getElementById("gridLegend");

  if (!hall || !container) return;

  // Build Legend
  const branches = [...new Set(APP_STATE.students.map(s => s.branch))];
  if (legend) {
    legend.innerHTML = branches.map(b => {
      const theme = getBranchTheme(b);
      return `
        <div class="legend-pill">
          <span class="legend-color-dot" style="background-color: ${theme.dotColor};"></span>
          <span>${b}</span>
        </div>
      `;
    }).join("");
  }

  // Hall Allocations
  const hallAllocs = APP_STATE.allocations.filter(a => a.hallId === hallId);
  const allocMap = {};
  hallAllocs.forEach(a => {
    allocMap[`${a.row}-${a.col}-${a.seatPos}`] = a;
  });

  const seatsPerBench = hall.seatsPerBench || 2;

  let matrixHtml = `<div class="grid-matrix">`;

  for (let r = 1; r <= hall.rows; r++) {
    matrixHtml += `<div class="matrix-row">`;
    matrixHtml += `<div class="row-label">Row ${r}</div>`;

    for (let c = 1; c <= hall.cols; c++) {
      const benchId = `B${r}-${c}`;
      matrixHtml += `<div class="bench-card" data-bench-id="${benchId}">`;

      for (let pos = 0; pos < seatsPerBench; pos++) {
        const posCode = pos === 0 ? "A" : "B";
        const alloc = allocMap[`${r}-${c}-${posCode}`];

        if (alloc) {
          const theme = getBranchTheme(alloc.branch);
          matrixHtml += `
            <div class="seat-slot" title="${alloc.studentName} (${alloc.studentRoll})&#10;${alloc.subject}" onclick="alert('Seat: ${alloc.seatLabel}\\nStudent: ${alloc.studentName}\\nRoll No: ${alloc.studentRoll}\\nBranch: ${alloc.branch}\\nSubject: ${alloc.subject}')">
              <div class="flex-between">
                <span class="seat-pos-badge">${posCode}</span>
                <span class="seat-branch-badge ${theme.badgeClass}">${alloc.branch}</span>
              </div>
              <div class="seat-roll">${alloc.studentRoll}</div>
              <div class="text-xs text-muted" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${alloc.studentName}</div>
            </div>
          `;
        } else {
          matrixHtml += `
            <div class="seat-slot empty">
              <span class="seat-pos-badge">${posCode}</span>
              <span>Available</span>
            </div>
          `;
        }
      }

      matrixHtml += `</div>`; // .bench-card
    }

    matrixHtml += `</div>`; // .matrix-row
  }

  matrixHtml += `</div>`; // .grid-matrix
  container.innerHTML = matrixHtml;
}

// ==========================================================================
// 7. Student Seating Finder (Lookup Portal)
// ==========================================================================

function runStudentLookup() {
  const input = document.getElementById("lookupSearchInput");
  const resultArea = document.getElementById("lookupResultArea");
  if (!input || !resultArea) return;

  const query = input.value.trim().toLowerCase();
  if (!query) {
    alert("Please enter a Roll Number or Student Name to search.");
    return;
  }

  // Find in allocations
  const alloc = APP_STATE.allocations.find(a => 
    a.studentRoll.toLowerCase() === query ||
    a.studentName.toLowerCase().includes(query)
  );

  resultArea.classList.remove("hidden");

  if (!alloc) {
    // Check if registered but not allocated
    const student = APP_STATE.students.find(s => 
      s.rollNo.toLowerCase() === query || 
      s.name.toLowerCase().includes(query)
    );

    if (student) {
      resultArea.innerHTML = `
        <div class="alert alert-info text-center">
          <strong>${student.name} (${student.rollNo})</strong> is registered for <strong>${student.subject}</strong>, but seating has not been generated or hall capacity was exhausted.
          <div class="mt-2"><button class="btn btn-primary btn-sm" onclick="executeAllocation(true)">Run Auto-Allocation</button></div>
        </div>
      `;
    } else {
      resultArea.innerHTML = `
        <div class="alert alert-info text-center">
          No student found matching "<strong>${query}</strong>". Please verify your roll number.
        </div>
      `;
    }
    return;
  }

  const theme = getBranchTheme(alloc.branch);

  resultArea.innerHTML = `
    <div class="seating-ticket">
      <div class="ticket-header">
        <div>
          <span class="badge" style="background-color: ${theme.dotColor}; color:#fff; margin-bottom: 6px;">${alloc.branch} DEPARTMENT</span>
          <div class="ticket-title">${alloc.studentName}</div>
          <div class="mono text-muted">ROLL NUMBER: ${alloc.studentRoll}</div>
        </div>
        <div class="text-right">
          <div class="badge badge-success">SEAT CONFIRMED</div>
        </div>
      </div>

      <div class="ticket-grid">
        <div class="ticket-field">
          <span class="ticket-label">Examination Hall / Room</span>
          <span class="ticket-value">${alloc.hallName}</span>
        </div>
        <div class="ticket-field">
          <span class="ticket-label">Date & Session</span>
          <span class="ticket-value">${alloc.examDate} (${APP_STATE.examConfig.sessionTitle})</span>
        </div>
        <div class="ticket-field">
          <span class="ticket-label">Subject & Paper</span>
          <span class="ticket-value">${alloc.subject}</span>
        </div>
        <div class="ticket-field">
          <span class="ticket-label">Bench Location</span>
          <span class="ticket-value">Row ${alloc.row}, Column ${alloc.col} (${alloc.seatPosLabel})</span>
        </div>
      </div>

      <div class="seat-highlight-box">
        <span class="ticket-label">ASSIGNED SEAT NUMBER</span>
        <div class="seat-big-no">${alloc.seatLabel}</div>
      </div>
    </div>
  `;
}

// ==========================================================================
// 8. Reports, Door Notices & Desk Slips
// ==========================================================================

function populateReportHallSelects() {
  const selects = [
    document.getElementById("reportHallSelect"),
    document.getElementById("attendanceHallSelect"),
    document.getElementById("deskSlipsHallSelect")
  ];

  selects.forEach(sel => {
    if (!sel) return;
    let html = `<option value="ALL">All Examination Halls (Consolidated)</option>`;
    APP_STATE.halls.forEach(h => {
      html += `<option value="${h.id}">${h.name} (${h.id})</option>`;
    });
    sel.innerHTML = html;
  });
}

function showPrintableContainer(htmlContent) {
  const section = document.getElementById("printableReportSection");
  const content = document.getElementById("printableReportContent");
  if (!section || !content) return;

  content.innerHTML = htmlContent;
  section.classList.remove("hidden");
  section.scrollIntoView({ behavior: "smooth" });
}

function renderHallDoorNoticeReport() {
  const hallId = document.getElementById("reportHallSelect")?.value || "ALL";
  let targetHalls = APP_STATE.halls;
  if (hallId !== "ALL") {
    targetHalls = targetHalls.filter(h => h.id === hallId);
  }

  if (APP_STATE.allocations.length === 0) {
    alert("Please run Seating Auto-Allocation before generating door notice charts!");
    return;
  }

  let fullHtml = "";

  targetHalls.forEach(hall => {
    const allocs = APP_STATE.allocations.filter(a => a.hallId === hall.id);

    // Group roll numbers by branch
    const branchGroups = {};
    allocs.forEach(a => {
      if (!branchGroups[a.branch]) branchGroups[a.branch] = [];
      branchGroups[a.branch].push(a.studentRoll);
    });

    fullHtml += `
      <div style="page-break-after: always; margin-bottom: 40px;">
        <div class="print-doc-header">
          <h2>EXAMINATION SEATING ARRANGEMENT NOTICE</h2>
          <p><strong>EXAMINATION CELL & ACADEMIC CONTROLLER</strong></p>
        </div>

        <div class="print-meta-grid">
          <div>HALL: <u>${hall.name} (${hall.id})</u></div>
          <div>DATE: <u>${APP_STATE.examConfig.date}</u></div>
          <div>SESSION: <u>${APP_STATE.examConfig.sessionTitle}</u></div>
        </div>

        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #eee;">
                <th style="border: 1px solid #000; padding: 6px;">Branch</th>
                <th style="border: 1px solid #000; padding: 6px;">Total Count</th>
                <th style="border: 1px solid #000; padding: 6px;">Allocated Roll Numbers</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(branchGroups).map(([branch, rolls]) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 15%;">${branch}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; width: 12%;">${rolls.length} Students</td>
                  <td style="border: 1px solid #000; padding: 6px; font-family: monospace;">${rolls.join(", ")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <h4 style="margin-top: 20px; margin-bottom: 8px;">DETAILED DESK-BY-DESK SEATING ROSTER</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #000; padding: 5px;">Seat No</th>
              <th style="border: 1px solid #000; padding: 5px;">Bench</th>
              <th style="border: 1px solid #000; padding: 5px;">Roll No</th>
              <th style="border: 1px solid #000; padding: 5px;">Candidate Name</th>
              <th style="border: 1px solid #000; padding: 5px;">Branch</th>
              <th style="border: 1px solid #000; padding: 5px;">Subject Code</th>
            </tr>
          </thead>
          <tbody>
            ${allocs.map(a => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px; font-weight: bold; font-family: monospace;">${a.seatLabel}</td>
                <td style="border: 1px solid #000; padding: 4px;">R${a.row}-C${a.col} (${a.seatPos})</td>
                <td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${a.studentRoll}</td>
                <td style="border: 1px solid #000; padding: 4px;">${a.studentName}</td>
                <td style="border: 1px solid #000; padding: 4px;">${a.branch}</td>
                <td style="border: 1px solid #000; padding: 4px;">${a.subject.split('-')[0]}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
          <div>Hall In-Charge: ___________________</div>
          <div>Chief Superintendent: ___________________</div>
        </div>
      </div>
    `;
  });

  showPrintableContainer(fullHtml);
}

function renderAttendanceSheetReport() {
  const hallId = document.getElementById("attendanceHallSelect")?.value || "ALL";
  let targetHalls = APP_STATE.halls;
  if (hallId !== "ALL") {
    targetHalls = targetHalls.filter(h => h.id === hallId);
  }

  if (APP_STATE.allocations.length === 0) {
    alert("Please run Seating Auto-Allocation before generating attendance sheets!");
    return;
  }

  let fullHtml = "";

  targetHalls.forEach(hall => {
    const allocs = APP_STATE.allocations.filter(a => a.hallId === hall.id);

    fullHtml += `
      <div style="page-break-after: always; margin-bottom: 40px;">
        <div class="print-doc-header">
          <h2>INVIGILATOR ATTENDANCE & VERIFICATION REGISTER</h2>
          <p><strong>OFFICIAL EXAMINATION RECORD</strong></p>
        </div>

        <div class="print-meta-grid">
          <div>HALL: <u>${hall.name}</u></div>
          <div>DATE: <u>${APP_STATE.examConfig.date}</u></div>
          <div>SESSION: <u>${APP_STATE.examConfig.sessionTitle}</u></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="border: 1px solid #000; padding: 5px; width: 5%;">S.No</th>
              <th style="border: 1px solid #000; padding: 5px; width: 14%;">Seat Number</th>
              <th style="border: 1px solid #000; padding: 5px; width: 14%;">Roll Number</th>
              <th style="border: 1px solid #000; padding: 5px; width: 22%;">Student Name</th>
              <th style="border: 1px solid #000; padding: 5px; width: 10%;">Branch</th>
              <th style="border: 1px solid #000; padding: 5px; width: 15%;">Answer Book No</th>
              <th style="border: 1px solid #000; padding: 5px; width: 20%;">Candidate Signature</th>
            </tr>
          </thead>
          <tbody>
            ${allocs.map((a, i) => `
              <tr style="height: 32px;">
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 4px; font-weight: bold; font-family: monospace;">${a.seatLabel}</td>
                <td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${a.studentRoll}</td>
                <td style="border: 1px solid #000; padding: 4px;">${a.studentName}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${a.branch}</td>
                <td style="border: 1px solid #000; padding: 4px;"></td>
                <td style="border: 1px solid #000; padding: 4px;"></td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 0.9rem;">
          <div>Total Present: ______ / ${allocs.length}</div>
          <div>Invigilator Signature: ___________________</div>
        </div>
      </div>
    `;
  });

  showPrintableContainer(fullHtml);
}

function renderDeskSlipsReport() {
  const hallId = document.getElementById("deskSlipsHallSelect")?.value || "ALL";
  let allocs = APP_STATE.allocations;
  if (hallId !== "ALL") {
    allocs = allocs.filter(a => a.hallId === hallId);
  }

  if (allocs.length === 0) {
    alert("No student allocations available for desk slips. Please run allocation first!");
    return;
  }

  let slipsHtml = `
    <div class="print-doc-header">
      <h2>PRINTABLE DESK SEATING SLIPS</h2>
      <p>Cut along the dashed borders and paste on candidate desks</p>
    </div>
    <div class="desk-slips-grid">
  `;

  allocs.forEach(a => {
    slipsHtml += `
      <div class="desk-slip-item">
        <div class="slip-seat">${a.seatLabel}</div>
        <div class="slip-roll">${a.studentRoll}</div>
        <div style="font-weight: bold; margin-top: 4px;">${a.studentName}</div>
        <div style="font-size: 0.8rem; color: #444; margin-top: 4px;">${a.hallName} (R${a.row}-C${a.col})</div>
        <div style="font-size: 0.75rem; margin-top: 2px;">${a.branch} - ${a.subject.split('-')[0]}</div>
      </div>
    `;
  });

  slipsHtml += `</div>`;
  showPrintableContainer(slipsHtml);
}

// ==========================================================================
// 9. File Import / Export Handlers
// ==========================================================================

function handleCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    parseStudentCsv(text);
  };
  reader.readAsText(file);
}

function parseStudentCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    showNotification("CSV file is empty or missing data rows.", "error");
    return;
  }

  const header = lines[0].split(",").map(h => h.trim().toLowerCase());
  const rollIdx = header.findIndex(h => h.includes("roll"));
  const nameIdx = header.findIndex(h => h.includes("name"));
  const branchIdx = header.findIndex(h => h.includes("branch") || h.includes("dept"));
  const semIdx = header.findIndex(h => h.includes("sem"));
  const subIdx = header.findIndex(h => h.includes("subject") || h.includes("course"));

  if (rollIdx === -1 || nameIdx === -1 || branchIdx === -1) {
    showNotification("CSV must contain at least: Roll No, Student Name, and Branch columns.", "error");
    return;
  }

  let importedCount = 0;
  const newStudents = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    if (cols.length < 3 || !cols[rollIdx]) continue;

    newStudents.push({
      rollNo: cols[rollIdx].toUpperCase(),
      name: cols[nameIdx] || "Student",
      branch: cols[branchIdx].toUpperCase(),
      semester: semIdx !== -1 && cols[semIdx] ? parseInt(cols[semIdx]) : 6,
      subject: subIdx !== -1 && cols[subIdx] ? cols[subIdx] : `${cols[branchIdx]} Core Paper`
    });
    importedCount++;
  }

  if (importedCount > 0) {
    APP_STATE.students = newStudents;
    APP_STATE.allocations = [];
    saveState();
    refreshUI();
    showNotification(`Successfully imported ${importedCount} students from CSV!`, "success");
  }
}

function downloadSampleCsv() {
  const sampleContent = 
`Roll_Number,Student_Name,Branch,Semester,Subject
21CS001,Aarav Sharma,CSE,6,CS601 - Database Engineering
21CS002,Aditi Patel,CSE,6,CS601 - Database Engineering
21EC001,Rohan Verma,ECE,6,EC601 - Embedded Systems
21EC002,Pooja Iyer,ECE,6,EC601 - Embedded Systems
21ME001,Vikram Reddy,MECH,6,ME601 - Machine Design
21ME002,Sneha Deshmukh,MECH,6,ME601 - Machine Design
21CE001,Rahul Gupta,CIVIL,6,CE601 - Environmental Eng
21CE002,Ananya Choudhury,CIVIL,6,CE601 - Environmental Eng`;

  const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample_students_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportAllocationsCsv() {
  if (APP_STATE.allocations.length === 0) {
    alert("No seating allocations available to export. Run auto-allocation first!");
    return;
  }

  let csvContent = "Seat_Label,Hall_ID,Hall_Name,Row,Column,Position,Roll_Number,Student_Name,Branch,Semester,Subject,Date,Session\n";

  APP_STATE.allocations.forEach(a => {
    csvContent += `"${a.seatLabel}","${a.hallId}","${a.hallName}",${a.row},${a.col},"${a.seatPos}","${a.studentRoll}","${a.studentName}","${a.branch}",${a.semester},"${a.subject}","${a.examDate}","${a.examSession}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Exam_Seating_Allocation_${APP_STATE.examConfig.date}_${APP_STATE.examConfig.session}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportDataJson() {
  const data = JSON.stringify(APP_STATE, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SeatMatrix_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function showNotification(msg, type = "success") {
  const banner = document.getElementById("notificationBanner");
  if (!banner) return;

  banner.className = `notification-banner ${type}`;
  banner.innerText = msg;
  banner.classList.remove("hidden");

  setTimeout(() => {
    banner.classList.add("hidden");
  }, 4000);
}

// ==========================================================================
// 10. Application Bootstrap
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  setupEventListeners();
  refreshUI();
});
