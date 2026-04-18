import { _ as _export_sfc, h as onMounted, c as createElementBlock, a as createVNode, w as withCtx, E as ElMessage, r as resolveComponent, g as ref, u as useRouter, j as resolveDirective, o as openBlock, b as createBaseVNode, e as createTextVNode, t as toDisplayString, k as createCommentVNode, l as withDirectives, m as createBlock, F as Fragment, n as renderList, d as withModifiers, s as ElMessageBox } from "./index-CaY54Ej1.js";
import { a as api } from "./api-Dw9z8kDD.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "header-left" };
const _hoisted_3 = { class: "header-center" };
const _hoisted_4 = { class: "title" };
const _hoisted_5 = {
  key: 0,
  class: "student-count"
};
const _hoisted_6 = { class: "header-actions" };
const _hoisted_7 = { class: "action-bar" };
const _hoisted_8 = { class: "desktop-view" };
const _hoisted_9 = { class: "table-actions" };
const _hoisted_10 = { class: "mobile-view" };
const _hoisted_11 = { class: "card-header" };
const _hoisted_12 = { class: "student-info" };
const _hoisted_13 = { class: "student-name" };
const _hoisted_14 = { class: "student-id-badge" };
const _hoisted_15 = { class: "student-id-label" };
const _hoisted_16 = { class: "student-password" };
const _hoisted_17 = { class: "password-value" };
const _hoisted_18 = { class: "card-actions" };
const _hoisted_19 = {
  key: 0,
  class: "empty-state"
};
const _sfc_main = {
  __name: "StudentManage",
  setup(__props) {
    useRouter();
    const students = ref([]);
    const loading = ref(false);
    const generating = ref(false);
    const downloading = ref(false);
    const dialogVisible = ref(false);
    const isEditing = ref(false);
    const submitting = ref(false);
    const editingId = ref(null);
    const dialogForm = ref({ student_id: "", name: "" });
    async function loadStudents() {
      loading.value = true;
      try {
        const res = await api.get("/admin/students");
        students.value = res.data;
      } catch {
        ElMessage.error("加载学生列表失败");
      } finally {
        loading.value = false;
      }
    }
    function openAddDialog() {
      isEditing.value = false;
      editingId.value = null;
      dialogForm.value = { student_id: "", name: "" };
      dialogVisible.value = true;
    }
    function openEditDialog(student) {
      isEditing.value = true;
      editingId.value = student.id;
      dialogForm.value = { student_id: student.student_id, name: student.name };
      dialogVisible.value = true;
    }
    async function submitDialog() {
      var _a, _b;
      const { student_id, name } = dialogForm.value;
      if (!student_id.trim() || !name.trim()) {
        ElMessage.warning("学号和姓名不能为空");
        return;
      }
      submitting.value = true;
      try {
        if (isEditing.value) {
          await api.put(`/admin/students/${editingId.value}`, { student_id: student_id.trim(), name: name.trim() });
          ElMessage.success("学生信息已更新");
        } else {
          await api.post("/admin/students", { student_id: student_id.trim(), name: name.trim() });
          ElMessage.success("学生添加成功，初始密码为学号");
        }
        dialogVisible.value = false;
        loadStudents();
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || (isEditing.value ? "更新失败" : "添加失败"));
      } finally {
        submitting.value = false;
      }
    }
    async function deleteStudent(student) {
      var _a, _b;
      try {
        await ElMessageBox.confirm(
          `确认删除学生 ${student.name}（${student.student_id}）？该操作不可撤销，学生的所有提交记录也将一并删除。`,
          "删除学生",
          { type: "warning", confirmButtonText: "继续", cancelButtonText: "取消", confirmButtonClass: "el-button--danger" }
        );
      } catch {
        return;
      }
      try {
        await ElMessageBox.confirm(
          `请再次确认：你真的要永久删除 ${student.name}（${student.student_id}）吗？`,
          "⚠️ 二次确认删除",
          { type: "error", confirmButtonText: "确认删除", cancelButtonText: "取消", confirmButtonClass: "el-button--danger" }
        );
      } catch {
        return;
      }
      try {
        await api.delete(`/admin/students/${student.id}`);
        ElMessage.success(`已删除学生 ${student.name}`);
        loadStudents();
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "删除失败");
      }
    }
    async function importCSV(file) {
      var _a, _b;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await api.post("/admin/students/import", formData);
        ElMessage.success(res.data.message);
        loadStudents();
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "导入失败");
      }
      return false;
    }
    async function generatePasswords() {
      var _a, _b, _c;
      try {
        await ElMessageBox.confirm(
          "你确定要这么做吗？每一位学生的密码都会被修改",
          "批量重新生成密码",
          { type: "warning", confirmButtonText: "确认", cancelButtonText: "取消" }
        );
      } catch (e) {
        return;
      }
      generating.value = true;
      try {
        const res = await api.post("/admin/students/generate-passwords");
        ElMessage.success(((_a = res.data) == null ? void 0 : _a.message) || "密码批量重新生成成功");
        await loadStudents();
      } catch (e) {
        console.error("生成密码失败:", e);
        ElMessage.error(((_c = (_b = e.response) == null ? void 0 : _b.data) == null ? void 0 : _c.detail) || "生成密码失败");
      } finally {
        generating.value = false;
      }
    }
    async function downloadPasswords() {
      var _a, _b, _c;
      downloading.value = true;
      try {
        const res = await api.get("/admin/students/download-passwords", { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = "passwords.csv";
        link.click();
        URL.revokeObjectURL(url);
        ElMessage.success("密码下载成功");
      } catch (e) {
        console.error("下载密码失败:", e);
        let errorMsg = "下载密码失败";
        if (((_a = e.response) == null ? void 0 : _a.data) instanceof Blob) {
          try {
            const text = await e.response.data.text();
            const json = JSON.parse(text);
            errorMsg = json.detail || errorMsg;
          } catch {
          }
        } else if ((_c = (_b = e.response) == null ? void 0 : _b.data) == null ? void 0 : _c.detail) {
          errorMsg = e.response.data.detail;
        }
        ElMessage.error(errorMsg);
      } finally {
        downloading.value = false;
      }
    }
    async function resetPassword(student) {
      var _a, _b;
      try {
        await ElMessageBox.confirm(
          `确认重置 ${student.name}（${student.student_id}）的密码？`,
          "重置密码",
          { type: "warning", confirmButtonText: "确认", cancelButtonText: "取消" }
        );
        const res = await api.post(`/admin/students/${student.id}/reset-password`);
        student.password = res.data.new_password;
        ElMessageBox.alert(
          `新密码：<b>${res.data.new_password}</b>`,
          `${student.name} 的新密码`,
          { dangerouslyUseHTMLString: true, confirmButtonText: "已记录" }
        );
      } catch (e) {
        console.error("重置密码失败:", e);
        if (e !== "cancel" && e.message !== "cancel") {
          const errorMsg = ((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "重置失败";
          ElMessage.error(errorMsg);
        }
      }
    }
    onMounted(loadStudents);
    return (_ctx, _cache) => {
      const _component_el_button = resolveComponent("el-button");
      const _component_el_upload = resolveComponent("el-upload");
      const _component_el_header = resolveComponent("el-header");
      const _component_el_table_column = resolveComponent("el-table-column");
      const _component_el_table = resolveComponent("el-table");
      const _component_el_input = resolveComponent("el-input");
      const _component_el_form_item = resolveComponent("el-form-item");
      const _component_el_form = resolveComponent("el-form");
      const _component_el_dialog = resolveComponent("el-dialog");
      const _component_el_main = resolveComponent("el-main");
      const _component_el_container = resolveComponent("el-container");
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
                    default: withCtx(() => [..._cache[6] || (_cache[6] = [
                      createBaseVNode("span", { class: "back-icon" }, "←", -1),
                      createBaseVNode("span", { class: "back-text" }, "返回看板", -1)
                    ])]),
                    _: 1
                  })
                ]),
                createBaseVNode("div", _hoisted_3, [
                  createBaseVNode("span", _hoisted_4, [
                    _cache[7] || (_cache[7] = createTextVNode("学生管理 ", -1)),
                    students.value.length > 0 ? (openBlock(), createElementBlock("span", _hoisted_5, "(" + toDisplayString(students.value.length) + "人)", 1)) : createCommentVNode("", true)
                  ])
                ]),
                createBaseVNode("div", _hoisted_6, [
                  createVNode(_component_el_upload, {
                    "before-upload": importCSV,
                    accept: ".csv",
                    "show-file-list": false,
                    "data-testid": "student-import-upload"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_button, {
                        type: "primary",
                        class: "import-btn"
                      }, {
                        default: withCtx(() => [..._cache[8] || (_cache[8] = [
                          createBaseVNode("span", { class: "btn-text" }, "导入名单", -1),
                          createBaseVNode("span", { class: "btn-icon" }, "📥", -1)
                        ])]),
                        _: 1
                      })
                    ]),
                    _: 1
                  })
                ])
              ]),
              _: 1
            }),
            createVNode(_component_el_main, { class: "main-content" }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_7, [
                  createVNode(_component_el_button, {
                    onClick: openAddDialog,
                    type: "primary",
                    class: "add-btn"
                  }, {
                    default: withCtx(() => [..._cache[9] || (_cache[9] = [
                      createBaseVNode("span", { class: "btn-text" }, "添加学生", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "➕", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_el_button, {
                    onClick: generatePasswords,
                    loading: generating.value,
                    class: "gen-pwd-btn"
                  }, {
                    default: withCtx(() => [..._cache[10] || (_cache[10] = [
                      createBaseVNode("span", { class: "btn-text" }, "批量重新生成密码", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "🔑", -1)
                    ])]),
                    _: 1
                  }, 8, ["loading"]),
                  createVNode(_component_el_button, {
                    onClick: downloadPasswords,
                    loading: downloading.value,
                    class: "dl-pwd-btn",
                    type: "success"
                  }, {
                    default: withCtx(() => [..._cache[11] || (_cache[11] = [
                      createBaseVNode("span", { class: "btn-text" }, "下载密码", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "⬇️", -1)
                    ])]),
                    _: 1
                  }, 8, ["loading"])
                ]),
                createBaseVNode("div", _hoisted_8, [
                  withDirectives((openBlock(), createBlock(_component_el_table, {
                    data: students.value,
                    style: { "width": "100%" }
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_table_column, {
                        prop: "id",
                        label: "ID",
                        "min-width": "50"
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "student_id",
                        label: "学号",
                        "min-width": "120"
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "name",
                        label: "姓名",
                        "min-width": "100"
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "password",
                        label: "密码",
                        "min-width": "120"
                      }),
                      createVNode(_component_el_table_column, {
                        label: "操作",
                        "min-width": "240",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          createBaseVNode("div", _hoisted_9, [
                            createVNode(_component_el_button, {
                              size: "small",
                              type: "primary",
                              onClick: ($event) => openEditDialog(row)
                            }, {
                              default: withCtx(() => [..._cache[12] || (_cache[12] = [
                                createTextVNode("编辑", -1)
                              ])]),
                              _: 1
                            }, 8, ["onClick"]),
                            createVNode(_component_el_button, {
                              size: "small",
                              type: "warning",
                              onClick: ($event) => resetPassword(row)
                            }, {
                              default: withCtx(() => [..._cache[13] || (_cache[13] = [
                                createTextVNode("重置密码", -1)
                              ])]),
                              _: 1
                            }, 8, ["onClick"]),
                            createVNode(_component_el_button, {
                              size: "small",
                              type: "danger",
                              onClick: ($event) => deleteStudent(row)
                            }, {
                              default: withCtx(() => [..._cache[14] || (_cache[14] = [
                                createTextVNode("删除", -1)
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
                withDirectives((openBlock(), createElementBlock("div", _hoisted_10, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(students.value, (student) => {
                    return openBlock(), createElementBlock("div", {
                      class: "student-card",
                      key: student.id
                    }, [
                      createBaseVNode("div", _hoisted_11, [
                        createBaseVNode("div", _hoisted_12, [
                          createBaseVNode("h3", _hoisted_13, toDisplayString(student.name), 1),
                          createBaseVNode("span", _hoisted_14, toDisplayString(student.student_id), 1)
                        ]),
                        createBaseVNode("span", _hoisted_15, "#" + toDisplayString(student.id), 1)
                      ]),
                      createBaseVNode("div", _hoisted_16, [
                        _cache[15] || (_cache[15] = createBaseVNode("span", { class: "password-label" }, "密码：", -1)),
                        createBaseVNode("span", _hoisted_17, toDisplayString(student.password), 1)
                      ]),
                      createBaseVNode("div", _hoisted_18, [
                        createVNode(_component_el_button, {
                          size: "small",
                          type: "primary",
                          onClick: ($event) => openEditDialog(student)
                        }, {
                          default: withCtx(() => [..._cache[16] || (_cache[16] = [
                            createTextVNode(" 编辑 ", -1)
                          ])]),
                          _: 1
                        }, 8, ["onClick"]),
                        createVNode(_component_el_button, {
                          size: "small",
                          type: "warning",
                          onClick: ($event) => resetPassword(student)
                        }, {
                          default: withCtx(() => [..._cache[17] || (_cache[17] = [
                            createTextVNode(" 重置密码 ", -1)
                          ])]),
                          _: 1
                        }, 8, ["onClick"]),
                        createVNode(_component_el_button, {
                          size: "small",
                          type: "danger",
                          onClick: ($event) => deleteStudent(student)
                        }, {
                          default: withCtx(() => [..._cache[18] || (_cache[18] = [
                            createTextVNode(" 删除 ", -1)
                          ])]),
                          _: 1
                        }, 8, ["onClick"])
                      ])
                    ]);
                  }), 128)),
                  !loading.value && students.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_19, [..._cache[19] || (_cache[19] = [
                    createBaseVNode("p", null, "暂无学生数据", -1),
                    createBaseVNode("p", { class: "hint" }, '请使用"导入名单"或"添加学生"功能添加学生', -1)
                  ])])) : createCommentVNode("", true)
                ])), [
                  [_directive_loading, loading.value]
                ]),
                createVNode(_component_el_dialog, {
                  modelValue: dialogVisible.value,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => dialogVisible.value = $event),
                  title: isEditing.value ? "编辑学生" : "添加学生",
                  width: "400px",
                  "close-on-click-modal": false
                }, {
                  footer: withCtx(() => [
                    createVNode(_component_el_button, {
                      onClick: _cache[4] || (_cache[4] = ($event) => dialogVisible.value = false)
                    }, {
                      default: withCtx(() => [..._cache[20] || (_cache[20] = [
                        createTextVNode("取消", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_el_button, {
                      type: "primary",
                      onClick: submitDialog,
                      loading: submitting.value
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(isEditing.value ? "保存" : "添加"), 1)
                      ]),
                      _: 1
                    }, 8, ["loading"])
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_el_form, {
                      model: dialogForm.value,
                      "label-width": "80px",
                      onSubmit: _cache[3] || (_cache[3] = withModifiers(() => {
                      }, ["prevent"]))
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_el_form_item, { label: "学号" }, {
                          default: withCtx(() => [
                            createVNode(_component_el_input, {
                              modelValue: dialogForm.value.student_id,
                              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => dialogForm.value.student_id = $event),
                              placeholder: "请输入学号"
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        }),
                        createVNode(_component_el_form_item, { label: "姓名" }, {
                          default: withCtx(() => [
                            createVNode(_component_el_input, {
                              modelValue: dialogForm.value.name,
                              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => dialogForm.value.name = $event),
                              placeholder: "请输入姓名"
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["model"])
                  ]),
                  _: 1
                }, 8, ["modelValue", "title"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]);
    };
  }
};
const StudentManage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1b334b4f"]]);
export {
  StudentManage as default
};
