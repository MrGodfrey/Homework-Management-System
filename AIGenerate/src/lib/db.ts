import { Database, Student, Assignment, Submission, Interaction, AttachmentFile, Role, User } from '../types';

const STORAGE_KEY = "classroom-pure-frontend-db-v1";
const DEFAULT_DELAY_MS = 120;

function isoFromNow({ days = 0, hours = 0, minutes = 0 } = {}) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  date.setSeconds(0, 0);
  return date.toISOString();
}

function createDefaultDb(): Database {
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

export function readDb(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.students && parsed.assignments) {
        return parsed;
      }
    }
  } catch {}
  const nextDb = createDefaultDb();
  writeDb(nextDb);
  return nextDb;
}

export function writeDb(db: Database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function nextId(db: Database, type: keyof Database['counters']) {
  const value = db.counters[type];
  db.counters[type] += 1;
  return value;
}

export function delay(ms: number = DEFAULT_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
