// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCjhsLsqbJqO4LFCFHVPC0hzM8lNSl5hhE",
  authDomain: "the-pen-messenger.firebaseapp.com",
  projectId: "the-pen-messenger",
  storageBucket: "the-pen-messenger.firebasestorage.app",
  messagingSenderId: "935853489880",
  appId: "1:935853489880:web:1a9e282058f45a98f87102"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// UI Elements
const loginSection = document.getElementById('login-section');
const penIdSection = document.getElementById('penId-section');
const chatSection = document.getElementById('chat-section');

const googleSignInBtn = document.getElementById('googleSignInBtn');
const penIdInput = document.getElementById('penIdInput');
const sitePasswordInput = document.getElementById('sitePasswordInput');
const penIdSubmitBtn = document.getElementById('penIdSubmitBtn');
const penIdError = document.getElementById('penIdError');

const dmMessagesDiv = document.getElementById('dm-messages');
const groupMessagesDiv = document.getElementById('group-messages');
const membersDiv = document.getElementById('members');

const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

const groupMessageInput = document.getElementById('groupMessageInput');
const sendGroupMessageBtn = document.getElementById('sendGroupMessageBtn');

const changePenNameBtn = document.getElementById('changePenNameBtn');
const logoutBtn = document.getElementById('logoutBtn'); // optional logout button

// Globals
let currentUser = null;
let currentPenName = null;
const SITE_PASSWORD = "ink";  // change this to your real password!

// --- Helper functions ---

function createPenBadge(penName) {
  const badge = document.createElement('div');
  badge.classList.add('pen-badge');
  const initials = penName.trim().slice(0, 2).toUpperCase();
  badge.textContent = initials;
  return badge;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function showSection(section) {
  [loginSection, penIdSection, chatSection].forEach(s => {
    s.classList.remove('active');
  });
  section.classList.add('active');
}

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// --- Authentication ---

googleSignInBtn.onclick = async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (err) {
    alert("Google sign-in failed: " + err.message);
  }
};

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    showSection(penIdSection);
  } else {
    currentUser = null;
    currentPenName = null;
    showSection(loginSection);
  }
});

// --- PenName + site password ---

penIdSubmitBtn.onclick = () => {
  penIdError.textContent = "";
  const pen = penIdInput.value.trim();
  const password = sitePasswordInput.value;

  if (pen.length < 2) {
    penIdError.textContent = "Pen Name must be at least 2 characters";
    return;
  }
  if (password !== SITE_PASSWORD) {
    penIdError.textContent = "Incorrect site password";
    return;
  }

  currentPenName = pen;
  db.collection('users').doc(currentUser.uid).set({
    penName: currentPenName,
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true })
  .then(() => {
    showSection(chatSection);
    loadMembers();
    listenGroupMessages();
    listenUserMessages();
    updatePresence();
  })
  .catch(err => {
    penIdError.textContent = "Error saving penName: " + err.message;
  });
};

changePenNameBtn.onclick = () => {
  if (confirm("Change Pen Name? This will log you out.")) {
    auth.signOut();
    location.reload();
  }
};

// Optional logout button
if (logoutBtn) {
  logoutBtn.onclick = () => {
    auth.signOut();
  };
}

// --- Presence update ---

function updatePresence() {
  if (!currentUser) return;
  const userRef = db.collection('users').doc(currentUser.uid);

  userRef.update({
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(() => {
    userRef.set({
      penName: currentPenName,
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  setInterval(() => {
    userRef.update({
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });
  }, 30000);
}

// --- Load members ---

function loadMembers() {
  db.collection('users')
    .orderBy('penName')
    .onSnapshot(snapshot => {
      clearElement(membersDiv);
      snapshot.forEach(doc => {
        const user = doc.data();
        if (!user.penName) return;
        const lastActive = user.lastActive?.toDate() || new Date(0);
        const isOnline = (new Date() - lastActive) < 2 * 60 * 1000;

        const memberDiv = document.createElement('div');
        memberDiv.classList.add('member');

        const badge = createPenBadge(user.penName);
        memberDiv.appendChild(badge);

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('pen-name');
        nameSpan.textContent = user.penName + (isOnline ? " (online)" : "");
        memberDiv.appendChild(nameSpan);

        membersDiv.appendChild(memberDiv);
      });
    });
}

// --- Listen for DM messages (all DMs visible for now) ---

function listenUserMessages() {
  db.collection('dmMessages')
    .orderBy('timestamp')
    .limit(100)
    .onSnapshot(snapshot => {
      clearElement(dmMessagesDiv);
      snapshot.forEach(doc => {
        const msg = doc.data();
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');

        const badge = createPenBadge(msg.penName);
        badge.style.float = 'left';
        badge.style.marginRight = '8px';
        msgDiv.appendChild(badge);

        const textSpan = document.createElement('span');
        textSpan.textContent = `${msg.penName}: ${msg.text}`;
        msgDiv.appendChild(textSpan);

        const timeSpan = document.createElement('div');
        timeSpan.style.fontSize = '0.7em';
        timeSpan.style.color = '#999';
        timeSpan.style.clear = 'both';
        timeSpan.textContent = formatTimestamp(msg.timestamp);
        msgDiv.appendChild(timeSpan);

        dmMessagesDiv.appendChild(msgDiv);
      });
      dmMessagesDiv.scrollTop = dmMessagesDiv.scrollHeight;
    });
}

// --- Listen for group messages ---

function listenGroupMessages() {
  db.collection('groupMessages')
    .orderBy('timestamp')
    .limit(100)
    .onSnapshot(snapshot => {
      clearElement(groupMessagesDiv);
      snapshot.forEach(doc => {
        const msg = doc.data();
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');

        const badge = createPenBadge(msg.penName);
        badge.style.float = 'left';
        badge.style.marginRight = '8px';
        msgDiv.appendChild(badge);

        const textSpan = document.createElement('span');
        textSpan.textContent = `${msg.penName}: ${msg.text}`;
        msgDiv.appendChild(textSpan);

        const timeSpan = document.createElement('div');
        timeSpan.style.fontSize = '0.7em';
        timeSpan.style.color = '#999';
        timeSpan.style.clear = 'both';
        timeSpan.textContent = formatTimestamp(msg.timestamp);
        msgDiv.appendChild(timeSpan);

        groupMessagesDiv.appendChild(msgDiv);
      });
      groupMessagesDiv.scrollTop = groupMessagesDiv.scrollHeight;
    });
}

// --- Send DM message ---

sendMessageBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text || !currentUser || !currentPenName) return;

  db.collection('dmMessages').add({
    uid: currentUser.uid,
    penName: currentPenName,
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    messageInput.value = '';
  }).catch(err => {
    alert("Failed to send DM message: " + err.message);
  });
};

// --- Send Group message ---

sendGroupMessageBtn.onclick = () => {
  const text = groupMessageInput.value.trim();
  if (!text || !currentUser ||
!currentPenName) return;

db.collection('groupMessages').add({
uid: currentUser.uid,
penName: currentPenName,
text,
timestamp: firebase.firestore.FieldValue.serverTimestamp()
}).then(() => {
groupMessageInput.value = '';
}).catch(err => {
alert("Failed to send group message: " + err.message);
});
};
