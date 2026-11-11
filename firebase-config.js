/**
 * Saai Fitness Studio — Firebase Configuration & Attendance Service
 * 
 * Provides Firebase App initialization, Firebase Auth mapping (User ID -> Firebase Identity),
 * Firestore attendance management, and Cloud Function integration with offline fallback.
 */

(function () {
    // Default Gym Configuration
    const DEFAULT_GYM_CONFIG = {
        latitude: 13.0827,      // Saai Fitness Studio coordinates (Chennai, TN)
        longitude: 80.2707,
        radiusMeters: 150,      // Permitted radius in meters
        timezone: 'Asia/Kolkata',// Gym's configured timezone
        simulatedLocation: false,// Developer test mode for remote evaluation
        adminPin: 'admin123'
    };

    // Firebase Client Configuration
    // Replace with your production Firebase credentials when deploying
    const firebaseConfig = {
        apiKey: "AIzaSyDemoSaaiFitnessStudio2026KeyPlaceholder",
        authDomain: "saai-fitness-studio.firebaseapp.com",
        projectId: "saai-fitness-studio",
        storageBucket: "saai-fitness-studio.appspot.com",
        messagingSenderId: "109876543210",
        appId: "1:109876543210:web:saai7890abcdef123456"
    };

    let isFirebaseReady = false;
    let auth = null;
    let db = null;
    let functions = null;

    // Check if Firebase Compat SDK is loaded
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();
            db = firebase.firestore();
            functions = firebase.functions();
            isFirebaseReady = true;
            console.log('[SFS Firebase] Firebase client SDK initialized successfully.');
        } catch (e) {
            console.warn('[SFS Firebase] Firebase SDK initialization failed or running offline. Fallback active.', e.message);
        }
    } else {
        console.info('[SFS Firebase] Firebase SDK scripts not loaded yet. Using client-side robust fallback.');
    }

    // Helper: Map Patient User ID to Firebase Auth Identity (Email format)
    function mapUserIdToEmail(userId) {
        const cleanId = (userId || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return `${cleanId}@gym.saaifitness.internal`;
    }

    // Helper: Load Gym Configuration
    function getGymConfig() {
        const stored = localStorage.getItem('sfs_gym_config');
        if (stored) {
            try {
                return Object.assign({}, DEFAULT_GYM_CONFIG, JSON.parse(stored));
            } catch (e) {
                console.error('Error parsing sfs_gym_config:', e);
            }
        }
        return Object.assign({}, DEFAULT_GYM_CONFIG);
    }

    // Helper: Save Gym Configuration
    function saveGymConfig(config) {
        localStorage.setItem('sfs_gym_config', JSON.stringify(config));
    }

    // Helper: Calculate Great-Circle Distance using Haversine Formula (Meters)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
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

    // Helper: Format Date in Gym's Configured Timezone (YYYY-MM-DD)
    function getGymDateString(date = new Date(), timezone = 'Asia/Kolkata') {
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            return formatter.format(date);
        } catch (e) {
            // Fallback to ISO substring if timezone fails
            return date.toISOString().split('T')[0];
        }
    }

    // Helper: Format Date & Time for UI in Gym's Timezone
    function getGymFormattedTime(date = new Date(), timezone = 'Asia/Kolkata') {
        try {
            return new Intl.DateTimeFormat('en-IN', {
                timeZone: timezone,
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }).format(date);
        } catch (e) {
            return date.toLocaleString();
        }
    }

    // Helper: Get or Initialize Attendance Store (Deterministic Records)
    function getAttendanceStore() {
        const stored = localStorage.getItem('sfs_attendance_records');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error parsing sfs_attendance_records:', e);
            }
        }
        return {};
    }

    function saveAttendanceStore(store) {
        localStorage.setItem('sfs_attendance_records', JSON.stringify(store));
    }

    // Expose Global SFSAttendanceService
    window.SFSAttendanceService = {
        isFirebaseReady: () => isFirebaseReady,
        getGymConfig: getGymConfig,
        saveGymConfig: saveGymConfig,
        calculateDistance: calculateDistance,
        getGymDateString: getGymDateString,
        getGymFormattedTime: getGymFormattedTime,
        mapUserIdToEmail: mapUserIdToEmail,

        /**
         * Fetch current device geolocation with high accuracy
         */
        getCurrentLocation: function () {
            return new Promise((resolve, reject) => {
                const config = getGymConfig();
                // If Developer Demo Testing Mode is active, simulate coordinates within gym radius
                if (config.simulatedLocation) {
                    console.log('[SFS Attendance] Developer Testing Mode: Simulating location inside gym premises.');
                    return resolve({
                        latitude: config.latitude + 0.00005, // ~5 meters away from gym center
                        longitude: config.longitude + 0.00005,
                        accuracy: 10,
                        isSimulated: true
                    });
                }

                if (!navigator.geolocation) {
                    return reject({
                        code: 'GEO_NOT_SUPPORTED',
                        message: 'Geolocation is not supported by your browser or device.'
                    });
                }

                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        resolve({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                            isSimulated: false
                        });
                    },
                    (err) => {
                        let msg = 'Failed to retrieve GPS location.';
                        let code = 'GEO_ERROR';
                        if (err.code === 1) { // PERMISSION_DENIED
                            code = 'PERMISSION_DENIED';
                            msg = 'Location permission was denied. Please allow location access in your browser to verify physical presence at the gym.';
                        } else if (err.code === 2) { // POSITION_UNAVAILABLE
                            code = 'POSITION_UNAVAILABLE';
                            msg = 'Location information is unavailable. Please ensure your device GPS and location services are enabled.';
                        } else if (err.code === 3) { // TIMEOUT
                            code = 'TIMEOUT';
                            msg = 'Location request timed out. Please check your network connection and retry.';
                        }
                        reject({ code: code, message: msg, originalError: err });
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            });
        },

        /**
         * Verifies gym location boundary
         */
        verifyLocation: function (coords) {
            const config = getGymConfig();
            const distance = calculateDistance(
                coords.latitude,
                coords.longitude,
                config.latitude,
                config.longitude
            );
            const isWithinRadius = distance <= config.radiusMeters;
            return {
                isWithinRadius: isWithinRadius,
                distanceMeters: Math.round(distance),
                permittedRadius: config.radiusMeters,
                gymCoordinates: {
                    latitude: config.latitude,
                    longitude: config.longitude
                },
                userCoordinates: {
                    latitude: coords.latitude,
                    longitude: coords.longitude
                }
            };
        },

        /**
         * Records daily attendance using deterministic Cloud Firestore document ID:
         * attendance/{patientId_YYYY-MM-DD}
         */
        recordDailyAttendance: async function (patient, verificationResult) {
            const config = getGymConfig();
            const attendanceDate = getGymDateString(new Date(), config.timezone);
            const deterministicDocId = `${patient.id}_${attendanceDate}`;
            const path = `attendance/${deterministicDocId}`;

            // Try Firebase Firestore if configured with live credentials
            if (isFirebaseReady && db && !firebaseConfig.apiKey.includes('Placeholder')) {
                try {
                    const docRef = db.collection('attendance').doc(deterministicDocId);
                    const docSnapshot = await docRef.get();

                    if (docSnapshot.exists) {
                        return {
                            success: true,
                            alreadyMarked: true,
                            docId: deterministicDocId,
                            data: docSnapshot.data(),
                            message: 'Your attendance has already been marked for today.'
                        };
                    }

                    const newRecord = {
                        patientId: patient.id,
                        attendanceDate: attendanceDate,
                        loginTime: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'present',
                        locationVerified: true,
                        distanceMeters: verificationResult.distanceMeters,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        gymTimezone: config.timezone,
                        deviceVerification: {
                            accuracyMeters: verificationResult.userCoordinates ? verificationResult.accuracy : null,
                            isSimulated: !!verificationResult.isSimulated
                        }
                    };

                    await docRef.set(newRecord);
                    return {
                        success: true,
                        alreadyMarked: false,
                        docId: deterministicDocId,
                        data: newRecord,
                        message: "Today's attendance recorded successfully!"
                    };
                } catch (firestoreErr) {
                    console.warn('[SFS Firebase] Firestore live write encountered error, falling back to local deterministic store:', firestoreErr);
                }
            }

            // Deterministic Storage Fallback (Guarantees atomic single record per calendar day)
            const store = getAttendanceStore();
            const existingRecord = store[deterministicDocId];

            if (existingRecord) {
                return {
                    success: true,
                    alreadyMarked: true,
                    docId: deterministicDocId,
                    data: existingRecord,
                    message: 'Your attendance has already been marked for today.'
                };
            }

            const now = new Date();
            const newRecord = {
                patientId: patient.id,
                attendanceDate: attendanceDate,
                loginTime: now.toISOString(),
                formattedTime: getGymFormattedTime(now, config.timezone),
                status: 'present',
                locationVerified: true,
                distanceMeters: verificationResult.distanceMeters,
                createdAt: now.toISOString(),
                gymTimezone: config.timezone,
                deviceVerification: {
                    isSimulated: !!verificationResult.isSimulated
                }
            };

            store[deterministicDocId] = newRecord;
            saveAttendanceStore(store);

            return {
                success: true,
                alreadyMarked: false,
                docId: deterministicDocId,
                data: newRecord,
                message: "Today's attendance recorded successfully!"
            };
        },

        /**
         * Checks existing attendance for patient on current gym calendar day
         */
        getTodayAttendance: async function (patientId) {
            const config = getGymConfig();
            const attendanceDate = getGymDateString(new Date(), config.timezone);
            const deterministicDocId = `${patientId}_${attendanceDate}`;

            if (isFirebaseReady && db && !firebaseConfig.apiKey.includes('Placeholder')) {
                try {
                    const docRef = db.collection('attendance').doc(deterministicDocId);
                    const docSnapshot = await docRef.get();
                    if (docSnapshot.exists) {
                        return docSnapshot.data();
                    }
                } catch (e) {
                    console.warn('[SFS Firebase] Firestore read error:', e);
                }
            }

            const store = getAttendanceStore();
            return store[deterministicDocId] || null;
        }
    };
})();
