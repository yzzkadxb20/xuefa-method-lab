import { api } from "./api.js";

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const rawNext = params.get("next") || "/";
const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

let mode = "login";

function setMode(nextMode) {
  mode = nextMode;
  const isLogin = mode === "login";
  $("#authTitle").textContent = isLogin ? "欢迎回来" : "建立你的学习档案";
  $("#authSub").textContent = isLogin
    ? "登录后，你的学习记忆会从上次停下的地方继续。"
    : "注册只需要用户名和密码；目标、方法、反馈都会跟着账号走。";
  $("#submitBtn").textContent = isLogin ? "登录" : "注册并开始";
  $("#confirmWrap").hidden = isLogin;
  $("#confirmPassword").required = !isLogin;
  $("#password").autocomplete = isLogin ? "current-password" : "new-password";
  document.querySelectorAll(".auth-tab").forEach((b) => {
    const active = b.dataset.tab === mode;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
  });
  $("#authError").textContent = "";
}

async function submit(e) {
  e.preventDefault();
  const username = $("#username").value.trim();
  const password = $("#password").value;
  const confirm = $("#confirmPassword").value;
  const error = $("#authError");
  const btn = $("#submitBtn");
  error.textContent = "";
  if (!username || !password) {
    error.textContent = "用户名和密码都要填。";
    return;
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5-]{3,24}$/.test(username)) {
    error.textContent = "用户名 3-24 位，只允许中英文、数字、下划线、短横线。";
    return;
  }
  if (password.length < 8) {
    error.textContent = "密码至少 8 位。";
    return;
  }
  if (mode === "register" && password !== confirm) {
    error.textContent = "两次密码不一致。";
    return;
  }
  btn.disabled = true;
  btn.textContent = mode === "login" ? "登录中…" : "创建中…";
  try {
    const data = mode === "login"
      ? await api("/api/auth/login", { method: "POST", body: { username, password }, noRedirect: true })
      : await api("/api/auth/register", { method: "POST", body: { username, password }, noRedirect: true });
    location.href = data?.user?.role === "admin" ? "/admin.html" : next;
  } catch (err) {
    error.textContent = err.message || "请求失败，请稍后再试。";
    btn.disabled = false;
    btn.textContent = mode === "login" ? "登录" : "注册并开始";
  }
}

document.querySelectorAll(".auth-tab").forEach((b) => {
  b.addEventListener("click", () => setMode(b.dataset.tab));
});
$("#toRegister").addEventListener("click", () => {
  setMode("register");
  $("#username").focus();
});
$("#fillUser").addEventListener("click", () => {
  setMode("login");
  $("#username").value = "demo";
  $("#password").value = "demo12345";
  $("#authError").textContent = "已填入用户演示账号，点击登录即可。";
});
$("#authForm").addEventListener("submit", submit);
document.documentElement.dataset.authReady = "1";

// already logged in? go to app/admin
api("/api/me", { noRedirect: true })
  .then((data) => {
    if (data?.user) {
      location.href = data.user.role === "admin" && next === "/" ? "/admin.html" : next;
    }
  })
  .catch(() => setMode("login"));

setMode("login");
