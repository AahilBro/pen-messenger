// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCjhsLsqbJqO4LFCFHVPC0hzM8lNSl5hhE",
  authDomain: "the-pen-messenger.firebaseapp.com",
  projectId: "the-pen-messenger",
  storageBucket: "the-pen-messenger.firebasestorage.app",
  messagingSenderId: "935160308369",
  appId: "1:935160308369:web:e6f87789a64538f74ad530"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI Elements
const loginSection = document.getElementById("login-section");
const penIdSection = document.getElementById("penId-section");
const chatSection = document.getElementById("chat-section");

const googleSignInBtn = document.getElementById("googleSignInBtn");
const penIdInput = document.getElementById("penIdInput");
const sitePasswordInput = document.getElementById("sitePasswordInput");
const penIdSubmitBtn = document.getElementById("penIdSubmitBtn");
const penIdError = document.getElementById("penIdError");

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const changePenNameBtn = document.getElementById("changePenNameBtn");

// Globals
let currentUser = null;
let currentPenName = "";
const SITE_PASSWORD = "ink"; // Your site password!

// Helper to switch visible screen
function showScreen(screen) {
  [loginSection, penIdSection, chatSection].forEach(sec => sec.classList.remove("active"));
  screen.classList.add("active");
}

// Show welcome popup
function showWelcome(name) {
  alert(`Welcome! ${name}`);
}

// GOOGLE SIGN IN
googleSignInBtn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    currentUser = result.user;
    showWelcome(currentUser.displayName);
    showScreen(penIdSection);
  } catch (error) {
    alert("Google sign-in failed: " + error.message);
  }
};

// PEN NAME & PASSWORD SUBMIT
penIdSubmitBtn.onclick = () => {
  const penName = penIdInput.value.trim();
  const password = sitePasswordInput.value;

  if (!penName) {
    penIdError.textContent = "Please enter your Pen Name.";
    return;
  }
  if (password !== SITE_PASSWORD) {
    penIdError.textContent = "Wrong site password.";
    return;
  }

  currentPenName = penName;
  penIdError.textContent = "";
  showScreen(chatSection);
  listenForMessages();
};

// LISTEN FOR NEW MESSAGES
function listenForMessages() {
  db.collection("messages")
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = "";
      snapshot.forEach(doc => {
        const msg = doc.data();
        const time = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : "";
        const div = document.createElement("div");
        div.textContent = `[${time}] ${msg.penName}: ${msg.message}`;
        messagesDiv.appendChild(div);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// SEND MESSAGE
sendMessageBtn.onclick = async () => {
  const text = messageInput.value.trim();
  if (!text) return;

  try {
    await db.collection("messages").add({
      uid: currentUser.uid,
      penName: currentPenName,
      message: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
    messageInput.value = "";
  } catch (e) {
    alert("Error sending message: " + e.message);
  }
};

// CHANGE PEN NAME
changePenNameBtn.onclick = () => {
  currentPenName = "";
  penIdInput.value = "";
  sitePasswordInput.value = "";
  messageInput.value = "";
  messagesDiv.innerHTML = "";
  showScreen(penIdSection);
};

// On page load, show login screen
showScreen(loginSection);
