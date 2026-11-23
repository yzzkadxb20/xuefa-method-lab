import { api } from "./api.js";

const $ = (s) => document.querySelector(s);
const error = $("#resetError");
const btn = $("#resetBtn");

$("#resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  error.textContent = "";
  const username = $("#username").value.trim();
  const code = $("#resetCode").value.trim();
  const password = $("#password").value;
  const confirm = $("#confirmPassword").value;
  if (!username || !code) {
    error.textContent = "用户名和重置码都要填。";
    return;
  }
  if (password.length < 8) {
    error.textContent = "新密码至少 8 位。";
    return;
  }
  if (password !== confirm) {
    error.textContent = "两次新密码不一致。";
    return;
  }
  btn.disabled = true;
  btn.textContent = "重置中…";
  try {
    await api("/api/auth/reset-password", { method: "POST", body: { username, code, password }, noRedirect: true });
    error.textContent = "";
    btn.textContent = "已重置，去登录";
    setTimeout(() => { location.href = "/login.html"; }, 700);
  } catch (err) {
    error.textContent = err.message || "重置失败，请检查恢复码，或让管理员重新生成重置码。";
    btn.disabled = false;
    btn.textContent = "重置密码";
  }
});
