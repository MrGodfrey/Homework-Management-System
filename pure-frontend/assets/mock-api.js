import { y as router } from "./index-CaY54Ej1.js";

const STORAGE_KEY = "classroom-pure-frontend-db-v1";
const DEFAULT_DELAY_MS = 120;

const clone = (value) => JSON.parse(JSON.stringify(value));

function isoFromNow({ days = 0, hours = 0, minutes = 0 } = {}) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  date.setSeconds(0, 0);
  return date.toISOString();
}

function createDefaultDb() {
  return {
    counters: {
      student: 4,
      assignment: 4,
      attachment: 6,
      submission: 8,
      interaction: 6
    },
    instructor: {
      username: "teacher",
      password: "123456",
      name: "课程教师"
    },
    students: [
      { id: 1, student_id: "20230001", name: "王小明", password: "20230001" },
      { id: 2, student_id: "20230002", name: "李雨桐", password: "20230002" },
      { id: 3, student_id: "20230003", name: "陈思远", password: "20230003" }
    ],
    assignments: [
      {
        id: 1,
        title: "第 1 次作业：网页布局拆解",
        description: "阅读课堂案例，整理页面结构，并提交一份简短分析说明。",
        deadline: isoFromNow({ days: -2, hours: 18 }),
        allow_late: false,
        file_rules: ".pdf,.docx,.md",
        attachment_files: [
          {
            id: 1,
            filename: "layout-reference.pdf",
            content: "Mock attachment for layout reference.",
            mime: "application/pdf"
          },
          {
            id: 2,
            filename: "sample-notes.md",
            content: "# 示例说明\n\n这里是作业参考说明。",
            mime: "text/markdown"
          }
        ]
      },
      {
        id: 2,
        title: "第 2 次作业：课堂交互原型",
        description: "根据需求完成交互流程草图，并补充上传文件说明。",
        deadline: isoFromNow({ days: 3, hours: 20 }),
        allow_late: true,
        file_rules: ".pdf,.docx,.png,.zip",
        attachment_files: [
          {
            id: 3,
            filename: "prototype-brief.docx",
            content: "Prototype brief placeholder.",
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          }
        ]
      },
      {
        id: 3,
        title: "第 3 次作业：课程复盘",
        description: "提交一份本周课程复盘，总结完成情况与遗留问题。",
        deadline: isoFromNow({ days: 8, hours: 17 }),
        allow_late: true,
        file_rules: ".md,.txt,.pdf",
        attachment_files: [
          {
            id: 4,
            filename: "weekly-template.txt",
            content: "1. 本周完成内容\n2. 遇到的问题\n3. 下周计划",
            mime: "text/plain"
          },
          {
            id: 5,
            filename: "example-review.pdf",
            content: "Example weekly review placeholder.",
            mime: "application/pdf"
          }
        ]
      }
    ],
    submissions: [
      {
        id: 1,
        assignment_id: 1,
        student_db_id: 1,
        student_id: "20230001",
        student_name: "王小明",
        version: 1,
        time: isoFromNow({ days: -5, hours: 14 }),
        is_graded: true,
        score: 92,
        files: [
          {
            filename: "wangxiaoming-layout-v1.pdf",
            content: "Submission v1 for 王小明.",
            mime: "application/pdf"
          }
        ]
      },
      {
        id: 2,
        assignment_id: 1,
        student_db_id: 2,
        student_id: "20230002",
        student_name: "李雨桐",
        version: 1,
        time: isoFromNow({ days: -4, hours: 16 }),
        is_graded: true,
        score: 88,
        files: [
          {
            filename: "liyutong-layout-v1.docx",
            content: "Submission v1 for 李雨桐.",
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          }
        ]
      },
      {
        id: 3,
        assignment_id: 1,
        student_db_id: 3,
        student_id: "20230003",
        student_name: "陈思远",
        version: 1,
        time: isoFromNow({ days: -3, hours: 11 }),
        is_graded: false,
        score: null,
        files: [
          {
            filename: "chensiyuan-layout-v1.md",
            content: "Submission v1 for 陈思远.",
            mime: "text/markdown"
          }
        ]
      },
      {
        id: 4,
        assignment_id: 2,
        student_db_id: 1,
        student_id: "20230001",
        student_name: "王小明",
        version: 1,
        time: isoFromNow({ days: -1, hours: 9 }),
        is_graded: true,
        score: 85,
        files: [
          {
            filename: "wangxiaoming-prototype-v1.zip",
            content: "Prototype package v1 for 王小明.",
            mime: "application/zip"
          }
        ]
      },
      {
        id: 5,
        assignment_id: 2,
        student_db_id: 1,
        student_id: "20230001",
        student_name: "王小明",
        version: 2,
        time: isoFromNow({ days: 0, hours: -4 }),
        is_graded: false,
        score: null,
        files: [
          {
            filename: "wangxiaoming-prototype-v2.zip",
            content: "Prototype package v2 for 王小明.",
            mime: "application/zip"
          }
        ]
      },
      {
        id: 6,
        assignment_id: 2,
        student_db_id: 2,
        student_id: "20230002",
        student_name: "李雨桐",
        version: 1,
        time: isoFromNow({ days: -1, hours: 12 }),
        is_graded: false,
        score: null,
        files: [
          {
            filename: "liyutong-prototype-v1.pdf",
            content: "Prototype v1 for 李雨桐.",
            mime: "application/pdf"
          }
        ]
      },
      {
        id: 7,
        assignment_id: 3,
        student_db_id: 2,
        student_id: "20230002",
        student_name: "李雨桐",
        version: 1,
        time: isoFromNow({ days: -1, hours: 10 }),
        is_graded: true,
        score: 95,
        files: [
          {
            filename: "liyutong-review-v1.md",
            content: "Weekly review for 李雨桐.",
            mime: "text/markdown"
          }
        ]
      }
    ],
    interactions: [
      { id: 1, student_db_id: 1, created_at: isoFromNow({ days: -6, hours: 10 }), note: "主动回答页面结构问题" },
      { id: 2, student_db_id: 1, created_at: isoFromNow({ days: -2, hours: 15 }), note: "课堂展示原型思路" },
      { id: 3, student_db_id: 2, created_at: isoFromNow({ days: -4, hours: 13 }), note: "补充了移动端布局方案" },
      { id: 4, student_db_id: 3, created_at: isoFromNow({ days: -3, hours: 9 }), note: "提出上传流程优化建议" },
      { id: 5, student_db_id: 2, created_at: isoFromNow({ days: -1, hours: 16 }), note: null }
    ]
  };
}

function readDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.students && parsed.assignments) {
        return parsed;
      }
    }
  } catch {
  }
  const nextDb = createDefaultDb();
  writeDb(nextDb);
  return nextDb;
}

function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function nextId(db, type) {
  const value = db.counters[type];
  db.counters[type] += 1;
  return value;
}

function buildToken(role, identifier) {
  return `${role}:${identifier}`;
}

function parseToken() {
  const token = localStorage.getItem("token") || "";
  const [role, identifier] = token.split(":");
  return { role, identifier };
}

function getCurrentStudent(db) {
  const { role, identifier } = parseToken();
  if (role !== "student") {
    return null;
  }
  return db.students.find((student) => student.student_id === identifier) || null;
}

function getCurrentInstructor(db) {
  const { role, identifier } = parseToken();
  if (role !== "instructor" || identifier !== db.instructor.username) {
    return null;
  }
  return db.instructor;
}

function apiError(status, detail) {
  const error = new Error(detail);
  error.response = {
    status,
    data: { detail }
  };
  return error;
}

function unauthorized(roleHint) {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  router.push(roleHint === "instructor" ? "/admin/login" : "/login");
  return apiError(401, "登录状态已失效");
}

function requireStudent(db) {
  const student = getCurrentStudent(db);
  if (!student) {
    throw unauthorized("student");
  }
  return student;
}

function requireInstructor(db) {
  const instructor = getCurrentInstructor(db);
  if (!instructor) {
    throw unauthorized("instructor");
  }
  return instructor;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function simulateUpload(config, body) {
  if (typeof config?.onUploadProgress !== "function") {
    return;
  }
  const total = estimateSize(body);
  for (const ratio of [0.25, 0.65, 1]) {
    await delay(60);
    config.onUploadProgress({
      loaded: Math.round(total * ratio),
      total
    });
  }
}

function estimateSize(body) {
  if (body instanceof FormData) {
    let total = 0;
    for (const [, value] of body.entries()) {
      if (value && typeof value.size === "number") {
        total += value.size;
      } else if (typeof value === "string") {
        total += value.length;
      } else {
        total += 128;
      }
    }
    return Math.max(total, 256);
  }
  if (typeof body === "string") {
    return Math.max(body.length, 256);
  }
  return 512;
}

function makeBlob(content, mime = "text/plain;charset=utf-8") {
  return new Blob([content], { type: mime });
}

function guessMime(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "md":
      return "text/markdown;charset=utf-8";
    case "csv":
      return "text/csv;charset=utf-8";
    case "zip":
      return "application/zip";
    case "txt":
      return "text/plain;charset=utf-8";
    case "png":
      return "image/png";
    default:
      return "text/plain;charset=utf-8";
  }
}

function makeDownloadUrl(filename, content, mime = guessMime(filename)) {
  const blob = makeBlob(content, mime);
  const url = URL.createObjectURL(blob);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}

function parseRequestUrl(url, params) {
  const parsed = new URL(url, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        parsed.searchParams.set(key, String(value));
      }
    });
  }
  return {
    path: parsed.pathname.replace(/^\/api\b/, "") || "/",
    query: parsed.searchParams
  };
}

function sortByTimeDesc(items, key = "created_at") {
  return [...items].sort((left, right) => new Date(right[key]) - new Date(left[key]));
}

function getAssignment(db, assignmentId) {
  return db.assignments.find((assignment) => assignment.id === Number(assignmentId)) || null;
}

function getStudent(db, studentId) {
  return db.students.find((student) => student.id === Number(studentId)) || null;
}

function getLatestSubmission(db, assignmentId, studentDbId) {
  const submissions = db.submissions
    .filter((submission) => submission.assignment_id === Number(assignmentId) && submission.student_db_id === Number(studentDbId))
    .sort((left, right) => right.version - left.version);
  return submissions[0] || null;
}

function getAssignmentSubmissions(db, assignmentId) {
  return db.submissions.filter((submission) => submission.assignment_id === Number(assignmentId));
}

function getStudentInteractions(db, studentDbId) {
  return sortByTimeDesc(db.interactions.filter((interaction) => interaction.student_db_id === Number(studentDbId)));
}

function buildStudentAssignmentList(db, student) {
  return db.assignments
    .map((assignment) => {
      const latestSubmission = getLatestSubmission(db, assignment.id, student.id);
      return {
        id: assignment.id,
        title: assignment.title,
        deadline: assignment.deadline,
        allow_late: assignment.allow_late,
        file_rules: assignment.file_rules,
        description: assignment.description,
        status: {
          submitted: !!latestSubmission,
          version_no: latestSubmission?.version || null,
          is_graded: !!latestSubmission?.is_graded,
          score: latestSubmission?.score ?? null
        }
      };
    })
    .sort((left, right) => new Date(left.deadline) - new Date(right.deadline));
}

function buildDashboard(db) {
  return db.students.map((student) => {
    const submissions = {};
    db.assignments.forEach((assignment) => {
      const latestSubmission = getLatestSubmission(db, assignment.id, student.id);
      submissions[assignment.id] = latestSubmission ? latestSubmission.version : 0;
    });
    return {
      student_id: student.student_id,
      name: student.name,
      submissions,
      interaction_count: getStudentInteractions(db, student.id).length
    };
  });
}

function buildAdminAssignments(db) {
  return db.assignments
    .map((assignment) => {
      const related = getAssignmentSubmissions(db, assignment.id);
      const latestByStudent = new Map();
      related.forEach((submission) => {
        const current = latestByStudent.get(submission.student_db_id);
        if (!current || submission.version > current.version) {
          latestByStudent.set(submission.student_db_id, submission);
        }
      });
      const latestSubmissions = [...latestByStudent.values()];
      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        deadline: assignment.deadline,
        allow_late: assignment.allow_late,
        file_rules: assignment.file_rules,
        submitted_count: latestSubmissions.length,
        graded_count: latestSubmissions.filter((submission) => submission.is_graded).length
      };
    })
    .sort((left, right) => left.id - right.id);
}

function buildSubmissionHistory(db, assignmentId, studentDbId) {
  return db.submissions
    .filter((submission) => submission.assignment_id === Number(assignmentId) && submission.student_db_id === Number(studentDbId))
    .sort((left, right) => right.version - left.version)
    .map((submission) => ({
      version_no: submission.version,
      submitted_at: submission.time,
      files: submission.files.map((file) => ({
        filename: file.filename,
        download_url: makeDownloadUrl(file.filename, file.content, file.mime)
      }))
    }));
}

function toSubmissionRow(submission) {
  return {
    id: submission.id,
    student_id: submission.student_id,
    student_name: submission.student_name,
    version: submission.version,
    time: submission.time,
    is_graded: submission.is_graded,
    score: submission.score
  };
}

function parseFormFiles(body, fieldName) {
  if (!(body instanceof FormData)) {
    return [];
  }
  return body.getAll(fieldName).map((file, index) => ({
    filename: file?.name || `${fieldName}-${index + 1}.txt`,
    content: `Mock file content for ${file?.name || `${fieldName}-${index + 1}`}.`,
    mime: file?.type || guessMime(file?.name || "")
  }));
}

function normalizeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return isoFromNow({ days: 1, hours: 18 });
  }
  return date.toISOString();
}

function ensureUniqueStudentId(db, studentId, excludeId = null) {
  const duplicated = db.students.find((student) => student.student_id === studentId && student.id !== excludeId);
  if (duplicated) {
    throw apiError(400, "学号已存在");
  }
}

function makeCsv(rows) {
  return rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
}

function randomPassword(length = 8) {
  return Math.random().toString(36).slice(2, 2 + length).padEnd(length, "0");
}

async function parseStudentCsv(file) {
  if (!file || typeof file.text !== "function") {
    return [];
  }
  const text = await file.text();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((item) => item.trim()))
    .filter((columns) => columns.length >= 2)
    .filter((columns) => columns[0].toLowerCase() !== "student_id" && columns[0] !== "学号")
    .map((columns) => ({
      student_id: columns[0],
      name: columns[1]
    }))
    .filter((student) => student.student_id && student.name);
}

function makeAssignmentDownloadBlob(db, assignmentId, mode) {
  const rows = getAssignmentSubmissions(db, assignmentId)
    .filter((submission) => {
      if (mode !== "latest") {
        return true;
      }
      const latest = getLatestSubmission(db, assignmentId, submission.student_db_id);
      return latest?.id === submission.id;
    })
    .sort((left, right) => {
      if (left.student_id === right.student_id) {
        return left.version - right.version;
      }
      return left.student_id.localeCompare(right.student_id);
    })
    .map((submission) => `${submission.student_id},${submission.student_name},v${submission.version},${submission.files.map((file) => file.filename).join(" | ")}`);
  const content = `Mock download package for assignment ${assignmentId}\n\n${rows.join("\n")}`;
  return makeBlob(content, "application/zip");
}

function makeSingleSubmissionBlob(db, assignmentId, studentId) {
  const student = db.students.find((item) => item.student_id === studentId);
  const latest = student ? getLatestSubmission(db, assignmentId, student.id) : null;
  const content = latest
    ? `Mock zip for ${latest.student_name}\nAssignment ${assignmentId}\nVersion ${latest.version}\nFiles: ${latest.files.map((file) => file.filename).join(", ")}`
    : `No submission for ${studentId}`;
  return makeBlob(content, "application/zip");
}

function makeAssignmentCsv(db, assignmentId) {
  const rows = [["学号", "姓名", "最新版本", "分数", "是否已评分"]];
  db.students.forEach((student) => {
    const latest = getLatestSubmission(db, assignmentId, student.id);
    rows.push([
      student.student_id,
      student.name,
      latest ? `v${latest.version}` : "-",
      latest?.score ?? "-",
      latest?.is_graded ? "是" : "否"
    ]);
  });
  return makeBlob(makeCsv(rows), "text/csv;charset=utf-8");
}

function makeAllGradesCsv(db) {
  const assignmentTitles = db.assignments.map((assignment) => assignment.title);
  const rows = [["学号", "姓名", ...assignmentTitles]];
  db.students.forEach((student) => {
    rows.push([
      student.student_id,
      student.name,
      ...db.assignments.map((assignment) => {
        const latest = getLatestSubmission(db, assignment.id, student.id);
        return latest?.score ?? "-";
      })
    ]);
  });
  return makeBlob(makeCsv(rows), "text/csv;charset=utf-8");
}

function makePasswordsCsv(db) {
  const rows = [["学号", "姓名", "密码"], ...db.students.map((student) => [student.student_id, student.name, student.password])];
  return makeBlob(makeCsv(rows), "text/csv;charset=utf-8");
}

async function handleRequest(db, method, path, body, query) {
  if (method === "POST" && path === "/auth/student/login") {
    const studentId = body?.student_id || "20230001";
    const password = body?.password || "20230001";
    const student = db.students.find((item) => item.student_id === studentId);
    if (!student || student.password !== password) {
      throw apiError(401, "学号或密码错误");
    }
    return { data: { access_token: buildToken("student", student.student_id) } };
  }

  if (method === "POST" && path === "/auth/instructor/login") {
    const username = body?.username || "teacher";
    const password = body?.password || "123456";
    if (username !== db.instructor.username || password !== db.instructor.password) {
      throw apiError(401, "用户名或密码错误");
    }
    return { data: { access_token: buildToken("instructor", db.instructor.username) } };
  }

  if (method === "GET" && path === "/assignments/me") {
    const student = requireStudent(db);
    return { data: { id: student.id, name: student.name, student_id: student.student_id } };
  }

  if (method === "GET" && path === "/assignments") {
    const student = requireStudent(db);
    return { data: buildStudentAssignmentList(db, student) };
  }

  if (method === "GET" && path === "/assignments/interactions") {
    const student = requireStudent(db);
    const items = getStudentInteractions(db, student.id);
    return {
      data: {
        count: items.length,
        items: clone(items)
      }
    };
  }

  let match = path.match(/^\/assignments\/(\d+)$/);
  if (method === "GET" && match) {
    requireStudent(db);
    const assignment = getAssignment(db, match[1]);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    return { data: clone(assignment) };
  }

  match = path.match(/^\/assignments\/(\d+)\/attachments$/);
  if (method === "GET" && match) {
    requireStudent(db);
    const assignment = getAssignment(db, match[1]);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    return {
      data: clone(
        assignment.attachment_files.map((file) => ({
          id: file.id,
          filename: file.filename
        }))
      )
    };
  }

  match = path.match(/^\/assignments\/(\d+)\/attachments\/(\d+)\/download$/);
  if (method === "GET" && match) {
    requireStudent(db);
    const assignment = getAssignment(db, match[1]);
    const file = assignment?.attachment_files.find((item) => item.id === Number(match[2]));
    if (!assignment || !file) {
      throw apiError(404, "附件不存在");
    }
    return {
      data: {
        download_url: makeDownloadUrl(file.filename, file.content, file.mime)
      }
    };
  }

  match = path.match(/^\/assignments\/(\d+)\/submit$/);
  if (method === "POST" && match) {
    const student = requireStudent(db);
    const assignment = getAssignment(db, match[1]);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    const files = parseFormFiles(body, "files");
    if (files.length === 0) {
      throw apiError(400, "请先选择文件");
    }
    const currentVersions = db.submissions.filter((submission) => submission.assignment_id === assignment.id && submission.student_db_id === student.id);
    const version = currentVersions.length === 0 ? 1 : Math.max(...currentVersions.map((submission) => submission.version)) + 1;
    db.submissions.push({
      id: nextId(db, "submission"),
      assignment_id: assignment.id,
      student_db_id: student.id,
      student_id: student.student_id,
      student_name: student.name,
      version,
      time: new Date().toISOString(),
      is_graded: false,
      score: null,
      files
    });
    writeDb(db);
    return { data: { version_no: version } };
  }

  match = path.match(/^\/assignments\/(\d+)\/submissions$/);
  if (method === "GET" && match) {
    const student = requireStudent(db);
    return { data: buildSubmissionHistory(db, match[1], student.id) };
  }

  if (method === "GET" && path === "/admin/dashboard") {
    requireInstructor(db);
    return { data: buildDashboard(db) };
  }

  if (method === "GET" && path === "/admin/assignments") {
    requireInstructor(db);
    return { data: buildAdminAssignments(db) };
  }

  if (method === "POST" && path === "/admin/assignments") {
    requireInstructor(db);
    if (!body?.title || !body?.deadline) {
      throw apiError(400, "请填写作业名称和截止时间");
    }
    const assignment = {
      id: nextId(db, "assignment"),
      title: body.title,
      description: body.description || "",
      deadline: normalizeDate(body.deadline),
      allow_late: !!body.allow_late,
      file_rules: body.file_rules || "",
      attachment_files: []
    };
    db.assignments.push(assignment);
    writeDb(db);
    return { data: clone(assignment) };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)$/);
  if (method === "PUT" && match) {
    requireInstructor(db);
    const assignment = getAssignment(db, match[1]);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    assignment.title = body?.title || assignment.title;
    assignment.description = body?.description || "";
    assignment.deadline = normalizeDate(body?.deadline || assignment.deadline);
    assignment.allow_late = !!body?.allow_late;
    assignment.file_rules = body?.file_rules || "";
    writeDb(db);
    return { data: clone(assignment) };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)$/);
  if (method === "DELETE" && match) {
    requireInstructor(db);
    const assignmentId = Number(match[1]);
    const assignment = getAssignment(db, assignmentId);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    const hasSubmissions = db.submissions.some((submission) => submission.assignment_id === assignmentId);
    if (hasSubmissions && query.get("force") !== "true") {
      return {
        data: {
          status: "confirm_required",
          message: "已有学生上传作业"
        }
      };
    }
    db.assignments = db.assignments.filter((item) => item.id !== assignmentId);
    db.submissions = db.submissions.filter((submission) => submission.assignment_id !== assignmentId);
    writeDb(db);
    return {
      data: {
        status: "success",
        message: "删除成功"
      }
    };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)\/with-files$/);
  if (method === "GET" && match) {
    requireInstructor(db);
    const assignment = getAssignment(db, match[1]);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    return {
      data: {
        ...clone(assignment),
        attachment_files: clone(assignment.attachment_files)
      }
    };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)\/upload-attachment$/);
  if (method === "POST" && match) {
    requireInstructor(db);
    const assignment = getAssignment(db, match[1]);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    const [file] = parseFormFiles(body, "file");
    if (!file) {
      throw apiError(400, "请选择附件");
    }
    const nextFile = {
      id: nextId(db, "attachment"),
      ...file
    };
    assignment.attachment_files.push(nextFile);
    writeDb(db);
    return { data: clone({ id: nextFile.id, filename: nextFile.filename }) };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)\/attachments\/(\d+)\/download$/);
  if (method === "GET" && match) {
    requireInstructor(db);
    const assignment = getAssignment(db, match[1]);
    const file = assignment?.attachment_files.find((item) => item.id === Number(match[2]));
    if (!assignment || !file) {
      throw apiError(404, "附件不存在");
    }
    return {
      data: {
        download_url: makeDownloadUrl(file.filename, file.content, file.mime)
      }
    };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)\/attachments\/(\d+)$/);
  if (method === "DELETE" && match) {
    requireInstructor(db);
    const assignment = getAssignment(db, match[1]);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    assignment.attachment_files = assignment.attachment_files.filter((file) => file.id !== Number(match[2]));
    writeDb(db);
    return { data: { status: "success" } };
  }

  if (method === "GET" && path === "/admin/export_all_grades_csv") {
    requireInstructor(db);
    return { data: makeAllGradesCsv(db) };
  }

  if (method === "GET" && path === "/admin/students") {
    requireInstructor(db);
    return { data: clone(db.students).sort((left, right) => left.id - right.id) };
  }

  if (method === "POST" && path === "/admin/students") {
    requireInstructor(db);
    const studentId = body?.student_id?.trim();
    const name = body?.name?.trim();
    if (!studentId || !name) {
      throw apiError(400, "学号和姓名不能为空");
    }
    ensureUniqueStudentId(db, studentId);
    const nextStudent = {
      id: nextId(db, "student"),
      student_id: studentId,
      name,
      password: studentId
    };
    db.students.push(nextStudent);
    writeDb(db);
    return { data: clone(nextStudent) };
  }

  match = path.match(/^\/admin\/students\/(\d+)$/);
  if (method === "PUT" && match) {
    requireInstructor(db);
    const student = getStudent(db, match[1]);
    if (!student) {
      throw apiError(404, "学生不存在");
    }
    const studentId = body?.student_id?.trim();
    const name = body?.name?.trim();
    if (!studentId || !name) {
      throw apiError(400, "学号和姓名不能为空");
    }
    ensureUniqueStudentId(db, studentId, student.id);
    student.student_id = studentId;
    student.name = name;
    db.submissions.forEach((submission) => {
      if (submission.student_db_id === student.id) {
        submission.student_id = student.student_id;
        submission.student_name = student.name;
      }
    });
    writeDb(db);
    return { data: clone(student) };
  }

  match = path.match(/^\/admin\/students\/(\d+)$/);
  if (method === "DELETE" && match) {
    requireInstructor(db);
    const studentId = Number(match[1]);
    db.students = db.students.filter((student) => student.id !== studentId);
    db.submissions = db.submissions.filter((submission) => submission.student_db_id !== studentId);
    db.interactions = db.interactions.filter((interaction) => interaction.student_db_id !== studentId);
    writeDb(db);
    return { data: { status: "success" } };
  }

  if (method === "POST" && path === "/admin/students/import") {
    requireInstructor(db);
    const file = body instanceof FormData ? body.get("file") : null;
    const parsed = await parseStudentCsv(file);
    if (parsed.length === 0) {
      throw apiError(400, "CSV 中未解析到有效学生");
    }
    let imported = 0;
    parsed.forEach((item) => {
      if (db.students.some((student) => student.student_id === item.student_id)) {
        return;
      }
      db.students.push({
        id: nextId(db, "student"),
        student_id: item.student_id,
        name: item.name,
        password: item.student_id
      });
      imported += 1;
    });
    writeDb(db);
    return {
      data: {
        message: imported > 0 ? `成功导入 ${imported} 名学生` : "没有新增学生，学号可能已存在"
      }
    };
  }

  if (method === "POST" && path === "/admin/students/generate-passwords") {
    requireInstructor(db);
    db.students.forEach((student) => {
      student.password = randomPassword();
    });
    writeDb(db);
    return { data: { message: "密码批量重新生成成功" } };
  }

  if (method === "GET" && path === "/admin/students/download-passwords") {
    requireInstructor(db);
    return { data: makePasswordsCsv(db) };
  }

  match = path.match(/^\/admin\/students\/(\d+)\/reset-password$/);
  if (method === "POST" && match) {
    requireInstructor(db);
    const student = getStudent(db, match[1]);
    if (!student) {
      throw apiError(404, "学生不存在");
    }
    const newPassword = randomPassword();
    student.password = newPassword;
    writeDb(db);
    return { data: { new_password: newPassword } };
  }

  match = path.match(/^\/admin\/students\/(\d+)\/interactions$/);
  if (method === "GET" && match) {
    requireInstructor(db);
    const student = getStudent(db, match[1]);
    if (!student) {
      throw apiError(404, "学生不存在");
    }
    return { data: clone(getStudentInteractions(db, student.id)) };
  }

  match = path.match(/^\/admin\/students\/(\d+)\/interactions$/);
  if (method === "POST" && match) {
    requireInstructor(db);
    const student = getStudent(db, match[1]);
    if (!student) {
      throw apiError(404, "学生不存在");
    }
    const nextInteraction = {
      id: nextId(db, "interaction"),
      student_db_id: student.id,
      created_at: new Date().toISOString(),
      note: body?.note || null
    };
    db.interactions.push(nextInteraction);
    writeDb(db);
    return { data: clone(nextInteraction) };
  }

  match = path.match(/^\/admin\/interactions\/(\d+)$/);
  if (method === "DELETE" && match) {
    requireInstructor(db);
    db.interactions = db.interactions.filter((interaction) => interaction.id !== Number(match[1]));
    writeDb(db);
    return { data: { status: "success" } };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)\/submissions$/);
  if (method === "GET" && match) {
    requireInstructor(db);
    const assignment = getAssignment(db, match[1]);
    if (!assignment) {
      throw apiError(404, "作业不存在");
    }
    const rows = getAssignmentSubmissions(db, assignment.id)
      .map(toSubmissionRow)
      .sort((left, right) => {
        if (left.student_id === right.student_id) {
          return right.version - left.version;
        }
        return left.student_id.localeCompare(right.student_id);
      });
    return { data: rows };
  }

  match = path.match(/^\/admin\/submissions\/(\d+)\/grade$/);
  if (method === "PATCH" && match) {
    requireInstructor(db);
    const submission = db.submissions.find((item) => item.id === Number(match[1]));
    if (!submission) {
      throw apiError(404, "提交记录不存在");
    }
    submission.score = Number(body?.score ?? 0);
    submission.is_graded = true;
    writeDb(db);
    return { data: clone(submission) };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)\/submissions\/([^/]+)\/download$/);
  if (method === "GET" && match) {
    requireInstructor(db);
    return { data: makeSingleSubmissionBlob(db, match[1], decodeURIComponent(match[2])) };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)\/export_csv$/);
  if (method === "GET" && match) {
    requireInstructor(db);
    return { data: makeAssignmentCsv(db, match[1]) };
  }

  match = path.match(/^\/admin\/assignments\/(\d+)\/download$/);
  if (method === "GET" && match) {
    requireInstructor(db);
    return { data: makeAssignmentDownloadBlob(db, match[1], query.get("mode") || "all") };
  }

  throw apiError(404, `未实现的 mock 接口：${method} ${path}`);
}

async function request(method, url, body, config = {}) {
  await delay(DEFAULT_DELAY_MS);
  if (method !== "GET") {
    await simulateUpload(config, body);
  }
  const db = readDb();
  const { path, query } = parseRequestUrl(url, config.params);
  try {
    const response = await handleRequest(db, method, path, body, query);
    return {
      status: response.status || 200,
      data: response.data,
      headers: response.headers || {}
    };
  } catch (error) {
    if (error?.response) {
      return Promise.reject(error);
    }
    return Promise.reject(apiError(500, error?.message || "请求失败"));
  }
}

const api = {
  get(url, config) {
    return request("GET", url, undefined, config);
  },
  post(url, data, config) {
    return request("POST", url, data, config);
  },
  put(url, data, config) {
    return request("PUT", url, data, config);
  },
  patch(url, data, config) {
    return request("PATCH", url, data, config);
  },
  delete(url, config) {
    return request("DELETE", url, undefined, config);
  }
};

export { api };
