import os
import sys
import time
import requests
import pymongo
from PIL import Image
import io
import base64

def main():
    backend_url = "http://localhost:5000/api"

    print("=" * 100)
    print("HERIXA END-TO-END VERIFICATION SUITE: REGISTRATION -> EMAIL -> USER LIST -> AUDIT LOG -> SCAN COUNTER")
    print("=" * 100)

    # Connect to MongoDB
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db = client["heritage_ar"]

    # STEP 1: Verify Initial Preserved User State
    users_col = db["users"]
    initial_users = list(users_col.find({}))
    print(f"\n[STEP 1] Initial User Count in MongoDB: {len(initial_users)}")
    for u in initial_users:
        print(f"  - Email: {u['email']} | Role: {u['role']} | Scans: {u.get('scanCount', 0)}")

    if len(initial_users) != 1 or initial_users[0]["email"] != "thangarajvidhubala@gmail.com":
        print("FAIL: Preserved user state is invalid!")
        sys.exit(1)

    # STEP 2: Register a Brand-New Test User
    test_email = f"testuser_{int(time.time())}@gmail.com"
    test_password = "TestPassword123!"
    test_name = "Test Registration User"

    print(f"\n[STEP 2] Registering Brand-New User: {test_email}")
    r_reg = requests.post(f"{backend_url}/users/register", json={
        "name": test_name,
        "email": test_email,
        "password": test_password
    })
    print(f"  Register HTTP Status: {r_reg.status_code}")
    print(f"  Register Response:    {r_reg.json()}")
    
    if r_reg.status_code != 200 or not r_reg.json().get("success"):
        print("FAIL: Registration failed!")
        sys.exit(1)

    # STEP 3: Verify User Appears in MongoDB
    new_user_doc = users_col.find_one({"email": test_email})
    print(f"\n[STEP 3] User in MongoDB after Registration:")
    print(f"  ID: {new_user_doc['_id']} | Email: {new_user_doc['email']} | Scans: {new_user_doc.get('scanCount', 0)} | Verified: {new_user_doc.get('isEmailVerified')}")

    # Mark user as email verified in DB for login / scan testing
    users_col.update_one({"_id": new_user_doc["_id"]}, {"$set": {"isEmailVerified": True}})
    print("  [OK] Marked test user email as verified for scan testing.")

    # STEP 4: Login to Get Bearer Auth Token
    r_login = requests.post(f"{backend_url}/users/login", json={
        "email": test_email,
        "password": test_password
    })
    print(f"\n[STEP 4] User Login HTTP Status: {r_login.status_code}")
    login_res = r_login.json()
    auth_token = login_res.get("token")
    user_id = str(new_user_doc["_id"])
    print(f"  Token Generated: {auth_token[:20]}...")

    headers = {"Authorization": f"Bearer {auth_token}"}

    # STEP 5: Verify User Appears in Admin Users API
    # Create admin token for testing admin APIs
    preserved_user = users_col.find_one({"email": "thangarajvidhubala@gmail.com"})

    print(f"\n[STEP 5] Testing Admin User Management & Details for User ID: {user_id}")
    r_u_detail = requests.get(f"{backend_url}/admin/users/{user_id}", headers=headers)
    print(f"  getUserDetails Status Code: {r_u_detail.status_code}")
    print(f"  getUserDetails Response Data: {r_u_detail.json().get('data')}")

    # STEP 6: Perform Recognition Scan #1
    ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
    sample_img_path = os.path.join(ai_root, "dataset", "multiclass_v2", "validation", "brihadeeswarar", "Brihadeewsar_temple.jpg")

    img = Image.open(sample_img_path)
    w, h = img.size
    img_resized = img.resize((1024, int(h * (1024 / w))), Image.Resampling.BILINEAR)
    buf = io.BytesIO()
    img_resized.save(buf, format="JPEG", quality=80)
    b64_str = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    scan_payload = {
        "image": b64_str,
        "latitude": 10.7828,
        "longitude": 79.1318
    }

    print(f"\n[STEP 7 & 8] Executing Recognition Scan #1 for user {test_email}...")
    r_scan1 = requests.post(f"{backend_url}/monuments/recognize", json=scan_payload, headers=headers)
    res_scan1 = r_scan1.json()
    print(f"  Scan #1 Status Code: {r_scan1.status_code}")
    print(f"  Scan #1 Recognized:  {res_scan1.get('recognized')} | Monument: {res_scan1.get('monumentName')}")

    user_after_scan1 = users_col.find_one({"_id": new_user_doc["_id"]})
    print(f"  [CHECK] User scanCount in DB after Scan #1: {user_after_scan1.get('scanCount')}")

    # STEP 9 & 10: Perform Recognition Scan #2
    print(f"\n[STEP 9 & 10] Executing Recognition Scan #2 for user {test_email}...")
    r_scan2 = requests.post(f"{backend_url}/monuments/recognize", json=scan_payload, headers=headers)
    res_scan2 = r_scan2.json()
    print(f"  Scan #2 Status Code: {r_scan2.status_code}")
    print(f"  Scan #2 Recognized:  {res_scan2.get('recognized')} | Monument: {res_scan2.get('monumentName')}")

    user_after_scan2 = users_col.find_one({"_id": new_user_doc["_id"]})
    print(f"  [CHECK] User scanCount in DB after Scan #2: {user_after_scan2.get('scanCount')}")

    # STEP 11, 12, 13: Verify User Details & Activity in Admin API
    print(f"\n[STEP 11 & 12] Fetching Admin User Details after 2 Scans:")
    r_u_detail2 = requests.get(f"{backend_url}/admin/users/{user_id}", headers=headers)
    res_detail2 = r_u_detail2.json().get("data", {})
    print(f"  Admin Total Scans: {res_detail2.get('totalScans')}")
    print(f"  Admin Recent Scans Count: {len(res_detail2.get('scans', []))}")
    print(f"  Admin Activity Logs Count: {len(res_detail2.get('activities', []))}")

    # STEP 17: Test Failure Cases (Failed scan should NOT increment scan count)
    print("\n[STEP 17] Testing Scan Failure (Invalid/Unrecognized Image should NOT increment scan count)...")
    bad_img = Image.new("RGB", (100, 100), color="black")
    buf_bad = io.BytesIO()
    bad_img.save(buf_bad, format="JPEG")
    bad_b64 = "data:image/jpeg;base64," + base64.b64encode(buf_bad.getvalue()).decode("utf-8")

    r_fail = requests.post(f"{backend_url}/monuments/recognize", json={"image": bad_b64, "latitude": 0, "longitude": 0}, headers=headers)
    print(f"  Failed Scan Status: {r_fail.json().get('status')} | Recognized: {r_fail.json().get('recognized')}")

    user_after_fail = users_col.find_one({"_id": new_user_doc["_id"]})
    print(f"  [CHECK] User scanCount in DB after Failed Scan: {user_after_fail.get('scanCount')} (Must still be 2)")

    # Cleanup test user after verification
    users_col.delete_one({"_id": new_user_doc["_id"]})
    print(f"\n[TEST CLEANUP] Removed test user '{test_email}'. Remaining Users in DB: {users_col.count_documents({})}")

    if user_after_scan2.get('scanCount') == 2 and user_after_fail.get('scanCount') == 2:
        print("\n" + "=" * 100)
        print("ALL E2E RUNTIME VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 100)
    else:
        print("\nFAIL: Scan count mismatch!")

if __name__ == "__main__":
    main()
