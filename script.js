/**
 * Saai Fitness Studio — Interactive JavaScript
 * Includes Sticky Navbar, Animated Counter, Gallery Filters, Lightbox,
 * Member Login, Auto-Attendance System, Fee Deadline Reminders, and Enquiry Form.
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       1. Pre-populated Real-Time Member Database (Mock / LocalStorage)
       ========================================================================== */
    const initialMembersDB = {
        'SFS001': {
            id: 'SFS001',
            password: 'pass123',
            phone: '9876543210', // Registered Mobile Number (Used as Password)
            name: 'Rajesh Kumar',
            plan: 'CrossFit + PT (Velu Master)',
            feeAmount: '₹2,500',
            dueDate: '2026-10-16', // Due tomorrow
            displayDueDate: '16 Oct 2026',
            status: 'due_tomorrow',
            avatar: 'RK',
            attendance: [1, 2, 4, 5, 7, 8, 10, 11, 12, 13, 14]
        },
        'SFS002': {
            id: 'SFS002',
            password: 'pass123',
            phone: '9876543211', // Registered Mobile Number
            name: 'Anita Sharma',
            plan: 'Natural Yoga (Natural Yoga Madam)',
            feeAmount: '₹2,000',
            dueDate: '2026-10-28',
            displayDueDate: '28 Oct 2026',
            status: 'paid',
            avatar: 'AS',
            attendance: [2, 4, 6, 8, 10, 12, 14]
        },
        'SFS003': {
            id: 'SFS003',
            password: 'pass123',
            phone: '9876543212', // Registered Mobile Number
            name: 'Vikram Singh',
            plan: '120 Days Weight Loss Challenge',
            feeAmount: '₹12,000',
            dueDate: '2026-10-10', // Overdue
            displayDueDate: '10 Oct 2026',
            status: 'overdue',
            avatar: 'VS',
            attendance: [1, 3, 5, 7, 9, 11, 13]
        }
    };

    // Load or initialize LocalStorage Database (merging registered phone numbers)
    function getMembersDB() {
        const stored = localStorage.getItem('sfs_members_db');
        let db = initialMembersDB;
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                for (const key in initialMembersDB) {
                    if (parsed[key]) {
                        if (!parsed[key].phone) parsed[key].phone = initialMembersDB[key].phone;
                    } else {
                        parsed[key] = initialMembersDB[key];
                    }
                }
                db = parsed;
            } catch (e) {
                console.error('Error parsing sfs_members_db:', e);
            }
        }
        localStorage.setItem('sfs_members_db', JSON.stringify(db));
        return db;
    }

    function saveMembersDB(db) {
        localStorage.setItem('sfs_members_db', JSON.stringify(db));
    }

    /* ==========================================================================
       2. Sticky Navbar Scroll Effect & Active Link Observer
       ========================================================================== */
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    function handleNavbarScroll() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        let currentSection = '';
        const scrollPosition = window.scrollY + 200;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', handleNavbarScroll);
    handleNavbarScroll();

    /* ==========================================================================
       3. Mobile Navigation Drawer Toggle
       ========================================================================== */
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-links');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
            const icon = mobileToggle.querySelector('i');
            if (navMenu.classList.contains('open')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars-staggered';
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                const icon = mobileToggle.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-bars-staggered';
            });
        });
    }

    /* ==========================================================================
       4. Animated Stats Counter (Deep Maroon Numbers)
       ========================================================================== */
    const statsSection = document.getElementById('stats-counter');
    const statNumbers = document.querySelectorAll('.stat-number');
    let hasCounted = false;

    function startCounting() {
        statNumbers.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'), 10);
            const duration = 2000;
            const startTime = performance.now();

            function updateCounter(currentTime) {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                const easeProgress = 1 - (1 - progress) * (1 - progress);
                const currentValue = Math.floor(easeProgress * target);

                counter.textContent = currentValue.toLocaleString();

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString();
                }
            }

            requestAnimationFrame(updateCounter);
        });
    }

    if (statsSection) {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !hasCounted) {
                    hasCounted = true;
                    startCounting();
                }
            });
        }, { threshold: 0.4 });

        counterObserver.observe(statsSection);
    }

    /* ==========================================================================
       5. Gallery Filtering & Lightbox Modal
       ========================================================================== */
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-desc');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    let currentGalleryIndex = 0;
    const visibleGalleryData = [];

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filterValue === 'all' || filterValue === category) {
                    item.style.display = 'block';
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    function updateGalleryDataList() {
        visibleGalleryData.length = 0;
        galleryItems.forEach(item => {
            if (item.style.display !== 'none') {
                const img = item.querySelector('img');
                const title = item.querySelector('.gallery-item-title')?.textContent || '';
                const desc = item.querySelector('.gallery-item-desc')?.textContent || '';
                visibleGalleryData.push({
                    src: img.src,
                    alt: img.alt,
                    title: title,
                    desc: desc
                });
            }
        });
    }

    function openLightbox(index) {
        updateGalleryDataList();
        if (visibleGalleryData.length === 0) return;
        
        currentGalleryIndex = index;
        const data = visibleGalleryData[currentGalleryIndex];
        
        lightboxImg.src = data.src;
        lightboxImg.alt = data.alt;
        lightboxTitle.textContent = data.title;
        lightboxDesc.textContent = data.desc;
        
        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightboxModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            updateGalleryDataList();
            const imgSrc = item.querySelector('img').src;
            const dataIndex = visibleGalleryData.findIndex(d => d.src === imgSrc);
            openLightbox(dataIndex >= 0 ? dataIndex : 0);
        });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            currentGalleryIndex = (currentGalleryIndex - 1 + visibleGalleryData.length) % visibleGalleryData.length;
            const data = visibleGalleryData[currentGalleryIndex];
            lightboxImg.src = data.src;
            lightboxTitle.textContent = data.title;
            lightboxDesc.textContent = data.desc;
        });
    }

    if (lightboxNext) {
        lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            currentGalleryIndex = (currentGalleryIndex + 1) % visibleGalleryData.length;
            const data = visibleGalleryData[currentGalleryIndex];
            lightboxImg.src = data.src;
            lightboxTitle.textContent = data.title;
            lightboxDesc.textContent = data.desc;
        });
    }

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });
    }

    /* ==========================================================================
       6. Member Fee Status Search Lookup (Fees Section)
       ========================================================================== */
    const dueSearchInput = document.getElementById('due-search-input');
    const dueSearchBtn = document.getElementById('due-search-btn');
    const dueStatusResult = document.getElementById('due-status-result');

    function performFeeSearch() {
        const memberId = dueSearchInput.value.trim().toUpperCase();
        if (!memberId) {
            showToast('Enter Member ID', 'Please enter a valid Member ID e.g., SFS001.', true);
            return;
        }

        const db = getMembersDB();
        const member = db[memberId];

        if (!member) {
            dueStatusResult.innerHTML = `
                <div class="result-card" style="border-color: #A81B1B;">
                    <div class="result-info">
                        <h4>Member Not Found</h4>
                        <p>No record found for Member ID: <strong>${memberId}</strong>. Please check with front desk.</p>
                    </div>
                </div>
            `;
            return;
        }

        let statusBadgeHtml = '';
        if (member.status === 'due_tomorrow') {
            statusBadgeHtml = `<span class="status-badge status-due-tomorrow">⚠️ Due Tomorrow (${member.displayDueDate})</span>`;
        } else if (member.status === 'paid') {
            statusBadgeHtml = `<span class="status-badge status-paid">✅ Fee Paid (Due: ${member.displayDueDate})</span>`;
        } else {
            statusBadgeHtml = `<span class="status-badge status-overdue">🔴 Fee Overdue (${member.displayDueDate})</span>`;
        }

        dueStatusResult.innerHTML = `
            <div class="result-card">
                <div class="result-info">
                    <h4>${member.name} (${member.id})</h4>
                    <p>Enrolled Service: <strong>${member.plan}</strong> &bull; Monthly Fee: <strong>${member.feeAmount}</strong></p>
                </div>
                ${statusBadgeHtml}
            </div>
        `;
    }

    if (dueSearchBtn) dueSearchBtn.addEventListener('click', performFeeSearch);
    if (dueSearchInput) {
        dueSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performFeeSearch();
        });
    }

    /* ==========================================================================
       7. Daily Patient Login & Geolocation Attendance Controller
       ========================================================================== */
    const loginPanel = document.getElementById('login-panel');
    const memberDashboard = document.getElementById('member-dashboard');
    const loginForm = document.getElementById('attendance-login-form');
    const loginIdInput = document.getElementById('login-member-id');
    const loginPasswordInput = document.getElementById('login-password');
    const togglePasswordBtn = document.getElementById('toggle-password-btn');
    const togglePasswordIcon = document.getElementById('toggle-password-icon');
    const attendanceSubmitBtn = document.getElementById('attendance-submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');
    const logoutBtn = document.getElementById('logout-btn');
    const demoUserBtns = document.querySelectorAll('.demo-user-btn');

    // Location Status Banner Elements
    const loginLocationStatus = document.getElementById('login-location-status');
    const locationStatusIcon = document.getElementById('location-status-icon');
    const locationStatusTitle = document.getElementById('location-status-title');
    const locationStatusDesc = document.getElementById('location-status-desc');
    const gymRadiusLabel = document.getElementById('gym-radius-label');

    // Dashboard UI Elements
    const dashName = document.getElementById('dash-name');
    const dashId = document.getElementById('dash-id');
    const dashPlan = document.getElementById('dash-plan');
    const dashAvatar = document.getElementById('dash-avatar');
    const dashTimestamp = document.getElementById('dash-timestamp');
    const attendanceStatusBanner = document.getElementById('attendance-status-banner');
    const attendanceStatusIcon = document.getElementById('attendance-status-icon');
    const attendanceStatusHeading = document.getElementById('attendance-status-heading');
    const dashLocationMeta = document.getElementById('dash-location-meta');
    const dashDistance = document.getElementById('dash-distance');
    const docIdText = document.getElementById('doc-id-text');
    const feeDetailPlan = document.getElementById('fee-detail-plan');
    const feeDetailAmount = document.getElementById('fee-detail-amount');
    const feeDetailDueDate = document.getElementById('fee-detail-duedate');
    const feeDetailStatus = document.getElementById('fee-detail-status');
    const feeAlertBanner = document.getElementById('fee-alert-banner');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarMonthTitle = document.getElementById('calendar-month-title');

    // Admin Geofence Modal Elements
    const adminConfigBtn = document.getElementById('admin-config-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminModalClose = document.getElementById('admin-modal-close');
    const adminConfigForm = document.getElementById('admin-config-form');
    const adminPinInput = document.getElementById('admin-pin');
    const gymLatInput = document.getElementById('gym-latitude');
    const gymLngInput = document.getElementById('gym-longitude');
    const gymRadiusInput = document.getElementById('gym-radius');
    const gymTimezoneInput = document.getElementById('gym-timezone');
    const detectCoordsBtn = document.getElementById('detect-current-coords-btn');
    const simulatedLocationToggle = document.getElementById('simulated-location-toggle');

    // Initialize Gym Radius Label from stored config
    function refreshGymConfigUI() {
        if (window.SFSAttendanceService) {
            const cfg = window.SFSAttendanceService.getGymConfig();
            if (gymRadiusLabel) gymRadiusLabel.textContent = `${cfg.radiusMeters}m`;
            if (gymLatInput) gymLatInput.value = cfg.latitude;
            if (gymLngInput) gymLngInput.value = cfg.longitude;
            if (gymRadiusInput) gymRadiusInput.value = cfg.radiusMeters;
            if (gymTimezoneInput) gymTimezoneInput.value = cfg.timezone;
            if (simulatedLocationToggle) simulatedLocationToggle.checked = !!cfg.simulatedLocation;
        }
    }
    refreshGymConfigUI();

    // Toggle Password Visibility
    if (togglePasswordBtn && loginPasswordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = loginPasswordInput.type === 'password';
            loginPasswordInput.type = isPassword ? 'text' : 'password';
            if (togglePasswordIcon) {
                togglePasswordIcon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
            }
        });
    }

    // Click demo accounts switcher (Auto-fills both User ID and Mobile Number)
    demoUserBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const dataId = btn.getAttribute('data-id');
            const dataPhone = btn.getAttribute('data-phone');
            if (loginIdInput) loginIdInput.value = dataId;
            if (loginPasswordInput && dataPhone) loginPasswordInput.value = dataPhone;
            showToast('Demo Account Selected', `Patient ID: ${dataId} and registered mobile auto-filled.`);
        });
    });

    // Helper: Update Live Geolocation Status Box
    function setLocationStatus(state, title, desc) {
        if (!loginLocationStatus) return;
        loginLocationStatus.className = 'login-location-status ' + (state || '');
        if (locationStatusTitle) locationStatusTitle.textContent = title;
        if (locationStatusDesc) locationStatusDesc.innerHTML = desc;

        if (locationStatusIcon) {
            if (state === 'verifying') {
                locationStatusIcon.className = 'fa-solid fa-spinner fa-spin';
            } else if (state === 'verified') {
                locationStatusIcon.className = 'fa-solid fa-circle-check';
            } else if (state === 'failed') {
                locationStatusIcon.className = 'fa-solid fa-circle-xmark';
            } else {
                locationStatusIcon.className = 'fa-solid fa-location-crosshairs';
            }
        }
    }

    // Helper: Reset Submit Button State
    function resetSubmitButton() {
        if (!attendanceSubmitBtn) return;
        attendanceSubmitBtn.disabled = false;
        if (btnText) btnText.textContent = "Verify Location & Mark Attendance";
        if (btnIcon) btnIcon.className = "fa-solid fa-location-dot";
    }

    // Helper: Set Submit Button Loading
    function setSubmitButtonLoading(text) {
        if (!attendanceSubmitBtn) return;
        attendanceSubmitBtn.disabled = true;
        if (btnText) btnText.textContent = text;
        if (btnIcon) btnIcon.className = "fa-solid fa-spinner fa-spin";
    }

    /**
     * Primary Controller: Patient Daily Login & Location-Based Attendance
     */
    async function processPatientDailyLogin(patientId, mobilePassword) {
        // Step 1: Input Validation
        if (!patientId || !patientId.trim()) {
            showToast('Enter Patient ID', 'Please enter your registered Patient User ID (e.g., SFS001).', true);
            if (loginIdInput) loginIdInput.focus();
            return;
        }

        if (!mobilePassword || !mobilePassword.trim()) {
            showToast('Enter Mobile Number', 'Please enter your registered mobile number as password.', true);
            if (loginPasswordInput) loginPasswordInput.focus();
            return;
        }

        const cleanPatientId = patientId.trim().toUpperCase();
        const cleanPassword = mobilePassword.trim().replace(/[\s\-\(\)\+]/g, '');

        // Step 2: Patient Identity Verification
        const db = getMembersDB();
        const member = db[cleanPatientId];

        if (!member) {
            showToast('Patient Record Not Found', `No registered record found for User ID: ${cleanPatientId}. Check front desk.`, true);
            setLocationStatus('failed', 'Authentication Failed', `Patient record <strong>${cleanPatientId}</strong> does not exist in our database.`);
            return;
        }

        // Verify Registered Mobile Number (or legacy password)
        const memberPhoneClean = (member.phone || '').replace(/[\s\-\(\)\+]/g, '');
        const isPasswordValid = (cleanPassword === memberPhoneClean) || 
                                (cleanPassword === (member.password || '')) ||
                                (memberPhoneClean.endsWith(cleanPassword) && cleanPassword.length >= 10);

        if (!isPasswordValid) {
            showToast('Invalid Mobile Number', 'The mobile number provided does not match the registered record for this patient.', true);
            setLocationStatus('failed', 'Authentication Failed', 'The registered mobile number entered is incorrect. Please try again.');
            return;
        }

        // Map Patient ID to Firebase Auth Identity
        const firebaseIdentity = window.SFSAttendanceService ? 
            window.SFSAttendanceService.mapUserIdToEmail(cleanPatientId) : 
            `${cleanPatientId.toLowerCase()}@gym.saaifitness.internal`;
        console.log(`[SFS Auth] Mapped patient ${cleanPatientId} to Firebase identity: ${firebaseIdentity}`);

        // Step 3: Gym Location Verification
        setSubmitButtonLoading('Verifying GPS Geolocation...');
        setLocationStatus('verifying', 'Verifying Physical Location...', 'Acquiring device GPS coordinates to verify physical presence within gym premises...');

        let deviceCoords = null;
        try {
            if (!window.SFSAttendanceService) {
                throw new Error('Attendance service not initialized.');
            }
            deviceCoords = await window.SFSAttendanceService.getCurrentLocation();
        } catch (geoErr) {
            console.error('[SFS Geolocation Error]', geoErr);
            const errMsg = geoErr.message || 'Unable to retrieve location. Please permit GPS access.';
            setLocationStatus('failed', 'Location Verification Failed', errMsg);
            showToast('Location Verification Denied', errMsg, true);
            resetSubmitButton();
            return;
        }

        // Validate Great-Circle Distance via Haversine Formula
        const verification = window.SFSAttendanceService.verifyLocation(deviceCoords);
        if (!verification.isWithinRadius) {
            const failDesc = `You are currently <strong>${verification.distanceMeters}m</strong> away from Saai Fitness Studio premises. Daily attendance is strictly permitted within <strong>${verification.permittedRadius}m</strong>.`;
            setLocationStatus('failed', 'Outside Permitted Gym Radius', failDesc);
            showToast('Outside Gym Premises', `Location rejected: You are ${verification.distanceMeters}m away from the gym (allowed: ${verification.permittedRadius}m).`, true);
            resetSubmitButton();
            return;
        }

        setLocationStatus('verified', 'Location Verified: Inside Gym Premises', `Presence confirmed within permitted radius (~${verification.distanceMeters}m from studio center). Recording attendance...`);
        setSubmitButtonLoading('Recording Cloud Attendance...');

        // Step 4: Record Deterministic Attendance in Cloud Firestore
        let attendanceResult;
        try {
            attendanceResult = await window.SFSAttendanceService.recordDailyAttendance(member, verification);
        } catch (recordErr) {
            console.error('[SFS Attendance Record Error]', recordErr);
            showToast('Attendance Error', 'Failed to communicate with attendance server. Please retry.', true);
            resetSubmitButton();
            return;
        }

        resetSubmitButton();

        // Step 5: Populate Patient Dashboard
        dashName.textContent = member.name;
        dashId.textContent = member.id;
        dashPlan.textContent = member.plan;
        dashAvatar.textContent = member.avatar || member.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        
        const now = new Date();
        const gymConfig = window.SFSAttendanceService.getGymConfig();
        const displayDateTime = window.SFSAttendanceService.getGymFormattedTime(now, gymConfig.timezone);
        dashTimestamp.textContent = `Date & Time: ${displayDateTime} (${gymConfig.timezone})`;

        // Populate Location Verification Metadata
        if (dashDistance) dashDistance.textContent = `~${verification.distanceMeters}m`;
        if (docIdText) docIdText.textContent = `attendance/${attendanceResult.docId}`;

        // Configure Attendance Status Banner (Handling Already-Marked vs Newly-Marked)
        if (attendanceResult.alreadyMarked) {
            attendanceStatusBanner.className = 'attendance-status-badge already-marked';
            if (attendanceStatusHeading) attendanceStatusHeading.textContent = "Your attendance has already been marked for today.";
            if (attendanceStatusIcon) attendanceStatusIcon.className = "fa-solid fa-circle-info";
            showToast('Already Marked Today', 'Your attendance has already been marked for today.');
        } else {
            attendanceStatusBanner.className = 'attendance-status-badge';
            if (attendanceStatusHeading) attendanceStatusHeading.textContent = "Today's Attendance Recorded!";
            if (attendanceStatusIcon) attendanceStatusIcon.className = "fa-solid fa-circle-check";
            showToast('Attendance Marked!', `Welcome ${member.name}. Today's attendance recorded successfully.`);

            // Add today's day number to local calendar attendance array
            const todayDayNumber = now.getDate();
            if (!member.attendance.includes(todayDayNumber)) {
                member.attendance.push(todayDayNumber);
                db[member.id] = member;
                saveMembersDB(db);
            }
        }

        // Fee Deadline Alerts
        feeDetailPlan.textContent = member.plan;
        feeDetailAmount.textContent = member.feeAmount;
        feeDetailDueDate.textContent = member.displayDueDate;

        if (member.status === 'due_tomorrow') {
            feeAlertBanner.style.display = 'flex';
            feeAlertBanner.style.borderColor = 'var(--color-deep-maroon)';
            alertTitle.textContent = '⚠️ Fee Payment Due Tomorrow!';
            alertMessage.textContent = `Your fee payment of ${member.feeAmount} for ${member.plan} is due TOMORROW (${member.displayDueDate}). Please renew at the front desk or via UPI.`;
            feeDetailStatus.textContent = 'Due Tomorrow ⚠️';
            feeDetailStatus.className = 'status-badge status-due-tomorrow';
        } else if (member.status === 'overdue') {
            feeAlertBanner.style.display = 'flex';
            feeAlertBanner.style.borderColor = '#A81B1B';
            alertTitle.textContent = '🔴 URGENT: Fee Payment Overdue!';
            alertMessage.textContent = `Your fee payment of ${member.feeAmount} was due on ${member.displayDueDate}. Please clear your dues today to keep your attendance active.`;
            feeDetailStatus.textContent = 'Fee Overdue 🔴';
            feeDetailStatus.className = 'status-badge status-overdue';
        } else {
            feeAlertBanner.style.display = 'none';
            feeDetailStatus.textContent = 'Active / Paid ✅';
            feeDetailStatus.className = 'status-badge status-paid';
        }

        // Render Dynamic Monthly Calendar Grid
        renderCalendar(member.attendance);

        // Switch Views to Patient Dashboard
        loginPanel.style.display = 'none';
        memberDashboard.style.display = 'block';
    }

    /**
     * Renders Monthly Calendar Grid dynamically for the current month
     */
    function renderCalendar(attendanceDays) {
        calendarGrid.innerHTML = '';
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        if (calendarMonthTitle) {
            calendarMonthTitle.innerHTML = `<i class="fa-solid fa-calendar-days"></i> Monthly Attendance Log (${monthNames[month]} ${year})`;
        }

        // Day Headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(d => {
            const el = document.createElement('div');
            el.className = 'cal-day-name';
            el.textContent = d;
            calendarGrid.appendChild(el);
        });

        // First day of current month (0 = Sun, 1 = Mon, etc.)
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
        const currentDayNumber = now.getDate();

        // Empty cells for offset
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'cal-day empty';
            emptyCell.style.opacity = '0.2';
            calendarGrid.appendChild(emptyCell);
        }

        // Calendar Day Cells
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'cal-day';
            dayCell.textContent = day;

            if (attendanceDays && attendanceDays.includes(day)) {
                dayCell.classList.add('present'); // Highlighted in deep maroon
            }

            if (day === currentDayNumber) {
                dayCell.classList.add('today');
            }

            calendarGrid.appendChild(dayCell);
        }
    }

    // Form Submit Event
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const idVal = loginIdInput ? loginIdInput.value.trim() : '';
            const passVal = loginPasswordInput ? loginPasswordInput.value.trim() : '';
            processPatientDailyLogin(idVal, passVal);
        });
    }

    // Logout Action
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            memberDashboard.style.display = 'none';
            loginPanel.style.display = 'block';
            if (loginForm) loginForm.reset();
            setLocationStatus('', 'Gym Geolocation Verification Required', `Device GPS will verify presence within gym premises (<span id="gym-radius-label">${(window.SFSAttendanceService ? window.SFSAttendanceService.getGymConfig().radiusMeters : 150)}m</span> radius) upon login.`);
            resetSubmitButton();
            showToast('Logged Out', 'You have been logged out of your patient portal.');
        });
    }

    /* ==========================================================================
       Admin Geofence & Gym Location Configuration Modal Controller
       ========================================================================== */
    function openAdminModal() {
        refreshGymConfigUI();
        if (adminModal) {
            adminModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeAdminModal() {
        if (adminModal) {
            adminModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        if (adminConfigForm) adminConfigForm.reset();
    }

    if (adminConfigBtn) adminConfigBtn.addEventListener('click', openAdminModal);
    if (adminModalClose) adminModalClose.addEventListener('click', closeAdminModal);
    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) closeAdminModal();
        });
    }

    // Detect Admin Current GPS
    if (detectCoordsBtn) {
        detectCoordsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showToast('Not Supported', 'Geolocation is not supported by your browser.', true);
                return;
            }
            detectCoordsBtn.disabled = true;
            detectCoordsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching GPS...';

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (gymLatInput) gymLatInput.value = pos.coords.latitude.toFixed(6);
                    if (gymLngInput) gymLngInput.value = pos.coords.longitude.toFixed(6);
                    detectCoordsBtn.disabled = false;
                    detectCoordsBtn.innerHTML = '<i class="fa-solid fa-check"></i> GPS Coordinates Captured!';
                    showToast('Coordinates Updated', `Latitude: ${pos.coords.latitude.toFixed(4)}, Longitude: ${pos.coords.longitude.toFixed(4)}`);
                    setTimeout(() => {
                        detectCoordsBtn.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Set Coordinates to My Current Device GPS';
                    }, 2500);
                },
                (err) => {
                    detectCoordsBtn.disabled = false;
                    detectCoordsBtn.innerHTML = '<i class="fa-solid fa-crosshairs"></i> Set Coordinates to My Current Device GPS';
                    showToast('GPS Error', 'Could not retrieve device GPS: ' + err.message, true);
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        });
    }

    // Save Admin Configuration
    if (adminConfigForm) {
        adminConfigForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentConfig = window.SFSAttendanceService ? window.SFSAttendanceService.getGymConfig() : {};
            const enteredPin = adminPinInput ? adminPinInput.value.trim() : '';

            // Verify Security Passcode
            if (enteredPin !== (currentConfig.adminPin || 'admin123')) {
                showToast('Access Denied', 'Incorrect Admin Security Passcode. Default is admin123', true);
                if (adminPinInput) adminPinInput.focus();
                return;
            }

            const updatedConfig = Object.assign({}, currentConfig, {
                latitude: parseFloat(gymLatInput.value) || currentConfig.latitude,
                longitude: parseFloat(gymLngInput.value) || currentConfig.longitude,
                radiusMeters: parseInt(gymRadiusInput.value, 10) || currentConfig.radiusMeters,
                timezone: (gymTimezoneInput.value || currentConfig.timezone).trim(),
                simulatedLocation: simulatedLocationToggle ? simulatedLocationToggle.checked : false
            });

            if (window.SFSAttendanceService) {
                window.SFSAttendanceService.saveGymConfig(updatedConfig);
            }

            refreshGymConfigUI();
            closeAdminModal();
            showToast('Configuration Saved', `Gym radius updated to ${updatedConfig.radiusMeters}m. Geofence active.`);
        });
    }

    /* ==========================================================================
       8. Booking Modal Controller
       ========================================================================== */
    const bookingModal = document.getElementById('booking-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const bookingBtns = document.querySelectorAll('.open-booking-modal');
    const modalSelect = document.getElementById('modal-selection');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');

    bookingBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const trainer = btn.getAttribute('data-trainer');
            const plan = btn.getAttribute('data-plan');

            if (trainer) {
                modalTitle.textContent = `Book PT with ${trainer}`;
                if (modalSelect) {
                    for (let opt of modalSelect.options) {
                        if (opt.value.includes(trainer)) {
                            opt.selected = true;
                            break;
                        }
                    }
                }
            } else if (plan) {
                modalTitle.textContent = `Join ${plan}`;
                if (modalSelect) {
                    for (let opt of modalSelect.options) {
                        if (opt.value.includes(plan)) {
                            opt.selected = true;
                            break;
                        }
                    }
                }
            } else {
                modalTitle.textContent = 'Join Saai Fitness Studio';
            }

            bookingModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeBookingModal() {
        bookingModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeBookingModal);

    if (bookingModal) {
        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) closeBookingModal();
        });
    }

    if (modalForm) {
        modalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            closeBookingModal();
            showToast('Registration Received', 'Our admissions desk will contact you shortly.');
            modalForm.reset();
        });
    }

    /* ==========================================================================
       9. Enquiry Form & Newsletter Submission
       ========================================================================== */
    const enquiryForm = document.getElementById('enquiry-form');
    const newsletterForm = document.getElementById('newsletter-form');

    if (enquiryForm) {
        enquiryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('enquiry-name');
            const phoneInput = document.getElementById('enquiry-phone');

            if (!nameInput.value.trim() || !phoneInput.value.trim()) {
                showToast('Validation Error', 'Please enter your Name and Phone Number.', true);
                return;
            }

            showToast('Enquiry Submitted!', `Thank you, ${nameInput.value}. Velu Master's team will call you back.`);
            enquiryForm.reset();
        });
    }

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Subscribed', 'You have been added to our fitness bulletin.');
            newsletterForm.reset();
        });
    }

    /* ==========================================================================
       10. Toast Notification Helper
       ========================================================================== */
    function showToast(title, message, isError = false) {
        const toastCard = document.getElementById('toast-card');
        const toastTitle = document.getElementById('toast-title');
        const toastMessage = document.getElementById('toast-message');
        const toastIcon = toastCard.querySelector('.toast-icon i');

        toastTitle.textContent = title;
        toastMessage.textContent = message;

        if (isError) {
            toastCard.style.borderColor = '#A81B1B';
            toastIcon.className = 'fa-solid fa-circle-exclamation';
            toastIcon.style.color = '#A81B1B';
        } else {
            toastCard.style.borderColor = 'var(--color-deep-maroon)';
            toastIcon.className = 'fa-solid fa-circle-check';
            toastIcon.style.color = 'var(--color-deep-maroon)';
        }

        toastCard.classList.add('show');

        setTimeout(() => {
            toastCard.classList.remove('show');
        }, 4000);
    }

    /* ==========================================================================
       11. Scroll Reveal Observer
       ========================================================================== */
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // Keyboard ESC shortcut to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLightbox();
            closeBookingModal();
            closeAdminModal();
        }
    });

});
