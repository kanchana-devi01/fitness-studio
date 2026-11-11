/**
 * Saai Fitness Studio — Firebase Cloud Functions Backend
 * 
 * Secure backend service for:
 * 1. Patient Daily Login & Geolocation Verification
 * 2. Deterministic Cloud Firestore Attendance Recording (attendance/{patientId_YYYY-MM-DD})
 * 3. Server-side Haversine Distance Validation
 * 4. Timezone-specific Daily Boundary Enforcement
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Default Gym Configuration
const DEFAULT_GYM_CONFIG = {
    latitude: 13.0827,      // Saai Fitness Studio Coordinates
    longitude: 80.2707,
    radiusMeters: 150,      // Permitted distance radius
    timezone: 'Asia/Kolkata'// Gym Timezone
};

/**
 * Server-side Haversine Distance Calculation (Meters)
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's mean radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Server-side Date string in Gym Timezone (YYYY-MM-DD)
 */
function getGymTimezoneDate(timezone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
}

/**
 * Retrieves the gym's location configuration from Firestore / defaults
 */
async function getGymLocationConfig() {
    try {
        const configDoc = await db.collection('config').doc('gymLocation').get();
        if (configDoc.exists) {
            return Object.assign({}, DEFAULT_GYM_CONFIG, configDoc.data());
        }
    } catch (e) {
        console.warn('Could not read config/gymLocation, using defaults:', e.message);
    }
    return DEFAULT_GYM_CONFIG;
}

/**
 * Callable Cloud Function: markDailyAttendance
 * 
 * Verifies patient authentication, verifies reported coordinates against gym location,
 * enforces permitted radius, and records attendance atomically.
 */
exports.markDailyAttendance = functions.https.onCall(async (data, context) => {
    // 1. Verify Caller Authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Authentication required. Please log in with your Patient ID and registered mobile number.'
        );
    }

    const patientId = (data.patientId || context.auth.uid).trim().toUpperCase();
    const callerUid = context.auth.uid.toUpperCase();

    // Verify patient identity: Caller cannot mark attendance for another patient
    if (callerUid !== patientId && context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Security violation: You can only record attendance for your own verified Patient ID.'
        );
    }

    // 2. Validate Reported Geolocation Coordinates
    const { latitude, longitude } = data;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Valid device GPS coordinates (latitude and longitude) are required for attendance.'
        );
    }

    // 3. Load Gym Geofence Parameters
    const gymConfig = await getGymLocationConfig();
    const distanceMeters = calculateDistanceMeters(
        latitude,
        longitude,
        gymConfig.latitude,
        gymConfig.longitude
    );

    // 4. Server-Side Geofence Enforcement
    if (distanceMeters > gymConfig.radiusMeters) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            `Location verification failed: You are ${Math.round(distanceMeters)}m away from the gym premises. Attendance can only be recorded within ${gymConfig.radiusMeters}m.`
        );
    }

    // 5. Compute Deterministic Calendar Date in Gym Timezone
    const attendanceDate = getGymTimezoneDate(gymConfig.timezone);
    const deterministicDocId = `${patientId}_${attendanceDate}`;
    const attendanceDocRef = db.collection('attendance').doc(deterministicDocId);

    // 6. Atomic Firestore Transaction to Prevent Duplicates
    return db.runTransaction(async (transaction) => {
        const docSnapshot = await transaction.get(attendanceDocRef);

        if (docSnapshot.exists) {
            const existingData = docSnapshot.data();
            return {
                success: true,
                alreadyMarked: true,
                docId: deterministicDocId,
                attendanceDate: existingData.attendanceDate,
                loginTime: existingData.loginTime,
                message: 'Your attendance has already been marked for today.'
            };
        }

        const newAttendance = {
            patientId: patientId,
            attendanceDate: attendanceDate,
            loginTime: admin.firestore.FieldValue.serverTimestamp(),
            status: 'present',
            locationVerified: true,
            distanceMeters: Math.round(distanceMeters),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            gymTimezone: gymConfig.timezone
        };

        transaction.set(attendanceDocRef, newAttendance);

        return {
            success: true,
            alreadyMarked: false,
            docId: deterministicDocId,
            attendanceDate: attendanceDate,
            message: "Today's attendance has been successfully recorded."
        };
    });
});

/**
 * Callable Cloud Function: updateGymLocationConfig (Admin Only)
 */
exports.updateGymLocationConfig = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only authorized administrators can modify gym geographical coordinates.'
        );
    }

    const { latitude, longitude, radiusMeters, timezone } = data;
    const updatePayload = {};

    if (typeof latitude === 'number') updatePayload.latitude = latitude;
    if (typeof longitude === 'number') updatePayload.longitude = longitude;
    if (typeof radiusMeters === 'number') updatePayload.radiusMeters = radiusMeters;
    if (typeof timezone === 'string') updatePayload.timezone = timezone;
    updatePayload.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('config').doc('gymLocation').set(updatePayload, { merge: true });

    return {
        success: true,
        message: 'Gym location parameters updated successfully.'
    };
});
