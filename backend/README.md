# HeritageAR Backend API

A production-ready Node.js + Express.js backend written in TypeScript, using MongoDB + Mongoose to persist archaeological monument records and user favorites.

---

## 1. Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)
- **MongoDB** (running locally on port `27017` or accessible via a remote URI)

---

## 2. Installation & Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration file from the template:
   ```bash
   copy .env.example .env
   ```
4. Set up variables in `.env` (the defaults work out-of-the-box for local development):
   - `PORT`: `5000`
   - `MONGODB_URI`: Connection string to your MongoDB server
   - `CLIENT_URL`: Port where the Expo frontend runs (usually `http://localhost:8081`)
   - `NODE_ENV`: Set to `development` for verbose logging and stack traces, or `production` to hide server internals.

---

## 3. Database Seeding

Before running the server, seed the database with the 6 Phase-1 heritage sites and generate the Guest User record:
```bash
npm run seed
```

This script will:
- Connect to MongoDB.
- Upsert the 6 monuments (avoiding duplicates if run multiple times).
- Create the default guest user if it doesn't exist.
- **Output the Guest User MongoDB `_id` on the console.**
- Close connection and exit cleanly.

### Important Next Step:
Copy the printed `GUEST USER ID` (e.g. `6a7a70eb677209d21b1bb799`) and paste it in your **frontend** `.env` file:
```env
EXPO_PUBLIC_GUEST_USER_ID=YOUR_GENERATED_ID
```

---

## 4. Running the Development Server

To boot the development server with hot-reloading:
```bash
npm run dev
```

The server binds to host `0.0.0.0` to listen on all local network adapters, allowing debug connections from physical mobile devices.

---

## 5. Physical Android Device Debugging

When testing the app on a physical Android phone:
1. Connect both your phone and laptop to the **same Wi-Fi network or phone hotspot**.
2. Determine your laptop's local IPv4 address by opening a command prompt/powershell on your laptop and running:
   ```cmd
   ipconfig
   ```
   Look for the `IPv4 Address` under your wireless adapter (e.g. `192.168.1.5` or `10.138.205.241`).
3. Update the **frontend** `.env` file in the root directory to point to your laptop IP instead of `localhost`:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:5000
   ```
   *Note: `localhost` from a physical phone refers to the phone itself, which is why your laptop's network IP must be used.*

### Windows Firewall Configuration
If your physical phone cannot connect to your laptop's backend, Windows Firewall is likely blocking incoming connections on port 5000. 

To resolve this, open **PowerShell as Administrator** and run the following command to allow incoming connections on TCP port 5000:
```powershell
New-NetFirewallRule -DisplayName "HeritageAR Backend Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

---

## 6. API Endpoints

### Monuments APIs
- **GET** `/api/monuments` - Retrieves all monuments.
  - Supports query filters:
    - Search: `/api/monuments?search=Chola` (Searches across name, location, state, dynasty, category, period)
    - Category: `/api/monuments?category=Temples`
    - Featured: `/api/monuments?featured=true`
    - Pagination: `/api/monuments?page=1&limit=10`
- **GET** `/api/monuments/featured` - Retrieves only featured monuments.
- **GET** `/api/monuments/:id` - Retrieves a single monument.
  - `:id` can be either a valid 24-character hexadecimal MongoDB `_id` OR the unique monument `slug` (e.g. `brihadeeswarar`).

### User Favorites APIs
- **GET** `/api/users/:userId/favorites` - Retrieves the user's populated list of favorited monuments.
  - `:userId` must be a valid 24-character hexadecimal MongoDB `_id`.
- **POST** `/api/users/:userId/favorites/:monumentId` - Adds a monument to the user's favorites.
  - `:userId` and `:monumentId` must be valid 24-character hexadecimal MongoDB `_id` values. Returns 409 Conflict if already favorited.
- **DELETE** `/api/users/:userId/favorites/:monumentId` - Removes a monument from the user's favorites.
  - `:userId` and `:monumentId` must be valid 24-character hexadecimal MongoDB `_id` values.
