import { _ as _export_sfc, h as onMounted, i as onUnmounted, E as ElMessage, c as createElementBlock, a as createVNode, w as withCtx, g as ref, p as useRoute, r as resolveComponent, u as useRouter, o as openBlock, b as createBaseVNode, m as createBlock, F as Fragment, n as renderList, e as createTextVNode, t as toDisplayString } from "./index-CaY54Ej1.js";
import { a as api } from "./api-Dw9z8kDD.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { key: 0 };
const _hoisted_3 = {
  key: 2,
  class: "history-container"
};
const _hoisted_4 = { class: "card-header" };
const _hoisted_5 = { class: "version-label" };
const _hoisted_6 = { class: "sub-time" };
const _hoisted_7 = { class: "desktop-view" };
const _hoisted_8 = { class: "mobile-view" };
const _hoisted_9 = { class: "file-info" };
const _hoisted_10 = { class: "file-name" };
const _sfc_main = {
  __name: "SubmissionHistory",
  setup(__props) {
    const route = useRoute();
    useRouter();
    const history = ref([]);
    const loading = ref(false);
    const windowWidth = ref(window.innerWidth);
    const handleResize = () => {
      windowWidth.value = window.innerWidth;
    };
    onMounted(() => {
      window.addEventListener("resize", handleResize);
      loadHistory();
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
      if (windowWidth.value < 576) {
        if (year === now.getFullYear()) {
          return `${month}-${day} ${hours}:${minutes}`;
        }
        return `${year.toString().slice(2)}-${month}-${day} ${hours}:${minutes}`;
      }
      if (year === now.getFullYear()) {
        return `${month}-${day} ${hours}:${minutes}`;
      }
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    async function loadHistory() {
      loading.value = true;
      try {
        const res = await api.get(`/assignments/${route.params.id}/submissions`);
        history.value = res.data;
      } catch {
        ElMessage.error("加载历史失败");
      } finally {
        loading.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_el_button = resolveComponent("el-button");
      const _component_el_header = resolveComponent("el-header");
      const _component_el_skeleton = resolveComponent("el-skeleton");
      const _component_el_empty = resolveComponent("el-empty");
      const _component_el_table_column = resolveComponent("el-table-column");
      const _component_el_link = resolveComponent("el-link");
      const _component_el_table = resolveComponent("el-table");
      const _component_el_card = resolveComponent("el-card");
      const _component_el_main = resolveComponent("el-main");
      const _component_el_container = resolveComponent("el-container");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_el_container, null, {
          default: withCtx(() => [
            createVNode(_component_el_header, { class: "app-header" }, {
              default: withCtx(() => [
                createVNode(_component_el_button, {
                  onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/assignments")),
                  class: "back-btn"
                }, {
                  default: withCtx(() => [..._cache[1] || (_cache[1] = [
                    createBaseVNode("span", { class: "back-icon" }, "←", -1),
                    createBaseVNode("span", { class: "back-text" }, "返回列表", -1)
                  ])]),
                  _: 1
                }),
                _cache[2] || (_cache[2] = createBaseVNode("span", { class: "title" }, "提交历史", -1)),
                _cache[3] || (_cache[3] = createBaseVNode("span", { class: "spacer" }, null, -1))
              ]),
              _: 1
            }),
            createVNode(_component_el_main, { class: "main-content" }, {
              default: withCtx(() => [
                loading.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
                  createVNode(_component_el_skeleton, {
                    rows: 5,
                    animated: ""
                  })
                ])) : history.value.length === 0 ? (openBlock(), createBlock(_component_el_empty, {
                  key: 1,
                  description: "暂无提交记录",
                  class: "empty-container"
                })) : (openBlock(), createElementBlock("div", _hoisted_3, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(history.value, (sub) => {
                    return openBlock(), createBlock(_component_el_card, {
                      key: sub.version_no,
                      class: "version-card"
                    }, {
                      header: withCtx(() => [
                        createBaseVNode("div", _hoisted_4, [
                          createBaseVNode("span", _hoisted_5, "版本 v" + toDisplayString(sub.version_no), 1),
                          createBaseVNode("span", _hoisted_6, toDisplayString(formatDate(sub.submitted_at)), 1)
                        ])
                      ]),
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_7, [
                          createVNode(_component_el_table, {
                            data: sub.files,
                            size: "small"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_table_column, {
                                prop: "filename",
                                label: "文件名",
                                "show-overflow-tooltip": ""
                              }),
                              createVNode(_component_el_table_column, {
                                label: "操作",
                                width: "100",
                                align: "center"
                              }, {
                                default: withCtx(({ row }) => [
                                  createVNode(_component_el_link, {
                                    href: row.download_url,
                                    target: "_blank",
                                    type: "primary"
                                  }, {
                                    default: withCtx(() => [..._cache[4] || (_cache[4] = [
                                      createTextVNode("下载", -1)
                                    ])]),
                                    _: 1
                                  }, 8, ["href"])
                                ]),
                                _: 1
                              })
                            ]),
                            _: 1
                          }, 8, ["data"])
                        ]),
                        createBaseVNode("div", _hoisted_8, [
                          (openBlock(true), createElementBlock(Fragment, null, renderList(sub.files, (file, index) => {
                            return openBlock(), createElementBlock("div", {
                              class: "file-item",
                              key: index
                            }, [
                              createBaseVNode("div", _hoisted_9, [
                                _cache[5] || (_cache[5] = createBaseVNode("span", { class: "file-icon" }, "📄", -1)),
                                createBaseVNode("span", _hoisted_10, toDisplayString(file.filename), 1)
                              ]),
                              createVNode(_component_el_link, {
                                href: file.download_url,
                                target: "_blank",
                                type: "primary",
                                class: "download-link"
                              }, {
                                default: withCtx(() => [..._cache[6] || (_cache[6] = [
                                  createBaseVNode("span", { class: "download-text" }, "下载", -1),
                                  createBaseVNode("span", { class: "download-icon" }, "⬇", -1)
                                ])]),
                                _: 1
                              }, 8, ["href"])
                            ]);
                          }), 128))
                        ])
                      ]),
                      _: 2
                    }, 1024);
                  }), 128))
                ]))
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
const SubmissionHistory = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-27993559"]]);
export {
  SubmissionHistory as default
};
