import { v as defineStore } from "./index-CaY54Ej1.js";
const useAuthStore = defineStore("auth", {
  state: () => ({ token: localStorage.getItem("token") || "", role: localStorage.getItem("role") || "" }),
  actions: {
    setAuth(token, role) {
      this.token = token;
      this.role = role;
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
    },
    logout() {
      this.token = "";
      this.role = "";
      localStorage.removeItem("token");
      localStorage.removeItem("role");
    }
  }
});
export {
  useAuthStore as u
};
