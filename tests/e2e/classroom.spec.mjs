import fs from "node:fs/promises";

import AdmZip from "adm-zip";
import { expect, test } from "@playwright/test";

const studentAccount = {
  studentId: "20230001",
  password: "alice-pass",
  name: "Alice",
};

const instructorAccount = {
  username: "teacher",
  password: "teacher-pass",
};

async function loginStudent(page) {
  await page.goto("/login");
  await page.getByPlaceholder("请输入学号").fill(studentAccount.studentId);
  await page.getByPlaceholder("请输入密码").fill(studentAccount.password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/assignments$/);
}

async function loginInstructor(page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("请输入用户名").fill(instructorAccount.username);
  await page.getByPlaceholder("请输入密码").fill(instructorAccount.password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
}

function tableRowByText(page, text) {
  return page.locator(".el-table__row").filter({ hasText: text }).first();
}

async function readDownloadText(download) {
  const filePath = await download.path();
  const raw = await fs.readFile(filePath, "utf8");
  return raw.replace(/^\uFEFF/, "");
}

async function readDownloadZipEntries(download) {
  const filePath = await download.path();
  const zip = new AdmZip(filePath);
  return zip.getEntries().map((entry) => entry.entryName);
}

test("website regression covers the full classroom workflow", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);

  const studentContext = await browser.newContext({ acceptDownloads: true });
  const adminContext = await browser.newContext({ acceptDownloads: true });
  const studentPage = await studentContext.newPage();
  const adminPage = await adminContext.newPage();
  const sandboxTitle = "Regression Sandbox";
  const sandboxEditedDescription = "Created and updated by the browser regression suite.";

  const invalidUpload = testInfo.outputPath("invalid-upload.txt");
  const essayMarkdown = testInfo.outputPath("essay-v2.md");
  const essayAppendix = testInfo.outputPath("appendix.pdf");
  const lateUpload = testInfo.outputPath("late-upload.txt");
  const sandboxAttachment = testInfo.outputPath("sandbox-guide.txt");
  const sandboxSubmission = testInfo.outputPath("sandbox-answer.txt");
  const importCsv = testInfo.outputPath("students-import.csv");

  await fs.writeFile(invalidUpload, "plain text should be rejected\n");
  await fs.writeFile(essayMarkdown, "# Essay draft v2\n\nUpdated content.\n");
  await fs.writeFile(essayAppendix, "%PDF-1.4\nRegression appendix\n");
  await fs.writeFile(lateUpload, "late uploads should fail\n");
  await fs.writeFile(sandboxAttachment, "Sandbox instructions for the new assignment.\n");
  await fs.writeFile(sandboxSubmission, "Sandbox answer from Alice.\n");
  await fs.writeFile(importCsv, "student_id,name\n20230003,Charlie\n20230004,Dana\n");

  await test.step("Unauthenticated users are redirected to the correct login screens", async () => {
    await studentPage.goto("/assignments");
    await expect(studentPage).toHaveURL(/\/login$/);

    await adminPage.goto("/admin/dashboard");
    await expect(adminPage).toHaveURL(/\/admin\/login$/);
  });

  await test.step("Student can browse assignments, inspect attachments, and submit new work", async () => {
    await loginStudent(studentPage);
    await expect(studentPage.getByText(studentAccount.name)).toBeVisible();
    await expect(tableRowByText(studentPage, "Essay Draft")).toBeVisible();
    await expect(tableRowByText(studentPage, "Past Due Quiz")).toBeVisible();

    await studentPage.getByText("课堂互动次数").click();
    const interactionDialog = studentPage.getByRole("dialog", { name: "课堂互动记录" });
    await expect(interactionDialog).toBeVisible();
    await expect(interactionDialog.getByText("Asked a thoughtful question")).toBeVisible();
    if (await interactionDialog.isVisible()) {
      await studentPage.keyboard.press("Escape");
    }

    const essayRow = tableRowByText(studentPage, "Essay Draft");
    await essayRow.getByRole("button", { name: "提交" }).click();
    await expect(studentPage).toHaveURL(/\/assignments\/1$/);
    await expect(studentPage.getByText("essay-guide.txt")).toBeVisible();
    await expect(studentPage.getByText(/一次提交总大小不超过 50MB/)).toBeVisible();

    const attachmentApi = studentPage.waitForResponse((response) =>
      response.url().includes("/api/assignments/1/attachments/1/download")
    );
    await studentPage.getByText("essay-guide.txt").click();
    const attachmentResponse = await attachmentApi;
    const attachmentData = await attachmentResponse.json();
    const attachmentDownload = await studentPage.request.get(attachmentData.download_url);
    expect(attachmentDownload.ok()).toBeTruthy();
    expect(await attachmentDownload.text()).toContain("Essay draft checklist");

    const uploadInput = studentPage.locator('[data-testid="student-assignment-upload"] input[type="file"]');
    await uploadInput.setInputFiles(invalidUpload);
    await studentPage.getByRole("button", { name: "提交作业" }).click();
    await expect(studentPage.getByText("File extension .txt not allowed.")).toBeVisible();

    await studentPage.reload();
    await expect(studentPage.getByText("essay-guide.txt")).toBeVisible();
    const validUploadInput = studentPage.locator('[data-testid="student-assignment-upload"] input[type="file"]');
    await validUploadInput.setInputFiles([essayMarkdown, essayAppendix]);
    await studentPage.getByRole("button", { name: "提交作业" }).click();
    await expect(studentPage).toHaveURL(/\/assignments\/1\/submissions$/);
    await expect(studentPage.getByText("版本 v2")).toBeVisible();
    await expect(studentPage.getByText("版本 v1")).toBeVisible();

    const latestHistoryLink = studentPage.locator(".version-card").first().locator("a").first();
    const latestHistoryHref = await latestHistoryLink.getAttribute("href");
    expect(latestHistoryHref).toBeTruthy();
    const latestHistoryDownload = await studentPage.request.get(latestHistoryHref);
    expect(latestHistoryDownload.ok()).toBeTruthy();

    await studentPage.goto("/assignments/2");
    const lateUploadInput = studentPage.locator('[data-testid="student-assignment-upload"] input[type="file"]');
    await lateUploadInput.setInputFiles(lateUpload);
    await studentPage.getByRole("button", { name: "提交作业" }).click();
    await expect(studentPage.getByText("Deadline has passed, late submission is not allowed")).toBeVisible();
  });

  await test.step("Instructor can manage dashboard interactions and the student roster", async () => {
    await loginInstructor(adminPage);
    await expect(tableRowByText(adminPage, studentAccount.studentId)).toContainText("v2");

    await adminPage.locator(`[data-testid="quick-add-${studentAccount.studentId}"]:visible`).click();
    const addInteractionDialog = adminPage.getByRole("dialog", { name: "添加互动记录" });
    await addInteractionDialog.getByPlaceholder("备注（可选）").fill("Regression note");
    await addInteractionDialog.getByRole("button", { name: "确认添加" }).click();
    await expect(adminPage.getByText("互动记录已添加")).toBeVisible();

    await adminPage.locator(`[data-testid="manage-interactions-${studentAccount.studentId}"]:visible`).click();
    const manageDialog = adminPage.getByRole("dialog", { name: "互动记录管理" });
    const regressionInteractionRow = manageDialog.locator(".el-table__row").filter({ hasText: "Regression note" });
    await expect(regressionInteractionRow).toBeVisible();
    const deleteInteractionButton = manageDialog
      .locator(".el-table__row")
      .filter({ hasText: "Regression note" })
      .locator(".el-button--danger")
      .first();
    await expect(deleteInteractionButton).toBeVisible();
    await deleteInteractionButton.click();
    const confirmDialog = adminPage.locator(".el-message-box");
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.locator(".el-button--primary").click();
    await expect(regressionInteractionRow).toHaveCount(0, { timeout: 5000 });
    await adminPage.keyboard.press("Escape");

    await adminPage.getByRole("button", { name: /学生管理/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/students$/);

    const importInput = adminPage.locator('[data-testid="student-import-upload"] input[type="file"]');
    await importInput.setInputFiles(importCsv);
    await expect(adminPage.getByText("Successfully imported 2 students")).toBeVisible();
    await expect(tableRowByText(adminPage, "20230003")).toBeVisible();
    await expect(tableRowByText(adminPage, "20230004")).toBeVisible();

    await adminPage.getByRole("button", { name: /添加学生/ }).click();
    const studentDialog = adminPage.getByRole("dialog", { name: "添加学生" });
    await studentDialog.getByPlaceholder("请输入学号").fill("20239999");
    await studentDialog.getByPlaceholder("请输入姓名").fill("Temp Student");
    await studentDialog.getByRole("button", { name: "添加" }).click();
    await expect(adminPage.getByText("学生添加成功，初始密码为学号")).toBeVisible();

    const tempStudentRow = tableRowByText(adminPage, "20239999");
    await tempStudentRow.getByRole("button", { name: "编辑" }).click();
    const editStudentDialog = adminPage.getByRole("dialog", { name: "编辑学生" });
    await editStudentDialog.getByPlaceholder("请输入姓名").fill("Temp Student Updated");
    await editStudentDialog.getByRole("button", { name: "保存" }).click();
    await expect(adminPage.getByText("学生信息已更新")).toBeVisible();
    await expect(tableRowByText(adminPage, "20239999")).toContainText("Temp Student Updated");

    await tableRowByText(adminPage, "20239999").getByRole("button", { name: "重置密码" }).click();
    await adminPage.getByRole("button", { name: "确认" }).click();
    const passwordAlert = adminPage.getByRole("dialog").filter({ hasText: "新密码：" });
    await expect(passwordAlert).toBeVisible();
    const passwordAlertText = await passwordAlert.textContent();
    const resetPasswordMatch = passwordAlertText.match(/[A-Za-z0-9]{8}/);
    expect(resetPasswordMatch).toBeTruthy();
    const resetPasswordValue = resetPasswordMatch[0];
    await passwordAlert.getByRole("button", { name: "已记录" }).click();

    const passwordDownloadPromise = adminPage.waitForEvent("download");
    await adminPage.getByRole("button", { name: /下载密码/ }).click();
    const passwordCsvDownload = await passwordDownloadPromise;
    const passwordCsvText = await readDownloadText(passwordCsvDownload);
    expect(passwordCsvText).toContain("20230003,Charlie");
    expect(passwordCsvText).toContain("20239999,Temp Student Updated");

    await adminPage.getByRole("button", { name: /批量重新生成密码/ }).click();
    await adminPage.getByRole("button", { name: "确认" }).click();
    await expect(adminPage.getByText("密码批量重新生成成功")).toBeVisible();
    await expect(tableRowByText(adminPage, "20239999")).not.toContainText(resetPasswordValue);

    await tableRowByText(adminPage, "20239999").getByRole("button", { name: "删除" }).click();
    await adminPage.getByRole("button", { name: "继续" }).click();
    await adminPage.getByRole("button", { name: "确认删除" }).click();
    await expect(tableRowByText(adminPage, "20239999")).toHaveCount(0);
  });

  await test.step("Instructor can create, update, attach files to, and delete assignments", async () => {
    await adminPage.goto("/admin/assignments");
    await expect(adminPage).toHaveURL(/\/admin\/assignments$/);

    await adminPage.getByRole("button", { name: /新建作业/ }).click();
    const createDialog = adminPage.getByRole("dialog", { name: "新建作业" });
    await expect(createDialog.getByText(/学生每次提交文件总大小上限：50MB/)).toBeVisible();
    await createDialog.getByPlaceholder("请输入作业名称").fill(sandboxTitle);
    await createDialog.getByPlaceholder("可选").fill("Created by the regression suite.");
    const deadlineInput = createDialog.getByPlaceholder("选择截止日期时间");
    await deadlineInput.fill("2099-12-31 23:59:00");
    await deadlineInput.press("Enter");
    await createDialog.getByPlaceholder("或手动输入，逗号分隔").fill(".txt,.md");
    await createDialog.getByRole("button", { name: "保存" }).click();
    await expect(adminPage.getByText("创建成功")).toBeVisible();

    const sandboxRow = tableRowByText(adminPage, sandboxTitle);
    await expect(sandboxRow).toBeVisible();
    await sandboxRow.getByRole("button", { name: "编辑" }).click();

    const editAssignmentDialog = adminPage.getByRole("dialog", { name: "编辑作业" });
    const attachmentInput = editAssignmentDialog.locator('[data-testid="admin-attachment-upload"] input[type="file"]');
    await attachmentInput.setInputFiles(sandboxAttachment);
    await expect(adminPage.getByText("附件上传成功")).toBeVisible();
    await expect(editAssignmentDialog.getByText("sandbox-guide.txt")).toBeVisible();

    const attachmentApi = adminPage.waitForResponse((response) =>
      response.url().includes("/attachments/") && response.url().includes("/download")
    );
    await editAssignmentDialog.locator(".attachment-item").filter({ hasText: "sandbox-guide.txt" }).getByRole("button", { name: "下载" }).click();
    const attachmentResponse = await attachmentApi;
    const attachmentData = await attachmentResponse.json();
    const attachmentDownload = await adminPage.request.get(attachmentData.download_url);
    expect(attachmentDownload.ok()).toBeTruthy();
    expect(await attachmentDownload.text()).toContain("Sandbox instructions");

    await editAssignmentDialog.getByPlaceholder("可选").fill(sandboxEditedDescription);
    await editAssignmentDialog.getByRole("button", { name: "保存" }).click();
    await expect(adminPage.getByText("修改成功")).toBeVisible();
    await expect(tableRowByText(adminPage, sandboxTitle)).toContainText(sandboxTitle);

    await studentPage.goto("/assignments");
    await expect(tableRowByText(studentPage, sandboxTitle)).toBeVisible();
    await tableRowByText(studentPage, sandboxTitle).getByRole("button", { name: "提交" }).click();
    const sandboxUploadInput = studentPage.locator('[data-testid="student-assignment-upload"] input[type="file"]');
    await sandboxUploadInput.setInputFiles(sandboxSubmission);
    await studentPage.getByRole("button", { name: "提交作业" }).click();
    await expect(studentPage.getByText("版本 v1")).toBeVisible();

    await adminPage.goto("/admin/assignments");
    await tableRowByText(adminPage, sandboxTitle).getByRole("button", { name: "编辑" }).click();
    const deleteDialog = adminPage.getByRole("dialog", { name: "编辑作业" });
    await deleteDialog.getByRole("button", { name: "删除作业" }).click();
    await adminPage.getByRole("button", { name: "确定" }).click();
    await adminPage.getByRole("button", { name: "确认删除" }).click();
    await expect(adminPage.getByText("作业删除成功")).toBeVisible();
    await expect(tableRowByText(adminPage, sandboxTitle)).toHaveCount(0);

    await studentPage.goto("/assignments");
    await expect(studentPage.getByText(sandboxTitle)).toHaveCount(0);
  });

  await test.step("Instructor can grade work and export the main reports", async () => {
    await adminPage.goto("/admin/assignments");
    await tableRowByText(adminPage, "Essay Draft").getByRole("button", { name: "查看" }).click();
    await expect(adminPage).toHaveURL(/\/admin\/assignments\/1\/submissions$/);

    const aliceGroupRow = tableRowByText(adminPage, studentAccount.studentId);
    await expect(aliceGroupRow).toContainText("88分");
    await aliceGroupRow.click();

    const expandedVersionTable = adminPage.locator(".expand-content .el-table__row");
    const latestVersionRow = expandedVersionTable.filter({ hasText: "v2" }).first();
    await expect(latestVersionRow).toBeVisible();

    const singleDownloadPromise = adminPage.waitForEvent("download");
    await latestVersionRow.getByRole("button", { name: "下载" }).click();
    const singleDownload = await singleDownloadPromise;
    const singleZipEntries = await readDownloadZipEntries(singleDownload);
    expect(singleZipEntries).toContain("essay-v2.md");
    expect(singleZipEntries).toContain("appendix.pdf");

    await latestVersionRow.getByRole("button", { name: "评分" }).click();
    const gradeDialog = adminPage.getByRole("dialog", { name: "评分" });
    const scoreInput = gradeDialog.getByRole("spinbutton");
    await scoreInput.fill("92");
    await gradeDialog.getByRole("button", { name: "保存" }).click();
    await expect(adminPage.getByText("评分成功")).toBeVisible();
    await expect(tableRowByText(adminPage, studentAccount.studentId)).toContainText("92分");

    const exportCsvPromise = adminPage.waitForEvent("download");
    await adminPage.getByRole("button", { name: /导出CSV/ }).click();
    const assignmentCsv = await exportCsvPromise;
    const assignmentCsvText = await readDownloadText(assignmentCsv);
    expect(assignmentCsvText).toContain("20230001,Alice,已交,92");

    const latestZipPromise = adminPage.waitForEvent("download");
    await adminPage.getByRole("button", { name: /最新版/ }).click();
    const latestZip = await latestZipPromise;
    const latestZipEntries = await readDownloadZipEntries(latestZip);
    expect(latestZipEntries).toContain("20230001_Alice/essay-v2.md");
    expect(latestZipEntries).toContain("20230001_Alice/appendix.pdf");
    expect(latestZipEntries).toContain("20230002_Bob/bob-notes.md");

    const allZipPromise = adminPage.waitForEvent("download");
    await adminPage.getByRole("button", { name: /全部版本/ }).click();
    const allZip = await allZipPromise;
    const allZipEntries = await readDownloadZipEntries(allZip);
    expect(allZipEntries).toContain("20230001_Alice/v1/essay-v1.pdf");
    expect(allZipEntries).toContain("20230001_Alice/v2/essay-v2.md");
    expect(allZipEntries).toContain("20230001_Alice/v2/appendix.pdf");
    expect(allZipEntries).toContain("20230002_Bob/v1/bob-notes.md");

    await adminPage.goto("/admin/assignments");
    const allGradesPromise = adminPage.waitForEvent("download");
    await adminPage.getByRole("button", { name: /导出成绩/ }).click();
    const allGradesDownload = await allGradesPromise;
    const allGradesText = await readDownloadText(allGradesDownload);
    expect(allGradesText).toContain("学号,姓名,互动次数,Essay Draft,Past Due Quiz");
    expect(allGradesText).toContain("20230001,Alice,1,92");

    const allAssignmentsPromise = adminPage.waitForEvent("download");
    await adminPage.getByRole("button", { name: /导出全部作业/ }).click();
    const allAssignmentsZip = await allAssignmentsPromise;
    const allAssignmentsEntries = await readDownloadZipEntries(allAssignmentsZip);
    expect(allAssignmentsEntries).toContain("HW1_Essay Draft/20230001_Alice/v1/essay-v1.pdf");
    expect(allAssignmentsEntries).toContain("HW1_Essay Draft/20230001_Alice/v2/essay-v2.md");
    expect(allAssignmentsEntries).toContain("HW1_Essay Draft/20230002_Bob/v1/bob-notes.md");
    expect(allAssignmentsEntries).toContain("HW2_Past Due Quiz/");
    expect(allAssignmentsEntries).toContain("HW2_Past Due Quiz/20230001_Alice/");
    expect(allAssignmentsEntries).toContain("HW2_Past Due Quiz/20230002_Bob/");
  });

  await test.step("Student sees the graded score and both roles can log out cleanly", async () => {
    await studentPage.goto("/assignments");
    const essayRow = tableRowByText(studentPage, "Essay Draft");
    await expect(essayRow).toContainText("92");
    await studentPage.getByRole("button", { name: /退出登录/ }).click();
    await expect(studentPage).toHaveURL(/\/login$/);

    await adminPage.goto("/admin/dashboard");
    await adminPage.getByRole("button", { name: /退出登录/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/login$/);
  });

  await studentContext.close();
  await adminContext.close();
});
