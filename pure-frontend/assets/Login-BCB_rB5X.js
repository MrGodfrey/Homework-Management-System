import { _ as _export_sfc, c as createElementBlock, a as createVNode, w as withCtx, r as resolveComponent, u as useRouter, o as openBlock, b as createBaseVNode, d as withModifiers, e as createTextVNode, E as ElMessage, f as reactive, g as ref } from "./index-CaY54Ej1.js";
import { u as useAuthStore } from "./auth-BdUzFslU.js";
import { a as api } from "./api-Dw9z8kDD.js";
const _hoisted_1 = { class: "login-container" };
const _hoisted_2 = { style: { "text-align": "center", "margin-top": "8px" } };
const _sfc_main = {
  __name: "Login",
  setup(__props) {
    const router = useRouter();
    const auth = useAuthStore();
    const loading = ref(false);
    const form = reactive({ username: "", password: "" });
    async function handleLogin() {
      var _a, _b;
      const payload = {
        username: form.username || "teacher",
        password: form.password || "123456"
      };
      loading.value = true;
      try {
        const res = await api.post("/auth/instructor/login", payload);
        auth.setAuth(res.data.access_token, "instructor");
        router.push("/admin/dashboard");
      } catch (e) {
        ElMessage.error(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.detail) || "登录失败");
      } finally {
        loading.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_el_input = resolveComponent("el-input");
      const _component_el_form_item = resolveComponent("el-form-item");
      const _component_el_button = resolveComponent("el-button");
      const _component_el_form = resolveComponent("el-form");
      const _component_el_link = resolveComponent("el-link");
      const _component_el_card = resolveComponent("el-card");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_el_card, { class: "login-card" }, {
          default: withCtx(() => [
            _cache[5] || (_cache[5] = createBaseVNode("h2", null, "教师登录", -1)),
            createVNode(_component_el_form, {
              model: form,
              "label-width": "80px",
              onSubmit: withModifiers(handleLogin, ["prevent"])
            }, {
              default: withCtx(() => [
                createVNode(_component_el_form_item, { label: "用户名" }, {
                  default: withCtx(() => [
                    createVNode(_component_el_input, {
                      modelValue: form.username,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => form.username = $event),
                      placeholder: "请输入用户名"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                createVNode(_component_el_form_item, { label: "密码" }, {
                  default: withCtx(() => [
                    createVNode(_component_el_input, {
                      modelValue: form.password,
                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.password = $event),
                      type: "password",
                      placeholder: "请输入密码",
                      "show-password": ""
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                createVNode(_component_el_form_item, null, {
                  default: withCtx(() => [
                    createVNode(_component_el_button, {
                      type: "primary",
                      "native-type": "submit",
                      loading: loading.value,
                      style: { "width": "100%" }
                    }, {
                      default: withCtx(() => [..._cache[3] || (_cache[3] = [
                        createTextVNode("登录", -1)
                      ])]),
                      _: 1
                    }, 8, ["loading"])
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["model"]),
            createBaseVNode("div", _hoisted_2, [
              createVNode(_component_el_link, {
                onClick: _cache[2] || (_cache[2] = ($event) => _ctx.$router.push("/login"))
              }, {
                default: withCtx(() => [..._cache[4] || (_cache[4] = [
                  createTextVNode("学生登录入口", -1)
                ])]),
                _: 1
              })
            ])
          ]),
          _: 1
        })
      ]);
    };
  }
};
const Login = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-55b53e97"]]);
export {
  Login as default
};
