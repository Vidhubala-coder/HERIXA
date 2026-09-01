import os
import sys

def check_file_contains(filepath, tokens):
    if not os.path.exists(filepath):
        return False, f"File not found: {filepath}"
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    results = {tok: tok in content for tok in tokens}
    return True, results

def main():
    backend_root = r"C:\Users\LENOVO\Desktop\AR model\backend"
    frontend_root = r"C:\Users\LENOVO\Desktop\AR model"

    print("=" * 100)
    print("HERIXA READ-ONLY FUNCTIONAL AUDIT: AUTHENTICATION + EMAIL + HERITAGE MAP")
    print("=" * 100)

    # 1. Inspect Backend Auth & Email Files
    auth_ctrl = os.path.join(backend_root, "src", "controllers", "authController.ts")
    user_model = os.path.join(backend_root, "src", "models", "User.ts")
    email_svc = os.path.join(backend_root, "src", "services", "emailService.ts")
    auth_mw = os.path.join(backend_root, "src", "middleware", "authMiddleware.ts")
    if not os.path.exists(auth_mw):
        auth_mw = os.path.join(backend_root, "src", "middleware", "auth.ts")

    print("\n--- 1. BACKEND AUTH & SECURITY INSPECTION ---")
    ok, res = check_file_contains(auth_ctrl, ["bcrypt", "jwt", "otp", "sendVerificationEmail", "forgotPassword", "resetPassword", "isVerified"])
    print(f"authController.ts tokens: {res if ok else res}")

    ok, res = check_file_contains(user_model, ["password", "select: false", "isVerified", "verificationOtp", "otpExpires", "role"])
    print(f"User.ts tokens:           {res if ok else res}")

    ok, res = check_file_contains(email_svc, ["nodemailer", "transporter", "sendMail", "process.env"])
    print(f"emailService.ts tokens:   {res if ok else res}")

    ok, res = check_file_contains(auth_mw, ["jwt.verify", "req.user", "role", "admin"])
    print(f"authMiddleware tokens:    {res if ok else res}")

    # 2. Inspect Frontend Screens & Context
    map_screen = os.path.join(frontend_root, "src", "screens", "HeritageMapScreen.tsx")
    auth_context = os.path.join(frontend_root, "src", "context", "AuthContext.tsx")
    reg_screen = os.path.join(frontend_root, "src", "screens", "RegisterScreen.tsx")

    print("\n--- 2. FRONTEND MAP & AUTH STATE INSPECTION ---")
    ok, res = check_file_contains(map_screen, ["MapView", "Marker", "monuments", "fetch", "latitude", "longitude", "onPress", "navigation"])
    print(f"HeritageMapScreen.tsx:    {res if ok else res}")

    ok, res = check_file_contains(auth_context, ["AsyncStorage", "user", "token", "login", "logout", "setUser"])
    print(f"AuthContext.tsx:          {res if ok else res}")

    ok, res = check_file_contains(reg_screen, ["register", "email", "password", "confirmPassword", "otp", "verify"])
    print(f"RegisterScreen.tsx:       {res if ok else res}")

if __name__ == "__main__":
    main()
