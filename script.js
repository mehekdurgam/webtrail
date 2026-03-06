let nav = 0;
let clickedDate = null;
let events = localStorage.getItem('clubEvents') ? JSON.parse(localStorage.getItem('clubEvents')) : [];

// Current session state
let currentUser = {
    isLoggedIn: false,
    clubName: '',
    userName: ''
};

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- AUTHENTICATION ---
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('modalBackdrop').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('modalBackdrop').style.display = 'none';
}

function handleAuth() {
    const club = document.getElementById('loginClub').value.trim();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;

    if (pass === "college123" && club !== "" && user !== "") {
        currentUser = { isLoggedIn: true, clubName: club, userName: user };
        
        document.getElementById('login-trigger-btn').classList.add('hidden');
        document.getElementById('admin-controls').classList.remove('hidden');
        document.getElementById('admin-msg').innerText = `President: ${user} (${club})`;
        
        closeLoginModal();
        load(); // Refresh to enable interaction
    } else {
        alert("Please fill all fields. Password is 'college123'");
    }
}

function logout() {
    currentUser = { isLoggedIn: false, clubName: '', userName: '' };
    document.getElementById('login-trigger-btn').classList.remove('hidden');
    document.getElementById('admin-controls').classList.add('hidden');
    load();
}

// --- CALENDAR LOGIC ---
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
    calendar.innerHTML = '';

    for(let i = 1; i <= paddingDays + daysInMonth; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day');
        const dayString = `${month + 1}/${i - paddingDays}/${year}`;

        if (i > paddingDays) {
            daySquare.innerText = i - paddingDays;
            
            const dayEvents = events.filter(e => e.date === dayString);
            dayEvents.forEach(e => {
                const div = document.createElement('div');
                div.classList.add('event-label');
                div.innerHTML = `<span class="club-tag">${e.club}</span>${e.title}`;
                daySquare.appendChild(div);
            });

            daySquare.onclick = () => openModal(dayString);
        } else {
            daySquare.classList.add('padding');
        }
        calendar.appendChild(daySquare);
    }
}

function openModal(date) {
    clickedDate = date;
    document.getElementById('modalDateTitle').innerText = `Events: ${date}`;
    
    const adminForm = document.getElementById('admin-only-form');
    if (currentUser.isLoggedIn) {
        adminForm.classList.remove('hidden');
        document.getElementById('posting-as').innerText = `Posting as: ${currentUser.clubName}`;
    } else {
        adminForm.classList.add('hidden');
    }

    renderEventList();
    document.getElementById('newEventModal').style.display = 'block';
    document.getElementById('modalBackdrop').style.display = 'block';
}

function renderEventList() {
    const list = document.getElementById('existing-events-list');
    const dayEvents = events.filter(e => e.date === clickedDate);
    list.innerHTML = dayEvents.length === 0 ? '<p>No events today.</p>' : '';
    
    dayEvents.forEach(e => {
        const item = document.createElement('div');
        item.className = 'event-item';
        // Only allow deletion if the logged-in club matches the event's club
        const canDelete = currentUser.isLoggedIn && (e.club === currentUser.clubName);
        
        item.innerHTML = `
            <div><strong>${e.club}</strong>: ${e.title}</div>
            ${canDelete ? `<button class="del-btn" onclick="deleteEvent('${e.title}', '${e.date}')">Delete</button>` : ''}
        `;
        list.appendChild(item);
    });
}

function saveEvent() {
    const titleInput = document.getElementById('eventTitleInput');
    if (titleInput.value) {
        events.push({ 
            date: clickedDate, 
            title: titleInput.value, 
            club: currentUser.clubName 
        });
        localStorage.setItem('clubEvents', JSON.stringify(events));
        titleInput.value = '';
        renderEventList();
        load();
    }
}

function deleteEvent(title, date) {
    // Filter out the specific event
    events = events.filter(e => !(e.title === title && e.date === date));
    localStorage.setItem('clubEvents', JSON.stringify(events));
    renderEventList();
    load();
}

function closeModal() {
    document.getElementById('newEventModal').style.display = 'none';
    document.getElementById('modalBackdrop').style.display = 'none';
}

function closeAllModals() {
    closeModal();
    closeLoginModal();
}

document.getElementById('backButton').onclick = () => { nav--; load(); };
document.getElementById('nextButton').onclick = () => { nav++; load(); };

load();