export type Role = 'student' | 'instructor';

export interface User {
  id: number;
  name: string;
  role: Role;
  student_id?: string; // For students
  username?: string;   // For instructors
}

export interface AttachmentFile {
  id: number;
  filename: string;
  content: string;
  mime: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string;
  allow_late: boolean;
  file_rules: string;
  attachment_files: AttachmentFile[];
}

export interface SubmissionFile {
  filename: string;
  content: string;
  mime: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_db_id: number;
  student_id: string;
  student_name: string;
  version: number;
  time: string;
  is_graded: boolean;
  score: number | null;
  files: SubmissionFile[];
}

export interface Interaction {
  id: number;
  student_db_id: number;
  created_at: string;
  note: string | null;
}

export interface Student {
  id: number;
  student_id: string;
  name: string;
  password?: string;
}

export interface Instructor {
  username: string;
  password?: string;
  name: string;
}

export interface Database {
  counters: {
    student: number;
    assignment: number;
    attachment: number;
    submission: number;
    interaction: number;
  };
  instructor: Instructor;
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  interactions: Interaction[];
}
