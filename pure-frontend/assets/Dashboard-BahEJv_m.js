import { _ as _export_sfc, h as onMounted, E as ElMessage, c as createElementBlock, a as createVNode, w as withCtx, g as ref, r as resolveComponent, u as useRouter, j as resolveDirective, o as openBlock, b as createBaseVNode, t as toDisplayString, e as createTextVNode, F as Fragment, n as renderList, m as createBlock, l as withDirectives, k as createCommentVNode, s as ElMessageBox } from "./index-CaY54Ej1.js";
import { u as useAuthStore } from "./auth-BdUzFslU.js";
import { a as api } from "./api-Dw9z8kDD.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "nav-btns" };
const _hoisted_3 = { key: 0 };
const _hoisted_4 = { key: 1 };
const _hoisted_5 = { class: "desktop-view" };
const _hoisted_6 = { class: "interaction-count" };
const _hoisted_7 = { class: "mobile-view" };
const _hoisted_8 = { class: "card-header" };
const _hoisted_9 = { class: "student-info" };
const _hoisted_10 = { class: "student-name" };
const _hoisted_11 = { class: "student-id" };
const _hoisted_12 = { class: "card-body" };
const _hoisted_13 = { class: "submission-item" };
const _hoisted_14 = { style: { "display": "flex", "align-items": "center", "gap": "4px" } };
const _hoisted_15 = { class: "interaction-count" };
const _hoisted_16 = { class: "assignment-title" };
const _hoisted_17 = {
  key: 0,
  style: { "text-align": "center", "padding": "20px", "color": "#909399" }
};
const _sfc_main = {
  __name: "Dashboard",
  setup(__props) {
    const router = useRouter();
    const auth = useAuthStore();
    const matrix = ref([]);
    const assignments = ref([]);
    const loading = ref(false);
    const addDialogVisible = ref(false);
    const manageDialogVisible = ref(false);
    const currentStudent = ref(null);
    const newNote = ref("");
    const addLoading = ref(false);
    const manageLoading = ref(false);
    const interactionList = ref([]);
    function logout() {
      auth.logout();
      router.push("/admin/login");
    }
    function formatDate(d) {
      if (!d) return "-";
      const date = new Date(d);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const h = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${day} ${h}:${min}`;
    }
    async function quickAddInteraction(row) {
      currentStudent.value = row;
      newNote.value = "";
      addDialogVisible.value = true;
    }
    async function confirmAddInteraction() {
      addLoading.value = true;
      try {
        await api.post(`/admin/students/${currentStudent.value._dbId}/interactions`, { note: newNote.value || null });
        ElMessage.success("互动记录已添加");
        addDialogVisible.value = false;
        const idx = matrix.value.findIndex((s) => s.student_id === currentStudent.value.student_id);
        if (idx !== -1) matrix.value[idx].interaction_count++;
      } catch {
        ElMessage.error("添加失败");
      } finally {
        addLoading.value = false;
      }
    }
    async function openManageDialog(row) {
      currentStudent.value = row;
      manageDialogVisible.value = true;
      manageLoading.value = true;
      try {
        const res = await api.get(`/admin/students/${row._dbId}/interactions`);
        interactionList.value = res.data;
      } catch {
        ElMessage.error("加载互动记录失败");
      } finally {
        manageLoading.value = false;
      }
    }
    async function deleteInteraction(interactionId) {
      try {
        await ElMessageBox.confirm("确认删除该条互动记录？", "确认", { type: "warning" });
      } catch {
        return;
      }
      try {
        await api.delete(`/admin/interactions/${interactionId}`);
        interactionList.value = interactionList.value.filter((i) => i.id !== interactionId);
        const idx = matrix.value.findIndex((s) => s.student_id === currentStudent.value.student_id);
        if (idx !== -1) matrix.value[idx].interaction_count--;
        ElMessage.success("已删除");
      } catch {
        ElMessage.error("删除失败");
      }
    }
    onMounted(async () => {
      loading.value = true;
      try {
        const [dashRes, assignRes, studentsRes] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/admin/assignments"),
          api.get("/admin/students")
        ]);
        const idMap = {};
        for (const s of studentsRes.data) {
          idMap[s.student_id] = s.id;
        }
        matrix.value = dashRes.data.map((row) => ({ ...row, _dbId: idMap[row.student_id] }));
        assignments.value = assignRes.data;
      } catch {
        ElMessage.error("加载看板数据失败");
      } finally {
        loading.value = false;
      }
    });
    return (_ctx, _cache) => {
      const _component_el_button = resolveComponent("el-button");
      const _component_el_header = resolveComponent("el-header");
      const _component_el_skeleton = resolveComponent("el-skeleton");
      const _component_el_table_column = resolveComponent("el-table-column");
      const _component_el_tag = resolveComponent("el-tag");
      const _component_el_table = resolveComponent("el-table");
      const _component_el_input = resolveComponent("el-input");
      const _component_el_dialog = resolveComponent("el-dialog");
      const _component_el_main = resolveComponent("el-main");
      const _component_el_container = resolveComponent("el-container");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_el_container, null, {
          default: withCtx(() => [
            createVNode(_component_el_header, { class: "app-header" }, {
              default: withCtx(() => [
                _cache[9] || (_cache[9] = createBaseVNode("div", { class: "header-left" }, [
                  createBaseVNode("span", { class: "title" }, "信息看板")
                ], -1)),
                createBaseVNode("div", _hoisted_2, [
                  createVNode(_component_el_button, {
                    onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/admin/assignments")),
                    class: "nav-btn"
                  }, {
                    default: withCtx(() => [..._cache[6] || (_cache[6] = [
                      createBaseVNode("span", { class: "btn-text" }, "作业管理", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "📝", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_el_button, {
                    onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$router.push("/admin/students")),
                    class: "nav-btn"
                  }, {
                    default: withCtx(() => [..._cache[7] || (_cache[7] = [
                      createBaseVNode("span", { class: "btn-text" }, "学生管理", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "👥", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_el_button, {
                    type: "danger",
                    plain: "",
                    onClick: logout,
                    class: "logout-btn"
                  }, {
                    default: withCtx(() => [..._cache[8] || (_cache[8] = [
                      createBaseVNode("span", { class: "btn-text" }, "退出登录", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "🚪", -1)
                    ])]),
                    _: 1
                  })
                ])
              ]),
              _: 1
            }),
            createVNode(_component_el_main, { class: "main-content" }, {
              default: withCtx(() => [
                loading.value ? (openBlock(), createElementBlock("div", _hoisted_3, [
                  createVNode(_component_el_skeleton, {
                    rows: 8,
                    animated: ""
                  })
                ])) : (openBlock(), createElementBlock("div", _hoisted_4, [
                  createBaseVNode("div", _hoisted_5, [
                    createVNode(_component_el_table, {
                      data: matrix.value,
                      border: "",
                      style: { "width": "100%" },
                      "header-cell-style": { background: "#f5f7fa", color: "#606266" }
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_el_table_column, {
                          prop: "student_id",
                          label: "学号",
                          "min-width": "110",
                          fixed: ""
                        }),
                        createVNode(_component_el_table_column, {
                          prop: "name",
                          label: "姓名",
                          "min-width": "90",
                          fixed: ""
                        }),
                        createVNode(_component_el_table_column, {
                          label: "互动",
                          "min-width": "130",
                          align: "center"
                        }, {
                          default: withCtx(({ row }) => [
                            createBaseVNode("span", _hoisted_6, toDisplayString(row.interaction_count), 1),
                            createVNode(_component_el_button, {
                              size: "small",
                              type: "primary",
                              circle: "",
                              onClick: ($event) => quickAddInteraction(row),
                              style: { "margin-left": "4px" },
                              "data-testid": `quick-add-${row.student_id}`
                            }, {
                              default: withCtx(() => [..._cache[10] || (_cache[10] = [
                                createTextVNode("+", -1)
                              ])]),
                              _: 1
                            }, 8, ["onClick", "data-testid"]),
                            createVNode(_component_el_button, {
                              size: "small",
                              circle: "",
                              onClick: ($event) => openManageDialog(row),
                              style: { "margin-left": "4px" },
                              "data-testid": `manage-interactions-${row.student_id}`
                            }, {
                              default: withCtx(() => [..._cache[11] || (_cache[11] = [
                                createTextVNode("⋯", -1)
                              ])]),
                              _: 1
                            }, 8, ["onClick", "data-testid"])
                          ]),
                          _: 1
                        }),
                        (openBlock(true), createElementBlock(Fragment, null, renderList(assignments.value, (a) => {
                          return openBlock(), createBlock(_component_el_table_column, {
                            key: a.id,
                            label: a.title,
                            "min-width": "110",
                            align: "center"
                          }, {
                            default: withCtx(({ row }) => [
                              row.submissions[a.id] > 0 ? (openBlock(), createBlock(_component_el_tag, {
                                key: 0,
                                type: "success",
                                size: "small",
                                style: { "cursor": "pointer" },
                                onClick: ($event) => _ctx.$router.push(`/admin/assignments/${a.id}/submissions`)
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(" v" + toDisplayString(row.submissions[a.id]), 1)
                                ]),
                                _: 2
                              }, 1032, ["onClick"])) : (openBlock(), createBlock(_component_el_tag, {
                                key: 1,
                                type: "info",
                                size: "small"
                              }, {
                                default: withCtx(() => [..._cache[12] || (_cache[12] = [
                                  createTextVNode("未交", -1)
                                ])]),
                                _: 1
                              }))
                            ]),
                            _: 2
                          }, 1032, ["label"]);
                        }), 128))
                      ]),
                      _: 1
                    }, 8, ["data"])
                  ]),
                  createBaseVNode("div", _hoisted_7, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(matrix.value, (student) => {
                      return openBlock(), createElementBlock("div", {
                        class: "student-card",
                        key: student.student_id
                      }, [
                        createBaseVNode("div", _hoisted_8, [
                          createBaseVNode("div", _hoisted_9, [
                            createBaseVNode("h3", _hoisted_10, toDisplayString(student.name), 1),
                            createBaseVNode("span", _hoisted_11, toDisplayString(student.student_id), 1)
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_12, [
                          createBaseVNode("div", _hoisted_13, [
                            _cache[15] || (_cache[15] = createBaseVNode("span", { class: "assignment-title" }, "课堂互动", -1)),
                            createBaseVNode("div", _hoisted_14, [
                              createBaseVNode("span", _hoisted_15, toDisplayString(student.interaction_count) + " 次", 1),
                              createVNode(_component_el_button, {
                                size: "small",
                                type: "primary",
                                circle: "",
                                onClick: ($event) => quickAddInteraction(student),
                                "data-testid": `quick-add-${student.student_id}`
                              }, {
                                default: withCtx(() => [..._cache[13] || (_cache[13] = [
                                  createTextVNode("+", -1)
                                ])]),
                                _: 1
                              }, 8, ["onClick", "data-testid"]),
                              createVNode(_component_el_button, {
                                size: "small",
                                circle: "",
                                onClick: ($event) => openManageDialog(student),
                                "data-testid": `manage-interactions-${student.student_id}`
                              }, {
                                default: withCtx(() => [..._cache[14] || (_cache[14] = [
                                  createTextVNode("⋯", -1)
                                ])]),
                                _: 1
                              }, 8, ["onClick", "data-testid"])
                            ])
                          ]),
                          (openBlock(true), createElementBlock(Fragment, null, renderList(assignments.value, (a) => {
                            return openBlock(), createElementBlock("div", {
                              class: "submission-item",
                              key: a.id
                            }, [
                              createBaseVNode("span", _hoisted_16, toDisplayString(a.title), 1),
                              student.submissions[a.id] > 0 ? (openBlock(), createBlock(_component_el_tag, {
                                key: 0,
                                type: "success",
                                size: "small",
                                onClick: ($event) => _ctx.$router.push(`/admin/assignments/${a.id}/submissions`),
                                style: { "cursor": "pointer" }
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(" v" + toDisplayString(student.submissions[a.id]), 1)
                                ]),
                                _: 2
                              }, 1032, ["onClick"])) : (openBlock(), createBlock(_component_el_tag, {
                                key: 1,
                                type: "info",
                                size: "small"
                              }, {
                                default: withCtx(() => [..._cache[16] || (_cache[16] = [
                                  createTextVNode("未提交", -1)
                                ])]),
                                _: 1
                              }))
                            ]);
                          }), 128))
                        ])
                      ]);
                    }), 128))
                  ])
                ])),
                createVNode(_component_el_dialog, {
                  modelValue: addDialogVisible.value,
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => addDialogVisible.value = $event),
                  title: "添加互动记录",
                  width: "400px",
                  "close-on-click-modal": false
                }, {
                  footer: withCtx(() => [
                    createVNode(_component_el_button, {
                      onClick: _cache[3] || (_cache[3] = ($event) => addDialogVisible.value = false)
                    }, {
                      default: withCtx(() => [..._cache[18] || (_cache[18] = [
                        createTextVNode("取消", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_el_button, {
                      type: "primary",
                      loading: addLoading.value,
                      onClick: confirmAddInteraction
                    }, {
                      default: withCtx(() => [..._cache[19] || (_cache[19] = [
                        createTextVNode("确认添加", -1)
                      ])]),
                      _: 1
                    }, 8, ["loading"])
                  ]),
                  default: withCtx(() => {
                    var _a, _b;
                    return [
                      createBaseVNode("p", null, [
                        _cache[17] || (_cache[17] = createTextVNode("学生: ", -1)),
                        createBaseVNode("strong", null, toDisplayString((_a = currentStudent.value) == null ? void 0 : _a.name), 1),
                        createTextVNode(" (" + toDisplayString((_b = currentStudent.value) == null ? void 0 : _b.student_id) + ")", 1)
                      ]),
                      createVNode(_component_el_input, {
                        modelValue: newNote.value,
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => newNote.value = $event),
                        type: "textarea",
                        rows: 3,
                        placeholder: "备注（可选）"
                      }, null, 8, ["modelValue"])
                    ];
                  }),
                  _: 1
                }, 8, ["modelValue"]),
                createVNode(_component_el_dialog, {
                  modelValue: manageDialogVisible.value,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => manageDialogVisible.value = $event),
                  title: "互动记录管理",
                  width: "550px"
                }, {
                  default: withCtx(() => {
                    var _a, _b;
                    return [
                      createBaseVNode("p", null, [
                        _cache[20] || (_cache[20] = createTextVNode("学生: ", -1)),
                        createBaseVNode("strong", null, toDisplayString((_a = currentStudent.value) == null ? void 0 : _a.name), 1),
                        createTextVNode(" (" + toDisplayString((_b = currentStudent.value) == null ? void 0 : _b.student_id) + ")", 1)
                      ]),
                      withDirectives((openBlock(), createBlock(_component_el_table, {
                        data: interactionList.value,
                        style: { "width": "100%" },
                        "max-height": "400"
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_el_table_column, {
                            label: "时间",
                            "min-width": "160"
                          }, {
                            default: withCtx(({ row }) => [
                              createTextVNode(toDisplayString(formatDate(row.created_at)), 1)
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_table_column, {
                            prop: "note",
                            label: "备注",
                            "min-width": "180",
                            "show-overflow-tooltip": ""
                          }, {
                            default: withCtx(({ row }) => [
                              createTextVNode(toDisplayString(row.note || "-"), 1)
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_table_column, {
                            label: "操作",
                            width: "80",
                            align: "center"
                          }, {
                            default: withCtx(({ row }) => [
                              createVNode(_component_el_button, {
                                size: "small",
                                type: "danger",
                                onClick: ($event) => deleteInteraction(row.id)
                              }, {
                                default: withCtx(() => [..._cache[21] || (_cache[21] = [
                                  createTextVNode("删除", -1)
                                ])]),
                                _: 1
                              }, 8, ["onClick"])
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      }, 8, ["data"])), [
                        [_directive_loading, manageLoading.value]
                      ]),
                      !manageLoading.value && interactionList.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_17, "暂无互动记录")) : createCommentVNode("", true)
                    ];
                  }),
                  _: 1
                }, 8, ["modelValue"])
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
const Dashboard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a95bb444"]]);
export {
  Dashboard as default
};
