import {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  googleSignIn,
} from "../JS/firebase/auth-service.js";

// LOGIN FORM HANDLER
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const result = await loginUser(email, password);

if (result.success) {
    // Role ko localStorage mein save karo
    localStorage.setItem('user', JSON.stringify({
      uid: result.uid,
      email: result.user.email,
      role: result.user.role, 
      name: result.user.name
    }));

    alert("Welcome " + result.user.name);

   
    if (result.user.role === "admin") {
      window.location.href = "./html/admin/dashboard.html";
    } else {
      window.location.href = "./html/member/member-dashboard.html";
    }
  } else {
    alert("Error: " + result.error);
  }
});


// REGISTER FORM HANDLER
document
  .getElementById("registerForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const contact = document.getElementById("contact").value;
    const role = document.getElementById("role").value;
    const department =
      document.getElementById("registerDepartment")?.value || "";
    const result = await registerUser(
      name,
      email,
      password,
      contact,
      role,
      department,
    );
    if (result.success) {
      alert("Account Created");
      window.location.href = "login.html";
    } else {
      alert("error " + result.error);
    }
  });

// LOGOUT BUTTON
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  const result = await logoutUser();
  if (result.success) {
    localStorage.removeItem('user');
    window.location.href = "/";
  }
});

// FORGOT PASSWORD
document
  .getElementById("forgotPasswordForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail").value;
    const result = await resetPassword(email);

    if (result.success) {
      alert("Email Send");
    } else {
      alert("error" + result.error);
    }
  });

// google auth
document.getElementById("googleBtn")?.addEventListener("click", async () => {
  const result = await googleSignIn("user");
  if (result.success) {
    localStorage.setItem('user', JSON.stringify({
      uid: result.uid,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name
    }));
    window.location.href = "./html/member/member-dashboard.html";
  } else {
    console.error("Error:", result.error);
  }}
)
