import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  resetPassword,
  googleSignIn
} from "../JS/firebase/auth-service.js";

// LOGIN FORM HANDLER
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  const result = await loginUser(email, password);
  
  if (result.success) {
    alert("Welcome");
    
    if (result.user.role === "admin") {
      window.location.href = "html/admin/dashboard.html";
    } else {
      window.location.href = "html/member/member-dashboard.html";
    }
  } else {
    alert("error" + result.error);
  }
});

// REGISTER FORM HANDLER
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
   const contact = document.getElementById("contact").value;
  const role = document.getElementById("role").value;
  const department = document.getElementById("registerDepartment")?.value || "";
    const result = await registerUser(name,email,password,contact,role,department);
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
    window.location.href = "/";
  }
});

// FORGOT PASSWORD
document.getElementById("forgotPasswordForm")?.addEventListener("submit", async (e) => {
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
document.getElementById('googleBtn')?.addEventListener('click', async () => {
  const result = await googleSignIn('user'); // Default role 'user'
  if (result.success) {
    console.log("Logged in user:", result.user);
  } else {
    console.error("Error:", result.error);
  }
});