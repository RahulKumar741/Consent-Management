/* Simple portal auth demo (OTP = 1234) with tabs, forms, lockout, and toasts */
(() => {
  const DEMO_OTP = "1234";
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MIN = 5;
  const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const MOBILE_RE = /^[6-9]\d{9}$/;
  const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/i;

  // Tabs
  const tabs = document.querySelectorAll(".cm-tab-btn");
  const panes = document.querySelectorAll(".cm-tab");
  tabs.forEach(b => b.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    panes.forEach(p => p.classList.remove("active"));
    b.classList.add("active");
    document.getElementById(b.dataset.tab).classList.add("active");
  }));

  // Toast
  const toast = document.getElementById("toast");
  const showToast = (msg, ms=2200) => {
    toast.textContent = msg;
    toast.classList.remove("hidden");
    toast.classList.add("show");
    setTimeout(()=>{ toast.classList.remove("show"); toast.classList.add("hidden"); }, ms);
  };

  // Captcha
  let captchaAns = 0;
  const captchaQ = document.getElementById("captchaQ");
  const captchaA = document.getElementById("captchaA");
  const refreshCaptcha = document.getElementById("refreshCaptcha");
  const genCaptcha = () => {
    const a = 1 + Math.floor(Math.random()*8);
    const b = 1 + Math.floor(Math.random()*8);
    captchaAns = a + b; captchaQ.textContent = `${a} + ${b} = ?`; captchaA.value = "";
  };
  genCaptcha(); refreshCaptcha.addEventListener("click", genCaptcha);

  // Simple storage helpers (localStorage)
  const K_USERS = "ucams_users", K_SESS = "ucams_sessions", K_AUDIT = "ucams_audit";
  const get = (k, def) => JSON.parse(localStorage.getItem(k) || def);
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const users = () => get(K_USERS, "{}"); const setUsers = v => set(K_USERS, v);
  const sessions = () => get(K_SESS, "{}"); const setSessions = v => set(K_SESS, v);
  const audit = () => get(K_AUDIT, "[]"); const setAudit = v => set(K_AUDIT, v);
  const addAudit = (e) => { const a = audit(); a.unshift({...e, ts:new Date().toISOString(), ua:navigator.userAgent}); setAudit(a.slice(0,200)); };

  const idKey = v => v.trim().toLowerCase();
  const isIdentifier = v => EMAIL_RE.test(v) || MOBILE_RE.test(v) || PAN_RE.test(v);

  // Register
  document.getElementById("registerForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("regFullName").value.trim();
    const idv = document.getElementById("regEmailMobilePan").value.trim();
    const pwd = document.getElementById("regPassword").value;
    const role = document.getElementById("regRole").value;
    const tnc = document.getElementById("regTnc").checked;
    const cap = captchaA.value.trim();

    if (!name) return showToast("Enter full name.");
    if (!isIdentifier(idv)) return showToast("Invalid Email/Mobile/PAN.");
    if (!PASSWORD_RE.test(pwd)) return showToast("Password must be 8+ chars incl. upper/lower/digit/symbol.");
    if (!tnc) return showToast("Accept Terms & Conditions.");
    if (parseInt(cap,10) !== captchaAns) return showToast("Captcha incorrect.");

    const store = users();
    const key = idKey(idv);
    if (store[key]) return showToast("User already exists.");
    const hash = s => "h"+Array.from(s).reduce((a,c)=>(a<<5)-a+c.charCodeAt(0),0).toString().replace("-","");

    store[key] = {
      name, role, createdAt: Date.now(), attempts: 0, lockedUntil: 0, twoFA: true,
      email: EMAIL_RE.test(idv) ? idv : "", mobile: MOBILE_RE.test(idv) ? idv : "", pan: PAN_RE.test(idv) ? idv.toUpperCase() : "",
      pwdHash: hash(pwd), pwdHistory: [hash(pwd)]
    };
    setUsers(store);
    addAudit({type:"registration", user:key, meta:{role}});
    showToast("Registered. OTP required (1234).");
    genCaptcha();
    // open OTP modal
    pendingKey = key; document.getElementById("otpInput").value = ""; openModal("otpModal");
    e.target.reset();
  });

  // Login
  let pendingKey = null;
  const findUser = (idv) => {
    const key = idKey(idv);
    const store = users();
    if (store[key]) return {key, u:store[key]};
    for (const k in store) {
      const u = store[k]; const i = idv.toLowerCase();
      if ([u.email,u.mobile,(u.pan||"").toLowerCase()].includes(i)) return {key:k, u};
    }
    return null;
  };

  document.getElementById("loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const idv = document.getElementById("loginUser").value.trim();
    const pwd = document.getElementById("loginPassword").value;
    const remember = document.getElementById("rememberMe").checked;
    const res = findUser(idv); if (!res) return showToast("User not found.");
    const {key, u} = res;

    const now = Date.now();
    if (u.lockedUntil && now < u.lockedUntil) {
      const mins = Math.ceil((u.lockedUntil - now)/60000);
      return showToast(`Account locked. Try again in ${mins} min.`);
    }

    const hash = s => "h"+Array.from(s).reduce((a,c)=>(a<<5)-a+c.charCodeAt(0),0).toString().replace("-","");
    if (u.pwdHash !== hash(pwd)) {
      const attempts = (u.attempts||0)+1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        u.attempts = 0; u.lockedUntil = Date.now() + LOCKOUT_MIN*60*1000;
        addAudit({type:"account_lock", user:key});
        setUsers({...users(), [key]:u});
        return showToast("Too many failed attempts. Account locked.");
      }
      u.attempts = attempts;
      setUsers({...users(), [key]:u});
      addAudit({type:"login_failed", user:key});
      return showToast(`Invalid credentials. Attempts: ${attempts}/${MAX_LOGIN_ATTEMPTS}`);
    }

    u.attempts = 0; u.lockedUntil = 0; setUsers({...users(), [key]:u});
    const sess = sessions(); sess.remember = !!remember; setSessions(sess);

    if (u.twoFA) {
      pendingKey = key; document.getElementById("otpInput").value = ""; openModal("otpModal");
      return showToast("OTP required (use 1234).");
    }
    completeLogin(key, "login_success");
  });

  // OTP modal helpers
  const openModal = id => document.getElementById(id).classList.remove("hidden");
  const closeModal = id => document.getElementById(id).classList.add("hidden");

  document.getElementById("otpForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!pendingKey) return closeModal("otpModal");
    if (document.getElementById("otpInput").value.trim() !== DEMO_OTP) {
      addAudit({type:"otp_failed", user: pendingKey});
      return showToast("Incorrect OTP. Try 1234.");
    }
    closeModal("otpModal");
    completeLogin(pendingKey, "otp_success_login"); pendingKey = null;
  });
  document.getElementById("otpResend").addEventListener("click", ()=>{ showToast("OTP resent (demo: 1234)."); if (pendingKey) addAudit({type:"otp_resent", user: pendingKey}); });
  document.getElementById("otpCancel").addEventListener("click", ()=>{ closeModal("otpModal"); if (pendingKey) addAudit({type:"otp_cancelled", user: pendingKey}); pendingKey = null; });

  // Forgot/reset password
  document.getElementById("openForgot").addEventListener("click", e => {
    e.preventDefault();
    openModal("forgotModal");
    document.getElementById("forgotForm").classList.remove("hidden");
    document.getElementById("resetForm").classList.add("hidden");
  });

  document.getElementById("forgotForm").addEventListener("submit", e => {
    e.preventDefault();
    const idv = document.getElementById("fpIdentifier").value.trim();
    const res = findUser(idv); if (!res) return showToast("User not found.");
    showToast("OTP sent (demo: 1234).");
    const rf = document.getElementById("resetForm");
    rf.dataset.userKey = res.key;
    document.getElementById("forgotForm").classList.add("hidden");
    rf.classList.remove("hidden");
  });
  document.getElementById("resetBack").addEventListener("click", ()=>{ document.getElementById("resetForm").classList.add("hidden"); document.getElementById("forgotForm").classList.remove("hidden"); });
  document.getElementById("forgotCancel").addEventListener("click", ()=> closeModal("forgotModal"));

  document.getElementById("resetForm").addEventListener("submit", e => {
    e.preventDefault();
    const otp = document.getElementById("fpOtp").value.trim();
    const p1 = document.getElementById("fpNewPwd").value;
    const p2 = document.getElementById("fpNewPwd2").value;
    const key = e.target.dataset.userKey;
    if (otp !== DEMO_OTP) return showToast("Incorrect OTP.");
    if (p1 !== p2) return showToast("Passwords do not match.");
    if (!PASSWORD_RE.test(p1)) return showToast("Password must be stronger.");
    const hash = s => "h"+Array.from(s).reduce((a,c)=>(a<<5)-a+c.charCodeAt(0),0).toString().replace("-","");
    const store = users(); store[key].pwdHash = hash(p1); setUsers(store);
    addAudit({type:"password_reset", user:key});
    closeModal("forgotModal"); showToast("Password reset. Please login.");
  });

// Redirect to a separate dashboard page after successful login
const completeLogin = (key, type) => {
  const sess = sessions();
  sess.currentUser = key;
  setSessions(sess);
  addAudit({ type, user: key });
  window.location.href = 'dashboard.html'; // ← go to the new page
};


  // Accessibility font-size buttons (A+ A A-)
  document.querySelectorAll(".cm-acc").forEach(btn => {
    btn.addEventListener("click", () => {
      const b = document.body;
      const cur = parseFloat(getComputedStyle(b).fontSize);
      if (btn.textContent === "A+") b.style.fontSize = (cur + 1) + "px";
      if (btn.textContent === "A")  b.style.fontSize = "16px";
      if (btn.textContent === "A-") b.style.fontSize = Math.max(12, cur - 1) + "px";
    });
  });
})();