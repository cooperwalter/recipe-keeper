# Page snapshot

```yaml
- text: Login Enter your email below to login to your account
- paragraph: 🎉 Demo Account Available!
- paragraph: "Try Recipe and Me with our demo account:"
- paragraph: "Email: demo@recipeandme.app"
- paragraph: "Password: DemoRecipes2024!"
- button "Fill Demo Credentials"
- text: Email
- textbox "Email"
- text: Password
- link "Forgot your password?":
  - /url: /auth/forgot-password
- textbox "Password"
- button "Login"
- text: Don't have an account?
- link "Sign up":
  - /url: /auth/sign-up
- region "Notifications (F8)":
  - list
- button "Open Tanstack query devtools":
  - img
- alert
- button "Open Next.js Dev Tools":
  - img
```