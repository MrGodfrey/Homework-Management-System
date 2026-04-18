import { _ as _export_sfc, h as onMounted, i as onUnmounted, E as ElMessage, c as createElementBlock, a as createVNode, w as withCtx, g as ref, r as resolveComponent, u as useRouter, j as resolveDirective, o as openBlock, b as createBaseVNode, e as createTextVNode, t as toDisplayString, k as createCommentVNode, l as withDirectives, m as createBlock, F as Fragment, n as renderList } from "./index-CaY54Ej1.js";
import { u as useAuthStore } from "./auth-BdUzFslU.js";
import { a as api } from "./api-Dw9z8kDD.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { class: "user-info" };
const _hoisted_3 = {
  key: 0,
  class: "user-name"
};
const _hoisted_4 = { class: "user-id" };
const _hoisted_5 = { class: "interaction-count" };
const _hoisted_6 = {
  key: 0,
  style: { "text-align": "center", "padding": "20px", "color": "#909399" }
};
const _hoisted_7 = { class: "desktop-view" };
const _hoisted_8 = {
  key: 0,
  class: "score-text"
};
const _hoisted_9 = {
  key: 1,
  style: { "color": "#909399" }
};
const _hoisted_10 = { class: "action-buttons" };
const _hoisted_11 = { class: "mobile-view" };
const _hoisted_12 = { class: "card-header" };
const _hoisted_13 = { class: "card-title" };
const _hoisted_14 = { class: "card-body" };
const _hoisted_15 = { class: "card-row" };
const _hoisted_16 = { class: "value" };
const _hoisted_17 = { class: "card-row" };
const _hoisted_18 = { class: "card-row" };
const _hoisted_19 = {
  key: 0,
  class: "score-text"
};
const _hoisted_20 = {
  key: 1,
  style: { "color": "#909399" }
};
const _hoisted_21 = { class: "card-actions" };
const _hoisted_22 = {
  key: 0,
  class: "empty-state"
};
const _sfc_main = {
  __name: "AssignmentList",
  setup(__props) {
    const router = useRouter();
    const auth = useAuthStore();
    const assignments = ref([]);
    const userInfo = ref(null);
    const loading = ref(false);
    const interactionCount = ref(0);
    const interactionItems = ref([]);
    const showInteractionDetail = ref(false);
    const windowWidth = ref(window.innerWidth);
    const handleResize = () => {
      windowWidth.value = window.innerWidth;
    };
    onMounted(() => {
      window.addEventListener("resize", handleResize);
      loadData();
    });
    onUnmounted(() => {
      window.removeEventListener("resize", handleResize);
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
    function logout() {
      auth.logout();
      router.push("/login");
    }
    async function loadData() {
      loading.value = true;
      try {
        const userRes = await api.get("/assignments/me");
        userInfo.value = userRes.data;
        const [res, intRes] = await Promise.all([
          api.get("/assignments"),
          api.get("/assignments/interactions")
        ]);
        assignments.value = res.data;
        interactionCount.value = intRes.data.count;
        interactionItems.value = intRes.data.items;
      } catch {
        ElMessage.error("加载数据失败");
      } finally {
        loading.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_el_button = resolveComponent("el-button");
      const _component_el_header = resolveComponent("el-header");
      const _component_el_table_column = resolveComponent("el-table-column");
      const _component_el_table = resolveComponent("el-table");
      const _component_el_dialog = resolveComponent("el-dialog");
      const _component_el_tag = resolveComponent("el-tag");
      const _component_el_main = resolveComponent("el-main");
      const _component_el_container = resolveComponent("el-container");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_el_container, null, {
          default: withCtx(() => [
            createVNode(_component_el_header, { class: "app-header" }, {
              default: withCtx(() => [
                _cache[3] || (_cache[3] = createBaseVNode("span", { class: "title" }, "作业与互动", -1)),
                createBaseVNode("div", _hoisted_2, [
                  userInfo.value ? (openBlock(), createElementBlock("span", _hoisted_3, [
                    createTextVNode(toDisplayString(userInfo.value.name) + " ", 1),
                    createBaseVNode("span", _hoisted_4, "(" + toDisplayString(userInfo.value.student_id) + ")", 1)
                  ])) : createCommentVNode("", true),
                  createVNode(_component_el_button, {
                    type: "danger",
                    plain: "",
                    size: "small",
                    onClick: logout,
                    class: "logout-btn"
                  }, {
                    default: withCtx(() => [..._cache[2] || (_cache[2] = [
                      createBaseVNode("span", { class: "btn-text" }, "退出登录", -1),
                      createBaseVNode("span", { class: "btn-icon" }, "⎋", -1)
                    ])]),
                    _: 1
                  })
                ])
              ]),
              _: 1
            }),
            createVNode(_component_el_main, { class: "main-content" }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: "interaction-summary",
                  onClick: _cache[0] || (_cache[0] = ($event) => showInteractionDetail.value = true),
                  style: { "cursor": "pointer" }
                }, [
                  _cache[4] || (_cache[4] = createBaseVNode("span", { class: "interaction-label" }, "📢 课堂互动次数：", -1)),
                  createBaseVNode("span", _hoisted_5, toDisplayString(interactionCount.value), 1),
                  _cache[5] || (_cache[5] = createBaseVNode("span", { class: "interaction-hint" }, "（点击查看详情）", -1))
                ]),
                createVNode(_component_el_dialog, {
                  modelValue: showInteractionDetail.value,
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => showInteractionDetail.value = $event),
                  title: "课堂互动记录",
                  width: "500px"
                }, {
                  default: withCtx(() => [
                    createVNode(_component_el_table, {
                      data: interactionItems.value,
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
                          label: "备注",
                          "min-width": "200",
                          "show-overflow-tooltip": ""
                        }, {
                          default: withCtx(({ row }) => [
                            createTextVNode(toDisplayString(row.note || "-"), 1)
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["data"]),
                    interactionItems.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_6, "暂无互动记录")) : createCommentVNode("", true)
                  ]),
                  _: 1
                }, 8, ["modelValue"]),
                createBaseVNode("div", _hoisted_7, [
                  withDirectives((openBlock(), createBlock(_component_el_table, {
                    data: assignments.value,
                    style: { "width": "100%" }
                  }, {
                    default: withCtx(() => [
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
                        label: "提交状态",
                        "min-width": "100",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          row.status.submitted ? (openBlock(), createBlock(_component_el_tag, {
                            key: 0,
                            type: "success"
                          }, {
                            default: withCtx(() => [
                              createTextVNode("已提交 v" + toDisplayString(row.status.version_no), 1)
                            ]),
                            _: 2
                          }, 1024)) : (openBlock(), createBlock(_component_el_tag, {
                            key: 1,
                            type: "info"
                          }, {
                            default: withCtx(() => [..._cache[6] || (_cache[6] = [
                              createTextVNode("未提交", -1)
                            ])]),
                            _: 1
                          }))
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "最终得分",
                        "min-width": "90",
                        align: "center"
                      }, {
                        default: withCtx(({ row }) => [
                          row.status.is_graded ? (openBlock(), createElementBlock("span", _hoisted_8, toDisplayString(row.status.score), 1)) : (openBlock(), createElementBlock("span", _hoisted_9, toDisplayString(row.status.submitted ? "待批改" : "-"), 1))
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_table_column, {
                        label: "操作",
                        "min-width": "150"
                      }, {
                        default: withCtx(({ row }) => [
                          createBaseVNode("div", _hoisted_10, [
                            createVNode(_component_el_button, {
                              size: "small",
                              type: "primary",
                              onClick: ($event) => _ctx.$router.push(`/assignments/${row.id}`)
                            }, {
                              default: withCtx(() => [..._cache[7] || (_cache[7] = [
                                createTextVNode("提交", -1)
                              ])]),
                              _: 1
                            }, 8, ["onClick"]),
                            createVNode(_component_el_button, {
                              size: "small",
                              onClick: ($event) => _ctx.$router.push(`/assignments/${row.id}/submissions`)
                            }, {
                              default: withCtx(() => [..._cache[8] || (_cache[8] = [
                                createTextVNode("历史", -1)
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
                withDirectives((openBlock(), createElementBlock("div", _hoisted_11, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(assignments.value, (assignment) => {
                    return openBlock(), createElementBlock("div", {
                      class: "assignment-card",
                      key: assignment.id
                    }, [
                      createBaseVNode("div", _hoisted_12, [
                        createBaseVNode("h3", _hoisted_13, toDisplayString(assignment.title), 1),
                        assignment.status.submitted ? (openBlock(), createBlock(_component_el_tag, {
                          key: 0,
                          type: "success",
                          size: "small"
                        }, {
                          default: withCtx(() => [
                            createTextVNode(" v" + toDisplayString(assignment.status.version_no), 1)
                          ]),
                          _: 2
                        }, 1024)) : (openBlock(), createBlock(_component_el_tag, {
                          key: 1,
                          type: "info",
                          size: "small"
                        }, {
                          default: withCtx(() => [..._cache[9] || (_cache[9] = [
                            createTextVNode("未提交", -1)
                          ])]),
                          _: 1
                        }))
                      ]),
                      createBaseVNode("div", _hoisted_14, [
                        createBaseVNode("div", _hoisted_15, [
                          _cache[10] || (_cache[10] = createBaseVNode("span", { class: "label" }, "截止时间:", -1)),
                          createBaseVNode("span", _hoisted_16, toDisplayString(formatDate(assignment.deadline)), 1)
                        ]),
                        createBaseVNode("div", _hoisted_17, [
                          _cache[11] || (_cache[11] = createBaseVNode("span", { class: "label" }, "允许迟交:", -1)),
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
                        createBaseVNode("div", _hoisted_18, [
                          _cache[12] || (_cache[12] = createBaseVNode("span", { class: "label" }, "最终得分:", -1)),
                          assignment.status.is_graded ? (openBlock(), createElementBlock("span", _hoisted_19, toDisplayString(assignment.status.score), 1)) : (openBlock(), createElementBlock("span", _hoisted_20, toDisplayString(assignment.status.submitted ? "待批改" : "-"), 1))
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_21, [
                        createVNode(_component_el_button, {
                          size: "small",
                          type: "primary",
                          onClick: ($event) => _ctx.$router.push(`/assignments/${assignment.id}`),
                          style: { "flex": "1" }
                        }, {
                          default: withCtx(() => [..._cache[13] || (_cache[13] = [
                            createTextVNode(" 提交作业 ", -1)
                          ])]),
                          _: 1
                        }, 8, ["onClick"]),
                        createVNode(_component_el_button, {
                          size: "small",
                          onClick: ($event) => _ctx.$router.push(`/assignments/${assignment.id}/submissions`),
                          style: { "flex": "1" }
                        }, {
                          default: withCtx(() => [..._cache[14] || (_cache[14] = [
                            createTextVNode(" 提交历史 ", -1)
                          ])]),
                          _: 1
                        }, 8, ["onClick"])
                      ])
                    ]);
                  }), 128)),
                  !loading.value && assignments.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_22, [..._cache[15] || (_cache[15] = [
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
        })
      ]);
    };
  }
};
const AssignmentList = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e77899cc"]]);
export {
  AssignmentList as default
};
