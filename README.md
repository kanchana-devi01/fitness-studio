# Saai Fitness Studio — Daily Gym Login & Location-Based Attendance

This enhancement adds a **secure daily patient/member login system with browser GPS geofence verification and deterministic Cloud Firestore attendance recording** to Saai Fitness Studio.

---

## 📁 Project Architecture & Folder Structure

```
Saai fitness studio/
├── index.html                 # Production entry point (Old Money Luxury design preserved)
├── script.js                  # Frontend controllers, geolocation handling, UI workflows
├── styles.css                 # Aesthetic design system with attendance & geofence styles
├── firebase-config.js         # Firebase client config, Haversine formula, & attendance service
├── assets/                    # Studio imagery and logos
│   └── images/
├── frontend/                  # Standalone Frontend Folder (Mirrored bundle for distribution)
│   ├── index.html
│   ├── script.js
│   ├── styles.css
│   ├── firebase-config.js
│   └── assets/
├── functions/                 # Firebase Cloud Functions Backend (Trusted server execution)
│   ├── index.js               # Callable functions: markDailyAttendance & updateGymLocationConfig
│   └── package.json           # Cloud Functions dependencies
├── firestore.rules            # Firestore Security Rules (Immutable attendance records)
├── firebase.json              # Firebase project service deployment configuration
└── README.md                  # Complete technical documentation
```

---

## 🔑 Step 1: Project Inspection & Minimum Changes

- **Preservation of Existing Website:** The core Old Money aesthetic, brand identity, navigation, gallery, trainers, and fees sections remain unchanged.
- **Minimum Modification Principle:** Only the `#attendance` section and its accompanying JS/CSS controllers were enhanced.
- **Dual-Mode Execution:** The solution runs seamlessly with live Firebase Authentication & Firestore, and includes a zero-config local simulation fallback so testing works out of the box in standard browsers.

---

## 👤 Step 2: Patient Daily Login

- **Username:** Patient's existing registered User ID (e.g., `SFS001`, `SFS002`, `SFS003`).
- **Password:** Patient's registered mobile number (e.g., `9876543210`).
- **Security & Mapping:**
  - In Firebase Authentication, User IDs are mapped to internal tenant identities:  
    `{userId}@gym.saaifitness.internal`.
  - Authentication is **never** performed by merely reading the Firestore patient document.
  - The login form includes a show/hide password toggle for convenience.
- **Role Isolation:** Administrator, trainer, and front-desk roles remain unaffected.

### Quick Demo Accounts:
| Patient ID | Name | Registered Mobile (Password) | Enrolled Plan | Fee Status |
|---|---|---|---|---|
| **SFS001** | Rajesh Kumar | `9876543210` | CrossFit + PT | ⚠️ Due Tomorrow |
| **SFS002** | Anita Sharma | `9876543211` | Natural Yoga | ✅ Fee Paid |
| **SFS003** | Vikram Singh | `9876543212` | 120 Days Weight Loss | 🔴 Overdue |

---

## 📍 Step 3: Gym Location Verification (Geofencing)

- **Configurable Coordinates & Radius:**
  - **Default Studio Coordinates:** Latitude `13.0827`, Longitude `80.2707`.
  - **Permitted Radius:** `150` meters (configurable from 10m to 5,000m).
  - **Timezone:** `Asia/Kolkata` (IST, UTC+05:30).
- **Verification Workflow:**
  1. High-accuracy geolocation coordinates are requested from the device via `navigator.geolocation.getCurrentPosition`.
  2. The great-circle distance is calculated using the **Haversine Formula**:
     $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
  3. If within the permitted radius, attendance proceeds to Firestore recording.
  4. If outside the permitted radius, the attempt is rejected with the exact calculated distance (e.g., `"You are 350m away from the gym. Attendance can only be recorded within 150m."`).
  5. If location permission is denied or times out, clear, specific error messages guide the patient to enable location services.
- **Admin Configuration Interface:**
  - Administrators can open the **Gym Location Configuration** modal by clicking the link at the bottom of the attendance portal.
  - Protected by an Admin Passcode (Default: `admin123`).
  - Allows one-click **"Set Coordinates to My Current Device GPS"** for gym staff on-site.
  - Includes a **Developer Demo Mode** toggle to simulate presence within the gym radius during remote evaluations.

---

## 📅 Step 4: Automatic Daily Attendance with Cloud Firestore

- **Document Path:** `attendance/{patientId_YYYY-MM-DD}` (e.g., `attendance/SFS001_2026-10-15`).
- **Document Schema:**
  ```json
  {
    "patientId": "SFS001",
    "attendanceDate": "2026-10-15",
    "loginTime": "2026-10-15T18:30:00.000Z",
    "status": "present",
    "locationVerified": true,
    "distanceMeters": 18,
    "createdAt": "2026-10-15T18:30:00.000Z",
    "gymTimezone": "Asia/Kolkata"
  }
  ```
- **Rules & Guarantees:**
  1. **Deterministic Document ID:** The key `${patientId}_${attendanceDate}` strictly guarantees at most **one** attendance document per patient per calendar day.
  2. **Non-Overwriting:** If a patient logs in again on the same day, existing records are not overwritten. The dashboard displays:  
     `"Your attendance has already been marked for today."`
  3. **Timezone Calculation:** Date calculation uses the gym's configured timezone (`Asia/Kolkata`) via `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })`, preventing timezone discrepancies from international or misconfigured devices.
  4. **Trusted Server Timestamps:** Uses `FieldValue.serverTimestamp()` on the backend.

---

## 🔒 Step 5: Firebase Security & Limitations

### 1. Cloud Functions Backend (`functions/index.js`)
- Validates the caller's Firebase Auth token (`context.auth.uid == patientId`).
- Patients cannot mark attendance for other patients.
- Re-calculates and enforces Haversine distance on the server.
- Uses an atomic Firestore transaction to prevent race conditions.
- Never trusts frontend-supplied flags (`status: 'present'` or `locationVerified: true`).

### 2. Firestore Security Rules (`firestore.rules`)
- Read access is restricted to the owning patient (`resource.data.patientId == request.auth.uid`) and administrators.
- Direct client writes require server-timestamp verification and non-existence checks.
- Modifying (`update`) or deleting (`delete`) attendance records is restricted to administrators.

### 3. Password Security & Migration Strategy
- In legacy systems where passwords or mobile numbers were stored in plaintext, migrate by:
  1. Hashing passwords with `bcrypt` or `PBKDF2` with a unique salt per patient.
  2. Provisioning Firebase Authentication accounts with phone/custom auth tokens.
  3. Implementing a secure SMS OTP verification on initial login or password reset.
- Never expose Firebase Admin SDK service account keys in client-side code.

### 4. Browser GPS Spoofing Limitations & Defense-in-Depth
> [!IMPORTANT]
> **Browser Geolocation Limitations:** The HTML5 Geolocation API relies on client-reported GPS and Wi-Fi triangulations. A user with developer tools or mock location apps can spoof coordinates.
> 
> **Recommended Defense-in-Depth:**
> 1. **Local Wi-Fi Network Validation:** Check that requests originate from the gym's public IP or internal Wi-Fi BSSID.
> 2. **Physical Bluetooth Low Energy (BLE) Beacons:** Require the client to detect a physical BLE beacon placed at the front desk.
> 3. **Rotating Dynamic QR Codes:** Display a time-sensitive QR code at the gym reception that patients scan upon arrival.

---

## 📊 Step 6: Patient Dashboard Enhancements

The patient dashboard (`#member-dashboard`) cleanly displays:
- **Location Verification Status:** Verified distance (e.g., `GPS Verified • ~18m from studio center`).
- **Today's Attendance Status:** Dynamic confirmation banner displaying either:
  - `✅ Today's Attendance Recorded!` (on first check-in).
  - `ℹ️ Your attendance has already been marked for today.` (on subsequent logins).
- **Firestore Record Audit:** Displays the deterministic document ID (`attendance/SFS001_YYYY-MM-DD`).
- **Dynamic Attendance Calendar:** Automatically renders days for the current calendar month with highlighted attendance records.
- **Fee Deadline Alerts:** Retains urgent reminders for fees due tomorrow or overdue.

---

## 🚀 How to Run Locally

1. Open `index.html` (or `frontend/index.html`) in any modern browser (e.g., Chrome, Edge, Safari, Firefox).
2. Scroll to the **Daily Login & Attendance** section.
3. Click any **Quick Demo Account** button (e.g., `SFS001`) to auto-fill the User ID and mobile number.
4. Click **Verify Location & Mark Attendance**.
5. When prompted, allow location permissions in your browser. (If testing remotely, use the Admin Geofence settings to enable Developer Demo Mode).
