import requests
import base64
from PIL import Image
import io

img_path = r"C:\Users\LENOVO\Desktop\AR model\ai\dataset\multiclass_v2\validation\brihadeeswarar\Big_temple_242.jpg"

# Simulate phone ImageManipulator: resize to 1024px width, compress to JPEG 80%
img = Image.open(img_path)
w, h = img.size
new_w = 1024
new_h = int(h * (1024 / w))
img_resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

buffer = io.BytesIO()
img_resized.save(buffer, format="JPEG", quality=80)
compressed_bytes = buffer.getvalue()

base64_img = "data:image/jpeg;base64," + base64.b64encode(compressed_bytes).decode("utf-8")

print("=" * 80)
print("TESTING PATH 2: Direct FastAPI /predict Endpoint (Raw Original Image)")
print("=" * 80)

url_fastapi = "http://127.0.0.1:8001/predict"
with open(img_path, "rb") as f:
    files = {"image": ("test.jpg", f.read(), "image/jpeg")}
r_fastapi = requests.post(url_fastapi, files=files)
print("FastAPI HTTP Status:", r_fastapi.status_code)
res_f = r_fastapi.json()
print("FastAPI Response:")
print(f"  predicted_class: {res_f.get('predicted_class')}")
print(f"  confidence:      {res_f.get('confidence'):.4f}")
print(f"  hybrid_winner:   {res_f.get('hybrid_winner')}")
print(f"  accepted:        {res_f.get('accepted')}")

print("\n" + "=" * 80)
print("TESTING PATH 1: Mobile Backend /api/monuments/recognize (Without GPS / Near Thanjavur)")
print("=" * 80)

url_backend = "http://localhost:5000/api/monuments/recognize"
payload_no_gps = {
    "image": base64_img,
    "latitude": 10.7828,  # Exact Thanjavur GPS
    "longitude": 79.1318
}
r_backend = requests.post(url_backend, json=payload_no_gps)
print("Backend HTTP Status:", r_backend.status_code)
res_b = r_backend.json()
print("Backend Response:")
print(f"  success:         {res_b.get('success')}")
print(f"  status:          {res_b.get('status')}")
print(f"  recognized:      {res_b.get('recognized')}")
print(f"  monumentName:    {res_b.get('monumentName')}")
print(f"  confidence:      {res_b.get('confidence')}")

print("\n" + "=" * 80)
print("TESTING PATH 1: Mobile Backend /api/monuments/recognize (With Out-Of-Bounds GPS: Chennai)")
print("=" * 80)

payload_gps_chennai = {
    "image": base64_img,
    "latitude": 13.0827,  # Chennai GPS (~300km away)
    "longitude": 80.2707
}
r_backend_gps = requests.post(url_backend, json=payload_gps_chennai)
print("Backend HTTP Status:", r_backend_gps.status_code)
res_bg = r_backend_gps.json()
print("Backend Response:")
print(f"  success:         {res_bg.get('success')}")
print(f"  status:          {res_bg.get('status')}")
print(f"  recognized:      {res_bg.get('recognized')}")
print(f"  reason:          {res_bg.get('reason')}")
print(f"  message:         {res_bg.get('message')}")
print(f"  errorDetails:    {res_bg.get('errorDetails')}")
