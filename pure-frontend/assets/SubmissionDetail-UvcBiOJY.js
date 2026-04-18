import { _ as _export_sfc, h as onMounted, i as onUnmounted, E as ElMessage, c as createElementBlock, a as createVNode, w as withCtx, g as ref, p as useRoute, r as resolveComponent, q as computed, u as useRouter, j as resolveDirective, o as openBlock, b as createBaseVNode, l as withDirectives, m as createBlock, e as createTextVNode, t as toDisplayString, F as Fragment, n as renderList, f as reactive } from "./index-CaY54Ej1.js";
import { a as api } from "./api-Dw9z8kDD.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "header-left" };
const _hoisted_3 = { class: "header-actions" };
const _hoisted_4 = { class: "desktop-view" };
const _hoisted_5 = { class: "expand-content" };
const _hoisted_6 = { class: "action-buttons" };
const _hoisted_7 = { class: "mobile-view" };
const _hoisted_8 = { class: "card-header" };
const _hoisted_9 = { class: "student-info" };
const _hoisted_10 = { class: "student-name" };
const _hoisted_11 = { class: "student-id" };
const _hoisted_12 = { class: "version-count" };
const _hoisted_13 = { class: "versions-list" };
const _hoisted_14 = { class: "version-header" };
const _hoisted_15 = { class: "version-badge" };
const _hoisted_16 = { class: "version-time" };
const _hoisted_17 = { class: "version-actions" };
const _sfc_main = {
  __name: "SubmissionDetail",
  setup(__props) {
    const route = useRoute();
    useRouter();
    const submissions = ref([]);
    const loading = ref(false);
    const downloading = ref(null);
    const downloadingSingle = ref(null);
    const exporting = ref(false);
    const gradeDialogVisible = ref(false);
    const grading = ref(false);
    const currentStudent = ref(null);
    const gradeForm = reactive({ score: 85 });
    const tableRef = ref(null);
    function toggleExpand(row) {
      var _a;
      (_a = tableRef.value) == null ? void 0 : _a.toggleRowExpansion(row);
    }
    const groupedSubmissions = computed(() => {
      const groups = {};
      submissions.value.forEach((sub) => {
        const key = `${sub.student_id}_${sub.student_name}`;
        if (!groups[key]) {
          groups[key] = {
            student_id: sub.student_id,
            student_name: sub.student_name,
            submissions: []
          };
        }
        groups[key].submissions.push(sub);
      });
      return Object.values(groups).map((group) => {
        group.submissions.sort((a, b) => b.version - a.version);
        const latest = group.submissions[0];
        const allGraded = group.submissions.every((s) => s.is_graded);
        const someGraded = group.submissions.some((s) => s.is_graded);
        const lastGraded = group.submissions.find((s) => s.is_graded);
        const hasNewUngraded = lastGraded && !latest.is_graded;
        return {
          ...group,
          latestVersion: latest.version,
          latestTime: latest.time,
          latestGraded: !!lastGraded,
          latestScore: lastGraded ? lastGraded.score : null,
          hasNewUngraded,
          allGraded,
          someGraded
        };
      }).sort((a, b) => {
        return a.student_id.localeCompare(b.student_id);
      });
    });
    const windowWidth = ref(window.innerWidth);
    const handleResize = () => {
      windowWidth.value = window.innerWidth;
    };
    onMounted(() => {
      window.addEventListener("resize", handleResize);
      loadSubmissions();
    });
    onUnmounted(() => {
      window.removeEventListener("resize", handleResize);
    });
    const dialogWidth = computed(() => {
      if (windowWidth.value < 576) return "95%";
      if (windowWidth.value < 768) return "90%";
      return "480px";
    });
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
    function adjustScore(delta) {
      const newScore = (gradeForm.score || 85) + delta;
      gradeForm.score = Math.max(0, Math.min(100, newScore));
    }
    function openGradeDialog(row) {
      currentStudent.value = row;
      gradeForm.score = row.score || 85;
      gradeDialogVisible.value = true;
    }
    async function submitGrade() {
      var _a, _b;
      grading.value = true;
      try {
        await api.patch(`/admin/submissions/${currentStudent.value.id}/grade`, {
          score: gradeForm.score
        });
        ElMessage.success("评分成功");
        gradeDialogVisible.value = false;
        loadSubmissions();
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "评分失败");
      } finally {
        grading.value = false;
      }
    }
    async function downloadSingle(row) {
      downloadingSingle.value = row.id;
      try {
        const res = await api.get(`/admin/assignments/${route.params.id}/submissions/${row.student_id}/download`, {
          responseType: "blob"
        });
        const url = URL.createObjectURL(res.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `HW${route.params.id}_${row.student_id}_${row.student_name}.zip`;
        link.click();
        URL.revokeObjectURL(url);
        ElMessage.success("下载成功");
      } catch {
        ElMessage.error("下载失败");
      } finally {
        downloadingSingle.value = null;
      }
    }
    async function exportCSV() {
      exporting.value = true;
      try {
        const res = await api.get(`/admin/assignments/${route.params.id}/export_csv`, {
          responseType: "blob"
        });
        const url = URL.createObjectURL(res.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `assignment_${route.params.id}_grades.csv`;
        link.click();
        URL.revokeObjectURL(url);
        ElMessage.success("导出成功");
      } catch {
        ElMessage.error("导出失败");
      } finally {
        exporting.value = false;
      }
    }
    async function downloadZip(mode) {
      downloading.value = mode;
      try {
        const res = await api.get(`/admin/assignments/${route.params.id}/download`, {
          params: { mode },
          responseType: "blob"
        });
        const url = URL.createObjectURL(res.data);
        const link = document.createElement("a");
        link.href = url;
        const filename = mode === "latest" ? `HW${route.params.id}_latest_only.zip` : `HW${route.params.id}_all_versions.zip`;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        ElMessage.error("下载失败");
      } finally {
        downloading.value = null;
      }
    }
    async function loadSubmissions() {
      loading.value = true;
      try {
        const res = await api.get(`/admin/assignments/${route.params.id}/submissions`);
        submissions.value = res.data;
      } catch {
        ElMessage.error("加载提交列表失败");
      } finally {
        loading.value = false;
      }
    }
    onMounted(loadSubmissions);
    return (_ctx, _cache) => {
      const _component_el_button = resolveComponent("el-button");
      const _component_el_header = resolveComponent("el-header");
      const _component_el_table_column = resolveComponent("el-table-column");
      const _component_el_tag = resolveComponent("el-tag");
      const _component_el_table = resolveComponent("el-table");
      const _component_el_tooltip = resolveComponent("el-tooltip");
      const _component_el_main = resolveComponent("el-main");
      const _component_el_container = resolveComponent("el-container");
      const _component_el_form_item = resolveComponent("el-form-item");
      const _component_el_input_number = resolveComponent("el-input-number");
      const _component_el_button_group = resolveComponent("el-button-group");
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
                    onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/admin/assignments")),
                    class: "back-btn"
                  }, {
                    default: withCtx(() => [..._cache[10] || (_cache[10] = [
                      createBaseVNode("span", { class: "back-icon" }, "←", -1),
                      createBaseVNode("span", { class: "back-text" }, "返回作业管理", -1)
                    ])]),
                    _: 1
                  })
                ]),
                _cache[14] || (_cache[14] = createBaseVNode("div", { class: "header-center" }, [
                  createBaseVNode("span", { class: "title" }, "提交详情")
                ], -1)),
                createBaseVNode("div", _hoisted_3, [
                  createVNode(_component_el_button, {
                    onClick: exportCSV,
                    loading: exporting.value,
                    size: "small"
                  }, {
                    default: withCtx(() => [..._cache[11] || (_cache[11] = [
                      createBaseVNode("span", { class: "btn-text" }, "导出CSV", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "📊", -1)
                    ])]),
                    _: 1
                  }, 8, ["loading"]),
                  createVNode(_component_el_button, {
                    onClick: _cache[1] || (_cache[1] = ($event) => downloadZip("latest")),
                    loading: downloading.value === "latest",
                    size: "small"
                  }, {
                    default: withCtx(() => [..._cache[12] || (_cache[12] = [
                      createBaseVNode("span", { class: "btn-text" }, "最新版", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "📄", -1)
                    ])]),
                    _: 1
                  }, 8, ["loading"]),
                  createVNode(_component_el_button, {
                    type: "primary",
                    onClick: _cache[2] || (_cache[2] = ($event) => downloadZip("all")),
                    loading: downloading.value === "all",
                    size: "small"
                  }, {
                    default: withCtx(() => [..._cache[13] || (_cache[13] = [
                      createBaseVNode("span", { class: "btn-text" }, "全部版本", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "📦", -1)
                    ])]),
                    _: 1
                  }, 8, ["loading"])
                ])
              ]),
              _: 1
            }),
            createVNode(_component_el_main, { class: "main-content" }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_4, [
                  withDirectives((openBlock(), createBlock(_component_el_table, {
                    ref_key: "tableRef",
                    ref: tableRef,
                    data: groupedSubmissions.value,
                    style: { "width": "100%" },
                    onRowClick: toggleExpand,
                    "row-class-name": "clickable-row"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_table_column, { type: "expand" }, {
                        default: withCtx(({ row }) => [
                          createBaseVNode("div", _hoisted_5, [
                            createVNode(_component_el_table, {
                              data: row.submissions,
                              style: { "width": "100%" }
                            }, {
                              default: withCtx(() => [
                                createVNode(_component_el_table_column, {
                                  prop: "id",
                                  label: "ID",
                                  width: "80"
                                }),
                                createVNode(_component_el_table_column, {
                                  label: "版本",
                                  width: "80",
                                  align: "center"
                                }, {
                                  default: withCtx(({ row: sub }) => [
                                    createTextVNode("v" + toDisplayString(sub.version), 1)
                                  ]),
                                  _: 1
                                }),
                                createVNode(_component_el_table_column, {
                                  label: "提交时间",
                                  "min-width": "150"
                                }, {
                                  default: withCtx(({ row: sub }) => [
                                    createTextVNode(toDisplayString(formatDate(sub.time)), 1)
                                  ]),
                                  _: 1
                                }),
                                createVNode(_component_el_table_column, {
                                  label: "分数",
                                  width: "120",
                                  align: "center"
                                }, {
                                  default: withCtx(({ row: sub }) => [
                                    sub.is_graded ? (openBlock(), createBlock(_component_el_tag, {
                                      key: 0,
                                      type: "success",
                                      size: "small"
                                    }, {
                                      default: withCtx(() => [
                                        createTextVNode(toDisplayString(sub.score) + "分", 1)
                                      ]),
                                      _: 2
                                    }, 1024)) : (openBlock(), createBlock(_component_el_tag, {
                                      key: 1,
                                      type: "info",
                                      size: "small"
                                    }, {
                                      default: withCtx(() => [..._cache[15] || (_cache[15] = [
                                        createTextVNode("待评分", -1)
                                      ])]),
                                      _: 1
                                    }))
                                  ]),
                                  _: 1
                                }),
                                createVNode(_component_el_table_column, {
                                  label: "操作",
                                  width: "180",
                                  align: "center"
                                }, {
                                  default: withCtx(({ row: sub }) => [
                                    createBaseVNode("div", _hoisted_6, [
                                      createVNode(_component_el_button, {
                                        size: "small",
                                        onClick: ($event) => downloadSingle(sub),
                                        loading: downloadingSingle.value === sub.id
                                      }, {
                                        default: withCtx(() => [..._cache[16] || (_cache[16] = [
                                          createTextVNode(" 下载 ", -1)
                                        ])]),
                                        _: 1
                                      }, 8, ["onClick", "loading"]),
                                      createVNode(_component_el_button, {
                                        size: "small",
                                        type: "primary",
                                        onClick: ($event) => openGradeDialog(sub)
                                      }, {
                                        default: withCtx(() => [..._cache[17] || (_cache[17] = [
                                          createTextVNode(" 评分 ", -1)
                                        ])]),
                                        _: 1
                                      }, 8, ["onClick"])
                                    ])
                                  ]),
                                  _: 1
                                })
                              ]),
                              _: 1
                            }, 8, ["data"])
                          ])
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "student_id",
                        label: "学号",
                        "min-width": "110"
                      }),
                      createVNode(_component_el_table_column, {
                        prop: "student_name",
                        label: "姓名",
                        "min-width": "90"
                      }),
                      createVNode(_component_el_table_column, {
                        label: "提交次数",
                        "min-width": "90",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          createTextVNode(toDisplayString(row.submissions.length) + " 次", 1)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "最新版本",
                        "min-width": "80",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          createTextVNode("v" + toDisplayString(row.latestVersion), 1)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "最新时间",
                        "min-width": "140"
                      }, {
                        default: withCtx(({ row }) => [
                          createTextVNode(toDisplayString(formatDate(row.latestTime)), 1)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "最新分数",
                        "min-width": "120",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          row.latestGraded && row.hasNewUngraded ? (openBlock(), createBlock(_component_el_tooltip, {
                            key: 0,
                            content: "学生有新版本，需要进行更新",
                            placement: "top"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_tag, {
                                type: "warning",
                                size: "small",
                                style: { "cursor": "pointer" }
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(row.latestScore) + "分", 1)
                                ]),
                                _: 2
                              }, 1024)
                            ]),
                            _: 2
                          }, 1024)) : row.latestGraded ? (openBlock(), createBlock(_component_el_tag, {
                            key: 1,
                            type: "success",
                            size: "small"
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(row.latestScore) + "分", 1)
                            ]),
                            _: 2
                          }, 1024)) : (openBlock(), createBlock(_component_el_tag, {
                            key: 2,
                            type: "info",
                            size: "small"
                          }, {
                            default: withCtx(() => [..._cache[18] || (_cache[18] = [
                              createTextVNode("待评分", -1)
                            ])]),
                            _: 1
                          }))
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 8, ["data"])), [
                    [_directive_loading, loading.value]
                  ])
                ]),
                withDirectives((openBlock(), createElementBlock("div", _hoisted_7, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(groupedSubmissions.value, (group) => {
                    return openBlock(), createElementBlock("div", {
                      class: "submission-card",
                      key: group.student_id
                    }, [
                      createBaseVNode("div", _hoisted_8, [
                        createBaseVNode("div", _hoisted_9, [
                          createBaseVNode("h3", _hoisted_10, toDisplayString(group.student_name), 1),
                          createBaseVNode("span", _hoisted_11, toDisplayString(group.student_id), 1)
                        ]),
                        createBaseVNode("div", _hoisted_12, toDisplayString(group.submissions.length) + " 次提交", 1)
                      ]),
                      createBaseVNode("div", _hoisted_13, [
                        (openBlock(true), createElementBlock(Fragment, null, renderList(group.submissions, (sub) => {
                          return openBlock(), createElementBlock("div", {
                            class: "version-item",
                            key: sub.id
                          }, [
                            createBaseVNode("div", _hoisted_14, [
                              createBaseVNode("div", _hoisted_15, "v" + toDisplayString(sub.version), 1),
                              createBaseVNode("div", _hoisted_16, toDisplayString(formatDate(sub.time)), 1),
                              sub.is_graded ? (openBlock(), createBlock(_component_el_tag, {
                                key: 0,
                                type: "success",
                                size: "small"
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(sub.score) + "分", 1)
                                ]),
                                _: 2
                              }, 1024)) : (openBlock(), createBlock(_component_el_tag, {
                                key: 1,
                                type: "info",
                                size: "small"
                              }, {
                                default: withCtx(() => [..._cache[19] || (_cache[19] = [
                                  createTextVNode("待评分", -1)
                                ])]),
                                _: 1
                              }))
                            ]),
                            createBaseVNode("div", _hoisted_17, [
                              createVNode(_component_el_button, {
                                size: "small",
                                onClick: ($event) => downloadSingle(sub),
                                loading: downloadingSingle.value === sub.id,
                                style: { "flex": "1" }
                              }, {
                                default: withCtx(() => [..._cache[20] || (_cache[20] = [
                                  createTextVNode(" 下载 ", -1)
                                ])]),
                                _: 1
                              }, 8, ["onClick", "loading"]),
                              createVNode(_component_el_button, {
                                size: "small",
                                type: "primary",
                                onClick: ($event) => openGradeDialog(sub),
                                style: { "flex": "1" }
                              }, {
                                default: withCtx(() => [..._cache[21] || (_cache[21] = [
                                  createTextVNode(" 评分 ", -1)
                                ])]),
                                _: 1
                              }, 8, ["onClick"])
                            ])
                          ]);
                        }), 128))
                      ])
                    ]);
                  }), 128))
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
          modelValue: gradeDialogVisible.value,
          "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => gradeDialogVisible.value = $event),
          title: "评分",
          width: dialogWidth.value
        }, {
          footer: withCtx(() => [
            createVNode(_component_el_button, {
              onClick: _cache[8] || (_cache[8] = ($event) => gradeDialogVisible.value = false)
            }, {
              default: withCtx(() => [..._cache[26] || (_cache[26] = [
                createTextVNode("取消", -1)
              ])]),
              _: 1
            }),
            createVNode(_component_el_button, {
              type: "primary",
              loading: grading.value,
              onClick: submitGrade
            }, {
              default: withCtx(() => [..._cache[27] || (_cache[27] = [
                createTextVNode("保存", -1)
              ])]),
              _: 1
            }, 8, ["loading"])
          ]),
          default: withCtx(() => [
            createVNode(_component_el_form, {
              model: gradeForm,
              "label-width": "80px"
            }, {
              default: withCtx(() => [
                createVNode(_component_el_form_item, { label: "学生" }, {
                  default: withCtx(() => {
                    var _a, _b;
                    return [
                      createBaseVNode("span", null, toDisplayString((_a = currentStudent.value) == null ? void 0 : _a.student_name) + " (" + toDisplayString((_b = currentStudent.value) == null ? void 0 : _b.student_id) + ")", 1)
                    ];
                  }),
                  _: 1
                }),
                createVNode(_component_el_form_item, { label: "分数" }, {
                  default: withCtx(() => [
                    createVNode(_component_el_input_number, {
                      modelValue: gradeForm.score,
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => gradeForm.score = $event),
                      min: 0,
                      max: 100,
                      step: 1,
                      style: { "width": "100%" }
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                createVNode(_component_el_form_item, { label: "快捷调整" }, {
                  default: withCtx(() => [
                    createVNode(_component_el_button_group, null, {
                      default: withCtx(() => [
                        createVNode(_component_el_button, {
                          size: "small",
                          onClick: _cache[4] || (_cache[4] = ($event) => adjustScore(-5))
                        }, {
                          default: withCtx(() => [..._cache[22] || (_cache[22] = [
                            createTextVNode("-5", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_button, {
                          size: "small",
                          onClick: _cache[5] || (_cache[5] = ($event) => adjustScore(-1))
                        }, {
                          default: withCtx(() => [..._cache[23] || (_cache[23] = [
                            createTextVNode("-1", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_button, {
                          size: "small",
                          onClick: _cache[6] || (_cache[6] = ($event) => adjustScore(1))
                        }, {
                          default: withCtx(() => [..._cache[24] || (_cache[24] = [
                            createTextVNode("+1", -1)
                          ])]),
                          _: 1
                        }),
                        createVNode(_component_el_button, {
                          size: "small",
                          onClick: _cache[7] || (_cache[7] = ($event) => adjustScore(5))
                        }, {
                          default: withCtx(() => [..._cache[25] || (_cache[25] = [
                            createTextVNode("+5", -1)
                          ])]),
                          _: 1
                        })
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["model"])
          ]),
          _: 1
        }, 8, ["modelValue", "width"])
      ]);
    };
  }
};
const SubmissionDetail = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-314de0c3"]]);
export {
  SubmissionDetail as default
};
