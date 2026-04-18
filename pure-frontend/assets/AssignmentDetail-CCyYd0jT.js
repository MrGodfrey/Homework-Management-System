import { _ as _export_sfc, h as onMounted, i as onUnmounted, E as ElMessage, c as createElementBlock, a as createVNode, w as withCtx, g as ref, p as useRoute, r as resolveComponent, u as useRouter, o as openBlock, b as createBaseVNode, m as createBlock, e as createTextVNode, t as toDisplayString, k as createCommentVNode, F as Fragment, n as renderList, q as computed } from "./index-CaY54Ej1.js";
import { a as api } from "./api-Dw9z8kDD.js";
const _hoisted_1 = { class: "page" };
const _hoisted_2 = { key: 0 };
const _hoisted_3 = { class: "card-header-content" };
const _hoisted_4 = { class: "description" };
const _hoisted_5 = { class: "attachment-list" };
const _hoisted_6 = ["onClick"];
const _hoisted_7 = { class: "upload-section" };
const _hoisted_8 = { class: "submit-button-container" };
const _sfc_main = {
  __name: "AssignmentDetail",
  setup(__props) {
    const route = useRoute();
    const router = useRouter();
    const assignment = ref(null);
    const attachments = ref([]);
    const loading = ref(false);
    const uploading = ref(false);
    const progress = ref(0);
    const fileList = ref([]);
    const windowWidth = ref(window.innerWidth);
    const handleResize = () => {
      windowWidth.value = window.innerWidth;
    };
    onMounted(() => {
      window.addEventListener("resize", handleResize);
      loadAssignment();
    });
    onUnmounted(() => {
      window.removeEventListener("resize", handleResize);
    });
    const descriptionsColumn = computed(() => {
      return windowWidth.value < 576 ? 1 : 1;
    });
    const descriptionsDirection = computed(() => {
      return windowWidth.value < 768 ? "vertical" : "horizontal";
    });
    const labelStyle = computed(() => {
      if (windowWidth.value < 576) {
        return { fontSize: "13px" };
      }
      return {};
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
    async function submitFiles() {
      var _a, _b;
      if (fileList.value.length === 0) {
        ElMessage.warning("请先选择文件");
        return;
      }
      const formData = new FormData();
      for (const f of fileList.value) {
        formData.append("files", f.raw);
      }
      uploading.value = true;
      progress.value = 0;
      try {
        const res = await api.post(`/assignments/${route.params.id}/submit`, formData, {
          onUploadProgress(e) {
            if (e.total) progress.value = Math.round(e.loaded / e.total * 100);
          }
        });
        ElMessage.success(`提交成功！版本号 v${res.data.version_no}`);
        fileList.value = [];
        router.push(`/assignments/${route.params.id}/submissions`);
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "提交失败");
      } finally {
        uploading.value = false;
      }
    }
    async function loadAssignment() {
      loading.value = true;
      try {
        const res = await api.get(`/assignments/${route.params.id}`);
        assignment.value = res.data;
        const attachmentsRes = await api.get(`/assignments/${route.params.id}/attachments`);
        attachments.value = attachmentsRes.data;
      } catch {
        ElMessage.error("加载作业详情失败");
      } finally {
        loading.value = false;
      }
    }
    async function downloadAttachment(fileId) {
      try {
        const res = await api.get(`/assignments/${route.params.id}/attachments/${fileId}/download`);
        window.open(res.data.download_url, "_blank");
      } catch (e) {
        ElMessage.error("获取下载链接失败");
      }
    }
    return (_ctx, _cache) => {
      const _component_el_button = resolveComponent("el-button");
      const _component_el_header = resolveComponent("el-header");
      const _component_el_skeleton = resolveComponent("el-skeleton");
      const _component_el_descriptions_item = resolveComponent("el-descriptions-item");
      const _component_el_tag = resolveComponent("el-tag");
      const _component_el_descriptions = resolveComponent("el-descriptions");
      const _component_el_upload = resolveComponent("el-upload");
      const _component_el_progress = resolveComponent("el-progress");
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
                  default: withCtx(() => [..._cache[2] || (_cache[2] = [
                    createBaseVNode("span", { class: "back-icon" }, "←", -1),
                    createBaseVNode("span", { class: "back-text" }, "返回列表", -1)
                  ])]),
                  _: 1
                }),
                _cache[3] || (_cache[3] = createBaseVNode("span", { class: "title" }, "提交作业", -1)),
                _cache[4] || (_cache[4] = createBaseVNode("span", { class: "spacer" }, null, -1))
              ]),
              _: 1
            }),
            createVNode(_component_el_main, { class: "main-content" }, {
              default: withCtx(() => [
                loading.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
                  createVNode(_component_el_skeleton, {
                    rows: 6,
                    animated: ""
                  })
                ])) : assignment.value ? (openBlock(), createBlock(_component_el_card, {
                  key: 1,
                  class: "detail-card"
                }, {
                  header: withCtx(() => [
                    createBaseVNode("div", _hoisted_3, [
                      createBaseVNode("h3", null, toDisplayString(assignment.value.title), 1)
                    ])
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_el_descriptions, {
                      column: descriptionsColumn.value,
                      direction: descriptionsDirection.value,
                      border: ""
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_el_descriptions_item, {
                          label: "截止时间",
                          "label-style": labelStyle.value
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(formatDate(assignment.value.deadline)), 1)
                          ]),
                          _: 1
                        }, 8, ["label-style"]),
                        createVNode(_component_el_descriptions_item, {
                          label: "允许迟交",
                          "label-style": labelStyle.value
                        }, {
                          default: withCtx(() => [
                            createVNode(_component_el_tag, {
                              type: assignment.value.allow_late ? "success" : "danger",
                              size: "small"
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(assignment.value.allow_late ? "是" : "否"), 1)
                              ]),
                              _: 1
                            }, 8, ["type"])
                          ]),
                          _: 1
                        }, 8, ["label-style"]),
                        assignment.value.file_rules ? (openBlock(), createBlock(_component_el_descriptions_item, {
                          key: 0,
                          label: "允许文件类型",
                          "label-style": labelStyle.value
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(assignment.value.file_rules), 1)
                          ]),
                          _: 1
                        }, 8, ["label-style"])) : createCommentVNode("", true),
                        assignment.value.description ? (openBlock(), createBlock(_component_el_descriptions_item, {
                          key: 1,
                          label: "作业说明",
                          "label-style": labelStyle.value
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("div", _hoisted_4, toDisplayString(assignment.value.description), 1)
                          ]),
                          _: 1
                        }, 8, ["label-style"])) : createCommentVNode("", true),
                        attachments.value && attachments.value.length > 0 ? (openBlock(), createBlock(_component_el_descriptions_item, {
                          key: 2,
                          label: "作业附件",
                          "label-style": labelStyle.value
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("ol", _hoisted_5, [
                              (openBlock(true), createElementBlock(Fragment, null, renderList(attachments.value, (file) => {
                                return openBlock(), createElementBlock("li", {
                                  key: file.id,
                                  class: "attachment-item"
                                }, [
                                  createBaseVNode("a", {
                                    href: "javascript:void(0)",
                                    onClick: ($event) => downloadAttachment(file.id),
                                    class: "attachment-link"
                                  }, toDisplayString(file.filename), 9, _hoisted_6)
                                ]);
                              }), 128))
                            ])
                          ]),
                          _: 1
                        }, 8, ["label-style"])) : createCommentVNode("", true)
                      ]),
                      _: 1
                    }, 8, ["column", "direction"]),
                    createBaseVNode("div", _hoisted_7, [
                      _cache[8] || (_cache[8] = createBaseVNode("h4", null, "上传文件", -1)),
                      createVNode(_component_el_upload, {
                        "file-list": fileList.value,
                        "onUpdate:fileList": _cache[1] || (_cache[1] = ($event) => fileList.value = $event),
                        multiple: "",
                        "auto-upload": false,
                        class: "upload-container",
                        "data-testid": "student-assignment-upload"
                      }, {
                        tip: withCtx(() => [..._cache[6] || (_cache[6] = [
                          createBaseVNode("div", { class: "el-upload__tip" }, "支持多文件同时上传", -1)
                        ])]),
                        default: withCtx(() => [
                          createVNode(_component_el_button, { type: "primary" }, {
                            default: withCtx(() => [..._cache[5] || (_cache[5] = [
                              createTextVNode("选择文件", -1)
                            ])]),
                            _: 1
                          })
                        ]),
                        _: 1
                      }, 8, ["file-list"]),
                      uploading.value ? (openBlock(), createBlock(_component_el_progress, {
                        key: 0,
                        percentage: progress.value,
                        class: "upload-progress"
                      }, null, 8, ["percentage"])) : createCommentVNode("", true),
                      createBaseVNode("div", _hoisted_8, [
                        createVNode(_component_el_button, {
                          type: "success",
                          loading: uploading.value,
                          disabled: fileList.value.length === 0,
                          onClick: submitFiles,
                          class: "submit-btn"
                        }, {
                          default: withCtx(() => [..._cache[7] || (_cache[7] = [
                            createTextVNode(" 提交作业 ", -1)
                          ])]),
                          _: 1
                        }, 8, ["loading", "disabled"])
                      ])
                    ])
                  ]),
                  _: 1
                })) : createCommentVNode("", true)
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
const AssignmentDetail = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f8d5ff03"]]);
export {
  AssignmentDetail as default
};
