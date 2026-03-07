// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyApSHpM9dtU_SVAPAiS_ZYXaFOQ6JqQd_U",
    authDomain: "clubcalender-cdb0a.firebaseapp.com",
    projectId: "clubcalender-cdb0a",
    storageBucket: "clubcalender-cdb0a.firebasestorage.app",
    messagingSenderId: "462718778492",
    appId: "1:462718778492:web:c871750b6f12344fbe9df9",
    measurementId: "G-G0YDY06DM1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- 2. APP STATE ---
let nav = 0;
let clickedDate = null;
let currentUser = { isLoggedIn: false, clubName: '', userName: '' };
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- 3. DYNAMIC UI INITIALIZATION ---
async function fetchClubsIntoDropdown() {
    const dropdown = document.getElementById('loginClub');
    dropdown.innerHTML = '<option value="" disabled selected>Select Your Club</option>';
    
    try {
        const snapshot = await db.collection('users').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = data.clubName;
            option.innerText = data.clubName;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching clubs:", error);
    }
}

// --- 4. AUTHENTICATION LOGIC ---
function showLoginModal() {
    fetchClubsIntoDropdown();
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('modalBackdrop').style.display = 'block';
}

async function handleAuth() {
    const club = document.getElementById('loginClub').value;
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;

    const snapshot = await db.collection('users')
        .where('clubName', '==', club)
        .where('username', '==', user)
        .where('password', '==', pass)
        .get();

    if (!snapshot.empty) {
        currentUser = { isLoggedIn: true, clubName: club, userName: user };
        document.getElementById('login-trigger-btn').classList.add('hidden');
        document.getElementById('admin-controls').classList.remove('hidden');
        document.getElementById('admin-msg').innerText = `${user} (${club})`;
        closeAllModals();
        load();
    } else {
        alert("Authentication failed.");
    }
}

function logout() {
    currentUser = { isLoggedIn: false, clubName: '', userName: '' };
    document.getElementById('login-trigger-btn').classList.remove('hidden');
    document.getElementById('admin-controls').classList.add('hidden');
    load();
}

// --- 5. CALENDAR ENGINE ---
function load() {
    const dt = new Date();
    if (nav !== 0) dt.setMonth(new Date().getMonth() + nav);

    const month = dt.getMonth();
    const year = dt.getFullYear();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dateString = firstDay.toLocaleDateString('en-us', { weekday: 'long' });
    const paddingDays = weekdays.indexOf(dateString);

    document.getElementById('monthDisplay').innerText = 
        `${dt.toLocaleDateString('en-us', { month: 'long' })} ${year}`;

    const calendar = document.getElementById('calendar');
    
    db.collection('events').onSnapshot((snapshot) => {
        const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        calendar.innerHTML = ''; 

        for(let i = 1; i <= paddingDays + daysInMonth; i++) {
            const daySquare = document.createElement('div');
            daySquare.classList.add('day');
            const dayString = `${month + 1}/${i - paddingDays}/${year}`;

            if (i > paddingDays) {
                daySquare.innerText = i - paddingDays;
                const dayEvents = allEvents.filter(e => e.date === dayString);
                
                dayEvents.forEach(e => {
                    const div = document.createElement('div');
                    div.classList.add('event-label');
                    div.innerHTML = `<span class="club-tag">${e.club}</span> ${e.title}`;
                    daySquare.appendChild(div);
                });

                daySquare.onclick = () => openEventModal(dayString, dayEvents);
            } else {
                daySquare.classList.add('padding');
            }
            calendar.appendChild(daySquare);
        }
    });
}

// --- 6. EVENT MANAGEMENT ---
function openEventModal(date, dayEvents) {
    clickedDate = date;
    document.getElementById('modalDateTitle').innerText = `Events for ${date}`;
    
    const adminForm = document.getElementById('admin-only-form');
    if (currentUser.isLoggedIn) {
        adminForm.classList.remove('hidden');
        document.getElementById('posting-as').innerText = `Posting as: ${currentUser.clubName}`;
    } else {
        adminForm.classList.add('hidden');
    }

    renderEventItems(dayEvents);
    document.getElementById('newEventModal').style.display = 'block';
    document.getElementById('modalBackdrop').style.display = 'block';
}

function renderEventItems(dayEvents) {
    const list = document.getElementById('existing-events-list');
    list.innerHTML = dayEvents.length === 0 ? '<p>No events scheduled.</p>' : '';
    
    dayEvents.forEach(e => {
        const item = document.createElement('div');
        item.className = 'event-item';
        const canDelete = currentUser.isLoggedIn && (e.club === currentUser.clubName);
        
        // Use the formatTime12hr function for both start and end times
        const startTimeFormatted = formatTime12hr(e.startTime);
        const endTimeFormatted = formatTime12hr(e.endTime);
        const timeText = `${startTimeFormatted} - ${endTimeFormatted}`;

        item.innerHTML = `
            <div class="event-info">
                <strong>${e.club}</strong>: ${e.title}
                <span class="event-time-span">⏰ ${timeText}</span>
            </div>
            ${canDelete ? `<button class="del-btn" onclick="deleteEvent('${e.id}')">Delete</button>` : ''}
        `;
        list.appendChild(item);
    });
}

async function saveEvent() {
    const titleInput = document.getElementById('eventTitleInput');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');

    if (titleInput.value && startTimeInput.value && endTimeInput.value && currentUser.isLoggedIn) {
        await db.collection('events').add({
            date: clickedDate,
            title: titleInput.value,
            startTime: startTimeInput.value,
            endTime: endTimeInput.value,
            club: currentUser.clubName,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Reset inputs
        titleInput.value = '';
        startTimeInput.value = '';
        endTimeInput.value = '';
        
        closeAllModals();
    } else {
        alert("Please fill in the event name and both start/end times.");
    }
}

async function deleteEvent(id) {
    if(confirm("Permanently delete this event?")) {
        await db.collection('events').doc(id).delete();
        closeAllModals();
    }
}

// --- 7. UI CONTROLS ---
function closeAllModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('newEventModal').style.display = 'none';
    document.getElementById('modalBackdrop').style.display = 'none';
}

document.getElementById('backButton').onclick = () => { nav--; load(); };
document.getElementById('nextButton').onclick = () => { nav++; load(); };

load();
function formatTime12hr(timeString) {
    if (!timeString) return "Time not set";
    
    let [hours, minutes] = timeString.split(':');
    let ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'
    
    return `${hours}:${minutes} ${ampm}`;
}