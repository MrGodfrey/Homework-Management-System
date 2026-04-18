import { _ as _export_sfc, h as onMounted, i as onUnmounted, x as watch, E as ElMessage, c as createElementBlock, a as createVNode, w as withCtx, g as ref, r as resolveComponent, q as computed, u as useRouter, j as resolveDirective, o as openBlock, b as createBaseVNode, t as toDisplayString, k as createCommentVNode, l as withDirectives, m as createBlock, e as createTextVNode, F as Fragment, n as renderList, f as reactive, s as ElMessageBox } from "./index-CaY54Ej1.js";
import { a as api } from "./api-Dw9z8kDD.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "header-left" };
const _hoisted_3 = { class: "header-center" };
const _hoisted_4 = {
  key: 0,
  class: "total-students"
};
const _hoisted_5 = { class: "header-actions" };
const _hoisted_6 = { class: "desktop-view" };
const _hoisted_7 = { class: "action-buttons" };
const _hoisted_8 = { class: "mobile-view" };
const _hoisted_9 = { class: "card-header" };
const _hoisted_10 = { class: "card-title" };
const _hoisted_11 = { class: "card-id" };
const _hoisted_12 = { class: "card-body" };
const _hoisted_13 = { class: "card-row" };
const _hoisted_14 = { class: "value" };
const _hoisted_15 = { class: "card-row" };
const _hoisted_16 = { class: "card-row" };
const _hoisted_17 = { class: "value stats" };
const _hoisted_18 = {
  key: 0,
  class: "card-row"
};
const _hoisted_19 = { class: "value file-rules" };
const _hoisted_20 = { class: "card-actions" };
const _hoisted_21 = {
  key: 0,
  class: "empty-state"
};
const _hoisted_22 = { style: { "width": "100%" } };
const _hoisted_23 = { key: 0 };
const _hoisted_24 = { key: 1 };
const _hoisted_25 = {
  key: 0,
  class: "attachment-list"
};
const _hoisted_26 = { class: "file-name" };
const _hoisted_27 = { class: "file-actions" };
const _hoisted_28 = {
  key: 1,
  class: "no-attachments"
};
const _hoisted_29 = { style: { "display": "flex", "justify-content": "space-between", "width": "100%" } };
const _sfc_main = {
  __name: "AssignmentManage",
  setup(__props) {
    useRouter();
    const assignments = ref([]);
    const totalStudents = ref(0);
    const loading = ref(false);
    const saving = ref(false);
    const deleting = ref(false);
    const dialogVisible = ref(false);
    const editingId = ref(null);
    const form = reactive({ title: "", description: "", deadline: null, allow_late: false, file_rules: "" });
    const selectedFormats = ref([".pdf", ".docx", ".md", ".txt", ".ipynb", ".py", ".zip"]);
    const attachmentFiles = ref([]);
    const uploadingAttachment = ref(false);
    const windowWidth = ref(window.innerWidth);
    const handleResize = () => {
      windowWidth.value = window.innerWidth;
    };
    onMounted(() => {
      window.addEventListener("resize", handleResize);
      loadAssignments();
      loadTotalStudents();
    });
    onUnmounted(() => {
      window.removeEventListener("resize", handleResize);
    });
    const dialogWidth = computed(() => {
      if (windowWidth.value < 576) return "95%";
      if (windowWidth.value < 768) return "90%";
      return "520px";
    });
    const formLabelWidth = computed(() => {
      if (windowWidth.value < 576) return "80px";
      return "100px";
    });
    watch(selectedFormats, (newVal) => {
      if (newVal.length > 0) {
        form.file_rules = newVal.join(",");
      }
    }, { deep: true });
    function formatDate(d) {
      if (!d) return "-";
      const date = new Date(d);
      const now = /* @__PURE__ */ new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      if (year === now.getFullYear()) {
        return `${month}-${day} ${hours}:${minutes}`;
      }
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    function openCreate() {
      editingId.value = null;
      attachmentFiles.value = [];
      Object.assign(form, { title: "", description: "", deadline: null, allow_late: false, file_rules: ".pdf,.docx,.md,.txt,.ipynb,.py,.zip" });
      selectedFormats.value = [".pdf", ".docx", ".md", ".txt", ".ipynb", ".py", ".zip"];
      dialogVisible.value = true;
    }
    async function openEdit(row) {
      editingId.value = row.id;
      Object.assign(form, {
        title: row.title,
        description: row.description || "",
        deadline: row.deadline ? new Date(row.deadline) : null,
        allow_late: row.allow_late,
        file_rules: row.file_rules || ""
      });
      if (row.file_rules) {
        selectedFormats.value = row.file_rules.split(",").map((s) => s.trim());
      } else {
        selectedFormats.value = [];
      }
      await loadAttachments(row.id);
      dialogVisible.value = true;
    }
    async function loadAttachments(assignmentId) {
      try {
        const res = await api.get(`/admin/assignments/${assignmentId}/with-files`);
        attachmentFiles.value = res.data.attachment_files || [];
      } catch (e) {
        console.error("Failed to load attachments:", e);
        attachmentFiles.value = [];
      }
    }
    async function handleAttachmentChange(file) {
      var _a, _b;
      if (!editingId.value) {
        ElMessage.warning("请先保存作业");
        return;
      }
      uploadingAttachment.value = true;
      try {
        const formData = new FormData();
        formData.append("file", file.raw);
        const res = await api.post(`/admin/assignments/${editingId.value}/upload-attachment`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        attachmentFiles.value.push(res.data);
        ElMessage.success("附件上传成功");
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "上传失败");
      } finally {
        uploadingAttachment.value = false;
      }
    }
    async function downloadAttachment(file) {
      try {
        const res = await api.get(`/admin/assignments/${editingId.value}/attachments/${file.id}/download`);
        window.open(res.data.download_url, "_blank");
      } catch (e) {
        ElMessage.error("获取下载链接失败");
      }
    }
    async function deleteAttachment(fileId) {
      try {
        await ElMessageBox.confirm("确定删除此附件吗？", "删除确认", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        });
        await api.delete(`/admin/assignments/${editingId.value}/attachments/${fileId}`);
        attachmentFiles.value = attachmentFiles.value.filter((f) => f.id !== fileId);
        ElMessage.success("附件删除成功");
      } catch (e) {
        if (e !== "cancel" && e !== "close") {
          ElMessage.error("删除失败");
        }
      }
    }
    async function saveAssignment() {
      var _a, _b;
      if (!form.title || !form.deadline) {
        ElMessage.warning("请填写作业名称和截止时间");
        return;
      }
      saving.value = true;
      try {
        const payload = {
          title: form.title,
          description: form.description,
          deadline: form.deadline instanceof Date ? form.deadline.toISOString() : form.deadline,
          allow_late: form.allow_late,
          file_rules: form.file_rules
        };
        if (editingId.value) {
          await api.put(`/admin/assignments/${editingId.value}`, payload);
          ElMessage.success("修改成功");
        } else {
          await api.post("/admin/assignments", payload);
          ElMessage.success("创建成功");
        }
        dialogVisible.value = false;
        loadAssignments();
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "保存失败");
      } finally {
        saving.value = false;
      }
    }
    async function exportAllGradesCSV() {
      var _a, _b;
      try {
        const res = await api.get("/admin/export_all_grades_csv", { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "all_grades.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        ElMessage.success("CSV 导出成功");
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "导出失败");
      }
    }
    async function loadAssignments() {
      loading.value = true;
      try {
        const res = await api.get("/admin/assignments");
        assignments.value = res.data;
      } catch {
        ElMessage.error("加载作业列表失败");
      } finally {
        loading.value = false;
      }
    }
    async function loadTotalStudents() {
      try {
        const res = await api.get("/admin/students");
        totalStudents.value = res.data.length;
      } catch {
      }
    }
    async function handleDelete() {
      var _a, _b;
      if (!editingId.value) return;
      try {
        await ElMessageBox.confirm(
          "你确定要删除吗？",
          "删除确认",
          {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning"
          }
        );
        deleting.value = true;
        const res = await api.delete(`/admin/assignments/${editingId.value}`);
        if (res.data.status === "confirm_required") {
          deleting.value = false;
          await ElMessageBox.confirm(
            `已有学生上传作业，请问您确认删除吗？`,
            "删除确认",
            {
              confirmButtonText: "确认删除",
              cancelButtonText: "取消",
              type: "warning",
              distinguishCancelAndClose: true
            }
          );
          deleting.value = true;
          const forceRes = await api.delete(`/admin/assignments/${editingId.value}?force=true`);
          if (forceRes.data.status === "success") {
            ElMessage.success(forceRes.data.message || "删除成功");
            dialogVisible.value = false;
            loadAssignments();
          }
        } else if (res.data.status === "success") {
          ElMessage.success(res.data.message || "删除成功");
          dialogVisible.value = false;
          loadAssignments();
        }
      } catch (error) {
        if (error === "cancel" || error === "close") {
          return;
        }
        ElMessage.error(((_b = (_a = error.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "删除失败");
      } finally {
        deleting.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_el_button = resolveComponent("el-button");
      const _component_el_header = resolveComponent("el-header");
      const _component_el_table_column = resolveComponent("el-table-column");
      const _component_el_tag = resolveComponent("el-tag");
      const _component_el_table = resolveComponent("el-table");
      const _component_el_main = resolveComponent("el-main");
      const _component_el_container = resolveComponent("el-container");
      const _component_el_input = resolveComponent("el-input");
      const _component_el_form_item = resolveComponent("el-form-item");
      const _component_el_date_picker = resolveComponent("el-date-picker");
      const _component_el_switch = resolveComponent("el-switch");
      const _component_el_checkbox = resolveComponent("el-checkbox");
      const _component_el_checkbox_group = resolveComponent("el-checkbox-group");
      const _component_el_upload = resolveComponent("el-upload");
      const _component_el_alert = resolveComponent("el-alert");
      const _component_el_form = resolveComponent("el-form");
      const _component_el_dialog = resolveComponent("el-dialog");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_el_container, null, {
          default: withCtx(() => [
            createVNode(_component_el_header, { class: "app-header" }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_2, [
                  createVNode(_component_el_button, {
                    onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/admin/dashboard")),
                    class: "back-btn"
                  }, {
                    default: withCtx(() => [..._cache[9] || (_cache[9] = [
                      createBaseVNode("span", { class: "back-icon" }, "←", -1),
                      createBaseVNode("span", { class: "back-text" }, "返回看板", -1)
                    ])]),
                    _: 1
                  })
                ]),
                createBaseVNode("div", _hoisted_3, [
                  _cache[10] || (_cache[10] = createBaseVNode("span", { class: "title" }, "作业管理", -1)),
                  totalStudents.value > 0 ? (openBlock(), createElementBlock("span", _hoisted_4, "(" + toDisplayString(totalStudents.value) + "人)", 1)) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_5, [
                  createVNode(_component_el_button, {
                    type: "success",
                    onClick: exportAllGradesCSV,
                    class: "export-btn"
                  }, {
                    default: withCtx(() => [..._cache[11] || (_cache[11] = [
                      createBaseVNode("span", { class: "btn-text" }, "导出成绩", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "📊", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_el_button, {
                    type: "primary",
                    onClick: openCreate,
                    class: "create-btn"
                  }, {
                    default: withCtx(() => [..._cache[12] || (_cache[12] = [
                      createBaseVNode("span", { class: "btn-text" }, "+ 新建作业", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "+", -1)
                    ])]),
                    _: 1
                  })
                ])
              ]),
              _: 1
            }),
            createVNode(_component_el_main, { class: "main-content" }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_6, [
                  withDirectives((openBlock(), createBlock(_component_el_table, {
                    data: assignments.value,
                    style: { "width": "100%" },
                    flexible: true
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_table_column, {
                        prop: "id",
                        label: "ID",
                        "min-width": "50"
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "title",
                        label: "作业名称",
                        "min-width": "150",
                        "show-overflow-tooltip": ""
                      }),
                      createVNode(_component_el_table_column, {
                        label: "截止时间",
                        "min-width": "140"
                      }, {
                        default: withCtx(({ row }) => [
                          createTextVNode(toDisplayString(formatDate(row.deadline)), 1)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "迟交",
                        "min-width": "60",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          createVNode(_component_el_tag, {
                            type: row.allow_late ? "success" : "danger",
                            size: "small"
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(row.allow_late ? "是" : "否"), 1)
                            ]),
                            _: 2
                          }, 1032, ["type"])
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "已提交",
                        "min-width": "70",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          createBaseVNode("span", null, toDisplayString(row.submitted_count || 0), 1)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "已评分",
                        "min-width": "70",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          createBaseVNode("span", null, toDisplayString(row.graded_count || 0), 1)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "file_rules",
                        label: "文件规则",
                        "min-width": "100",
                        "show-overflow-tooltip": ""
                      }),
                      createVNode(_component_el_table_column, {
                        label: "操作",
                        "min-width": "150"
                      }, {
                        default: withCtx(({ row }) => [
                          createBaseVNode("div", _hoisted_7, [
                            createVNode(_component_el_button, {
                              size: "small",
                              onClick: ($event) => openEdit(row)
                            }, {
                              default: withCtx(() => [..._cache[13] || (_cache[13] = [
                                createTextVNode("编辑", -1)
                              ])]),
                              _: 1
                            }, 8, ["onClick"]),
                            createVNode(_component_el_button, {
                              size: "small",
                              type: "info",
                              onClick: ($event) => _ctx.$router.push(`/admin/assignments/${row.id}/submissions`)
                            }, {
                              default: withCtx(() => [..._cache[14] || (_cache[14] = [
                                createTextVNode("查看", -1)
                              ])]),
                              _: 1
                            }, 8, ["onClick"])
                          ])
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 8, ["data"])), [
                    [_directive_loading, loading.value]
                  ])
                ]),
                withDirectives((openBlock(), createElementBlock("div", _hoisted_8, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(assignments.value, (assignment) => {
                    return openBlock(), createElementBlock("div", {
                      class: "assignment-card",
                      key: assignment.id
                    }, [
                      createBaseVNode("div", _hoisted_9, [
                        createBaseVNode("h3", _hoisted_10, toDisplayString(assignment.title), 1),
                        createBaseVNode("span", _hoisted_11, "#" + toDisplayString(assignment.id), 1)
                      ]),
                      createBaseVNode("div", _hoisted_12, [
                        createBaseVNode("div", _hoisted_13, [
                          _cache[15] || (_cache[15] = createBaseVNode("span", { class: "label" }, "截止时间:", -1)),
                          createBaseVNode("span", _hoisted_14, toDisplayString(formatDate(assignment.deadline)), 1)
                        ]),
                        createBaseVNode("div", _hoisted_15, [
                          _cache[16] || (_cache[16] = createBaseVNode("span", { class: "label" }, "允许迟交:", -1)),
                          createVNode(_component_el_tag, {
                            type: assignment.allow_late ? "success" : "danger",
                            size: "small"
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(assignment.allow_late ? "是" : "否"), 1)
                            ]),
                            _: 2
                          }, 1032, ["type"])
                        ]),
                        createBaseVNode("div", _hoisted_16, [
                          _cache[19] || (_cache[19] = createBaseVNode("span", { class: "label" }, "提交情况:", -1)),
                          createBaseVNode("span", _hoisted_17, [
                            _cache[17] || (_cache[17] = createTextVNode(" 已提交 ", -1)),
                            createBaseVNode("strong", null, toDisplayString(assignment.submitted_count || 0), 1),
                            _cache[18] || (_cache[18] = createTextVNode(" / 已评分 ", -1)),
                            createBaseVNode("strong", null, toDisplayString(assignment.graded_count || 0), 1)
                          ])
                        ]),
                        assignment.file_rules ? (openBlock(), createElementBlock("div", _hoisted_18, [
                          _cache[20] || (_cache[20] = createBaseVNode("span", { class: "label" }, "文件规则:", -1)),
                          createBaseVNode("span", _hoisted_19, toDisplayString(assignment.file_rules), 1)
                        ])) : createCommentVNode("", true)
                      ]),
                      createBaseVNode("div", _hoisted_20, [
                        createVNode(_component_el_button, {
                          size: "small",
                          onClick: ($event) => openEdit(assignment),
                          style: { "flex": "1" }
                        }, {
                          default: withCtx(() => [..._cache[21] || (_cache[21] = [
                            createTextVNode("编辑", -1)
                          ])]),
                          _: 1
                        }, 8, ["onClick"]),
                        createVNode(_component_el_button, {
                          size: "small",
                          type: "info",
                          onClick: ($event) => _ctx.$router.push(`/admin/assignments/${assignment.id}/submissions`),
                          style: { "flex": "1" }
                        }, {
                          default: withCtx(() => [..._cache[22] || (_cache[22] = [
                            createTextVNode("查看提交", -1)
                          ])]),
                          _: 1
                        }, 8, ["onClick"])
                      ])
                    ]);
                  }), 128)),
                  !loading.value && assignments.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_21, [..._cache[23] || (_cache[23] = [
                    createBaseVNode("p", null, "暂无作业", -1)
                  ])])) : createCommentVNode("", true)
                ])), [
                  [_directive_loading, loading.value]
                ])
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        createVNode(_component_el_dialog, {
          modelValue: dialogVisible.value,
          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => dialogVisible.value = $event),
          title: editingId.value ? "编辑作业" : "新建作业",
          width: dialogWidth.value,
          class: "assignment-dialog"
        }, {
          footer: withCtx(() => [
            createBaseVNode("div", _hoisted_29, [
              createBaseVNode("div", null, [
                editingId.value ? (openBlock(), createBlock(_component_el_button, {
                  key: 0,
                  type: "danger",
                  plain: "",
                  loading: deleting.value,
                  onClick: handleDelete
                }, {
                  default: withCtx(() => [..._cache[33] || (_cache[33] = [
                    createTextVNode("删除作业", -1)
                  ])]),
                  _: 1
                }, 8, ["loading"])) : createCommentVNode("", true)
              ]),
              createBaseVNode("div", null, [
                createVNode(_component_el_button, {
                  onClick: _cache[7] || (_cache[7] = ($event) => dialogVisible.value = false)
                }, {
                  default: withCtx(() => [..._cache[34] || (_cache[34] = [
                    createTextVNode("取消", -1)
                  ])]),
                  _: 1
                }),
                createVNode(_component_el_button, {
                  type: "primary",
                  loading: saving.value,
                  onClick: saveAssignment
                }, {
                  default: withCtx(() => [..._cache[35] || (_cache[35] = [
                    createTextVNode("保存", -1)
                  ])]),
                  _: 1
                }, 8, ["loading"])
              ])
            ])
          ]),
          default: withCtx(() => [
            createVNode(_component_el_form, {
              model: form,
              "label-width": formLabelWidth.value
            }, {
              default: withCtx(() => [
                createVNode(_component_el_form_item, {
                  label: "作业名称",
                  required: ""
                }, {
                  default: withCtx(() => [
                    createVNode(_component_el_input, {
                      modelValue: form.title,
                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.title = $event),
                      placeholder: "请输入作业名称"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                createVNode(_component_el_form_item, { label: "作业说明" }, {
                  default: withCtx(() => [
                    createVNode(_component_el_input, {
                      modelValue: form.description,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => form.description = $event),
                      type: "textarea",
                      rows: 3,
                      placeholder: "可选"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                createVNode(_component_el_form_item, {
                  label: "截止时间",
                  required: ""
                }, {
                  default: withCtx(() => [
                    createVNode(_component_el_date_picker, {
                      modelValue: form.deadline,
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => form.deadline = $event),
                      type: "datetime",
                      placeholder: "选择截止日期时间",
                      style: { "width": "100%" }
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                createVNode(_component_el_form_item, { label: "允许迟交" }, {
                  default: withCtx(() => [
                    createVNode(_component_el_switch, {
                      modelValue: form.allow_late,
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => form.allow_late = $event)
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                createVNode(_component_el_form_item, { label: "允许格式" }, {
                  default: withCtx(() => [
                    createVNode(_component_el_checkbox_group, {
                      modelValue: selectedFormats.value,
                      "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => selectedFormats.value = $event),
                      class: "format-checkboxes"
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_el_checkbox, { label: ".pdf" }, {
                          default: withCtx(() => [..._cache[24] || (_cache[24] = [
                            createTextVNode("PDF", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_checkbox, { label: ".docx" }, {
                          default: withCtx(() => [..._cache[25] || (_cache[25] = [
                            createTextVNode("Word", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_checkbox, { label: ".md" }, {
                          default: withCtx(() => [..._cache[26] || (_cache[26] = [
                            createTextVNode("Markdown", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_checkbox, { label: ".txt" }, {
                          default: withCtx(() => [..._cache[27] || (_cache[27] = [
                            createTextVNode("文本", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_checkbox, { label: ".ipynb" }, {
                          default: withCtx(() => [..._cache[28] || (_cache[28] = [
                            createTextVNode("Jupyter", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_checkbox, { label: ".py" }, {
                          default: withCtx(() => [..._cache[29] || (_cache[29] = [
                            createTextVNode("Python", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_checkbox, { label: ".zip" }, {
                          default: withCtx(() => [..._cache[30] || (_cache[30] = [
                            createTextVNode("压缩包", -1)
                          ])]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    createVNode(_component_el_input, {
                      modelValue: form.file_rules,
                      "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => form.file_rules = $event),
                      placeholder: "或手动输入，逗号分隔",
                      style: { "margin-top": "8px" }
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                editingId.value ? (openBlock(), createBlock(_component_el_form_item, {
                  key: 0,
                  label: "作业附件"
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_22, [
                      createVNode(_component_el_upload, {
                        "auto-upload": false,
                        "on-change": handleAttachmentChange,
                        "show-file-list": false,
                        accept: "*",
                        style: { "margin-bottom": "10px" },
                        "data-testid": "admin-attachment-upload"
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_el_button, {
                            size: "small",
                            type: "primary",
                            loading: uploadingAttachment.value
                          }, {
                            default: withCtx(() => [
                              !uploadingAttachment.value ? (openBlock(), createElementBlock("span", _hoisted_23, "上传附件")) : (openBlock(), createElementBlock("span", _hoisted_24, "上传中..."))
                            ]),
                            _: 1
                          }, 8, ["loading"])
                        ]),
                        _: 1
                      }),
                      attachmentFiles.value.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_25, [
                        (openBlock(true), createElementBlock(Fragment, null, renderList(attachmentFiles.value, (file) => {
                          return openBlock(), createElementBlock("div", {
                            key: file.id,
                            class: "attachment-item"
                          }, [
                            createBaseVNode("span", _hoisted_26, "📎 " + toDisplayString(file.filename), 1),
                            createBaseVNode("div", _hoisted_27, [
                              createVNode(_component_el_button, {
                                size: "small",
                                link: "",
                                onClick: ($event) => downloadAttachment(file)
                              }, {
                                default: withCtx(() => [..._cache[31] || (_cache[31] = [
                                  createTextVNode("下载", -1)
                                ])]),
                                _: 1
                              }, 8, ["onClick"]),
                              createVNode(_component_el_button, {
                                size: "small",
                                link: "",
                                type: "danger",
                                onClick: ($event) => deleteAttachment(file.id)
                              }, {
                                default: withCtx(() => [..._cache[32] || (_cache[32] = [
                                  createTextVNode("删除", -1)
                                ])]),
                                _: 1
                              }, 8, ["onClick"])
                            ])
                          ]);
                        }), 128))
                      ])) : (openBlock(), createElementBlock("div", _hoisted_28, "暂无附件"))
                    ])
                  ]),
                  _: 1
                })) : createCommentVNode("", true),
                !editingId.value ? (openBlock(), createBlock(_component_el_alert, {
                  key: 1,
                  title: "提示：请先保存作业后，再上传附件文件",
                  type: "info",
                  closable: false,
                  style: { "margin-bottom": "10px" }
                })) : createCommentVNode("", true)
              ]),
              _: 1
            }, 8, ["model", "label-width"])
          ]),
          _: 1
        }, 8, ["modelValue", "title", "width"])
      ]);
    };
  }
};
const AssignmentManage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-656237b6"]]);
export {
  AssignmentManage as default
};
