import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// =====================================================
// ELEMENTS
// =====================================================

const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const chatScreen = document.getElementById("chatScreen");

const loginBox = document.getElementById("loginBox");
const signupBox = document.getElementById("signupBox");

const message = document.getElementById("message");


// =====================================================
// CURRENT USER
// =====================================================

let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null;
let unsubscribeFriends = null;


// =====================================================
// SHOW SIGNUP
// =====================================================

document
  .getElementById("showSignup")
  .addEventListener("click", () => {

    loginBox.classList.add("hidden");
    signupBox.classList.remove("hidden");

    message.textContent = "";
  });


// =====================================================
// SHOW LOGIN
// =====================================================

document
  .getElementById("showLogin")
  .addEventListener("click", () => {

    signupBox.classList.add("hidden");
    loginBox.classList.remove("hidden");

    message.textContent = "";
  });


// =====================================================
// SIGN UP
// =====================================================

document
  .getElementById("signupBtn")
  .addEventListener("click", async () => {

    const usernameInput =
      document.getElementById("signupUsername");

    const emailInput =
      document.getElementById("signupEmail");

    const passwordInput =
      document.getElementById("signupPassword");

    const username =
      usernameInput.value.trim().toLowerCase();

    const email =
      emailInput.value.trim().toLowerCase();

    const password =
      passwordInput.value;

    if (!/^[a-z0-9]{8,30}$/.test(username)) {

      message.textContent =
        "Username must be 8-30 letters and numbers only.";

      return;
    }

    if (!email || !email.includes("@")) {

      message.textContent =
        "Enter a valid email address.";

      return;
    }

    if (password.length < 8) {

      message.textContent =
        "Password must be at least 8 characters.";

      return;
    }

    try {

      message.textContent =
        "Creating account...";

      const result =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const uid =
        result.user.uid;

      await setDoc(
        doc(db, "users", uid),
        {
          username: username,
          usernameLower: username,
          createdAt: serverTimestamp()
        }
      );

      await setDoc(
        doc(db, "usernames", username),
        {
          uid: uid
        }
      );

      message.textContent =
        "Account created successfully!";

    } catch (error) {

      console.error(
        "SIGNUP ERROR:",
        error
      );

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {

        message.textContent =
          "This email is already registered.";

      } else if (
        error.code ===
        "auth/weak-password"
      ) {

        message.textContent =
          "Password is too weak.";

      } else {

        message.textContent =
          error.message;
      }
    }
  });


// =====================================================
// LOGIN
// =====================================================

document
  .getElementById("loginBtn")
  .addEventListener("click", async () => {

    const email =
      document
        .getElementById("loginEmail")
        .value
        .trim()
        .toLowerCase();

    const password =
      document
        .getElementById("loginPassword")
        .value;

    if (!email || !password) {

      message.textContent =
        "Enter email and password.";

      return;
    }

    try {

      message.textContent =
        "Logging in...";

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      message.textContent =
        "Login successful!";

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      message.textContent =
        "Invalid email or password.";
    }
  });


// =====================================================
// FORGOT PASSWORD
// =====================================================

document
  .getElementById("forgotBtn")
  .addEventListener("click", async () => {

    const email =
      document
        .getElementById("loginEmail")
        .value
        .trim()
        .toLowerCase();

    if (!email) {

      message.textContent =
        "Enter your email first.";

      return;
    }

    try {

      await sendPasswordResetEmail(
        auth,
        email
      );

      message.textContent =
        "Password reset email sent!";

    } catch (error) {

      console.error(
        "RESET ERROR:",
        error
      );

      message.textContent =
        "Could not send reset email.";
    }
  });


// =====================================================
// AUTH STATE
// =====================================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (user) {

      currentUser = user;

      console.log(
        "Logged in:",
        user.email
      );

      authScreen.classList.add("hidden");
      chatScreen.classList.add("hidden");
      appScreen.classList.remove("hidden");

      loadFriends();

    } else {

      currentUser = null;

      if (unsubscribeFriends) {
        unsubscribeFriends();
        unsubscribeFriends = null;
      }

      if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
      }

      currentChatId = null;

      authScreen.classList.remove("hidden");
      appScreen.classList.add("hidden");
      chatScreen.classList.add("hidden");
    }
  }
);


// =====================================================
// SEARCH USER
// =====================================================

document
  .getElementById("searchBtn")
  .addEventListener(
    "click",
    searchUser
  );


document
  .getElementById("searchUsername")
  .addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Enter") {
        searchUser();
      }
    }
  );


// =====================================================
// SEARCH USER FUNCTION
// =====================================================

async function searchUser() {

  const input =
    document.getElementById(
      "searchUsername"
    );

  const resultBox =
    document.getElementById(
      "searchResult"
    );

  const username =
    input.value
      .trim()
      .toLowerCase();

  resultBox.innerHTML = "";

  if (!username) {

    resultBox.innerHTML =
      `<div class="error">
        Enter a username.
      </div>`;

    return;
  }

  if (!/^[a-z0-9]{8,30}$/.test(username)) {

    resultBox.innerHTML =
      `<div class="error">
        Username must be 8-30 letters and numbers.
      </div>`;

    return;
  }

  try {

    resultBox.innerHTML =
      `<div>Searching...</div>`;

    const usernameDoc =
      await getDoc(
        doc(
          db,
          "usernames",
          username
        )
      );

    if (!usernameDoc.exists()) {

      resultBox.innerHTML =
        `<div class="error">
          User not found.
        </div>`;

      return;
    }

    const userData =
      usernameDoc.data();

    const uid =
      userData.uid;

    if (
      currentUser &&
      uid === currentUser.uid
    ) {

      resultBox.innerHTML =
        `<div class="error">
          That's your own username.
        </div>`;

      return;
    }

    const userDoc =
      await getDoc(
        doc(
          db,
          "users",
          uid
        )
      );

    if (!userDoc.exists()) {

      resultBox.innerHTML =
        `<div class="error">
          User profile not found.
        </div>`;

      return;
    }

    const profile =
      userDoc.data();

    resultBox.innerHTML = `

      <div class="user-result">

        <div class="user-info">

          <strong>
            ${escapeHTML(profile.username)}
          </strong>

          <span>
            Chat Wave user
          </span>

        </div>

        <button
          class="chat-button"
          id="startChatBtn"
        >
          Chat
        </button>

      </div>
    `;

    document
      .getElementById("startChatBtn")
      .addEventListener(
        "click",
        () => {

          openChat(
            uid,
            profile.username
          );
        }
      );

  } catch (error) {

    console.error(
      "SEARCH ERROR:",
      error
    );

    resultBox.innerHTML =
      `<div class="error">
        Search failed. Check Firebase rules.
      </div>`;
  }
}


// =====================================================
// CREATE SAME CHAT ID FOR BOTH USERS
// =====================================================

function makeChatId(
  uid1,
  uid2
) {

  return [
    uid1,
    uid2
  ]
    .sort()
    .join("_");
}


// =====================================================
// OPEN PRIVATE CHAT
// =====================================================

async function openChat(
  otherUserId,
  otherUsername
) {

  if (!currentUser) {
    return;
  }

  try {

    currentChatId =
      makeChatId(
        currentUser.uid,
        otherUserId
      );

    const chatRef =
      doc(
        db,
        "chats",
        currentChatId
      );

    await setDoc(
      chatRef,
      {
        participants: [
          currentUser.uid,
          otherUserId
        ],

        createdAt:
          serverTimestamp(),

        lastMessage: "",

        lastMessageAt:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    appScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    document
      .getElementById("chatUsername")
      .textContent =
      otherUsername;

    listenForMessages();

  } catch (error) {

    console.error(
      "OPEN CHAT ERROR:",
      error
    );

    alert(
      "Could not open chat: " +
      error.message
    );
  }
}


// =====================================================
// REAL-TIME MESSAGES
// =====================================================

function listenForMessages() {

  const messagesBox =
    document.getElementById(
      "messages"
    );

  messagesBox.innerHTML = "";

  if (unsubscribeMessages) {

    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  const messagesRef =
    collection(
      db,
      "chats",
      currentChatId,
      "messages"
    );

  const messagesQuery =
    query(
      messagesRef,
      orderBy(
        "createdAt",
        "asc"
      )
    );

  unsubscribeMessages =
    onSnapshot(

      messagesQuery,

      (snapshot) => {

        messagesBox.innerHTML = "";

        snapshot.forEach(
          (messageDoc) => {

            const data =
              messageDoc.data();

            const messageDiv =
              document.createElement(
                "div"
              );

            const mine =
              data.senderId ===
              currentUser.uid;

            messageDiv.className =
              mine
                ? "message mine"
                : "message";

            const bubble =
              document.createElement(
                "div"
              );

            bubble.className =
              "bubble";

            bubble.textContent =
              data.text || "";

            messageDiv.appendChild(
              bubble
            );

            messagesBox.appendChild(
              messageDiv
            );
          }
        );

        messagesBox.scrollTop =
          messagesBox.scrollHeight;
      },

      (error) => {

        console.error(
          "REALTIME MESSAGE ERROR:",
          error
        );
      }
    );
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage() {

  if (
    !currentUser ||
    !currentChatId
  ) {
    return;
  }

  const input =
    document.getElementById(
      "messageInput"
    );

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  try {

    input.disabled = true;

    const messagesRef =
      collection(
        db,
        "chats",
        currentChatId,
        "messages"
      );

    await addDoc(
      messagesRef,
      {
        senderId:
          currentUser.uid,

        text:
          text,

        createdAt:
          serverTimestamp()
      }
    );

    await setDoc(
      doc(
        db,
        "chats",
        currentChatId
      ),
      {
        lastMessage:
          text,

        lastMessageAt:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    input.value = "";

  } catch (error) {

    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    alert(
      "Could not send message: " +
      error.message
    );

  } finally {

    input.disabled = false;
    input.focus();
  }
}


// =====================================================
// SEND BUTTON
// =====================================================

document
  .getElementById("sendBtn")
  .addEventListener(
    "click",
    sendMessage
  );


// =====================================================
// ENTER TO SEND
// =====================================================

document
  .getElementById("messageInput")
  .addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Enter") {

        event.preventDefault();
        sendMessage();
      }
    }
  );


// =====================================================
// BACK TO SEARCH
// =====================================================

document
  .getElementById("backChat")
  .addEventListener(
    "click",
    () => {

      if (unsubscribeMessages) {

        unsubscribeMessages();
        unsubscribeMessages = null;
      }

      currentChatId = null;

      chatScreen.classList.add("hidden");
      appScreen.classList.remove("hidden");

      document
        .getElementById("messages")
        .innerHTML = "";
    }
  );


// =====================================================
// LOAD FRIENDS / RECENT CHATS
// =====================================================

function loadFriends() {

  if (!currentUser) {
    return;
  }

  const friendsList =
    document.getElementById(
      "friendsList"
    );

  if (!friendsList) {
    return;
  }

  friendsList.innerHTML =
    `<div class="empty-friends">
      Loading chats...
    </div>`;

  if (unsubscribeFriends) {

    unsubscribeFriends();
    unsubscribeFriends = null;
  }

  const chatsRef =
    collection(
      db,
      "chats"
    );

  const chatsQuery =
    query(chatsRef);

  unsubscribeFriends =
    onSnapshot(

      chatsQuery,

      async (snapshot) => {

        const friends = [];

        snapshot.forEach(
          (chatDoc) => {

            const data =
              chatDoc.data();

            if (
              data.participants &&
              data.participants.includes(
                currentUser.uid
              )
            ) {

              friends.push({
                id: chatDoc.id,
                data: data
              });
            }
          }
        );

        friends.sort(
          (a, b) => {

            const aTime =
              a.data.lastMessageAt?.seconds || 0;

            const bTime =
              b.data.lastMessageAt?.seconds || 0;

            return bTime - aTime;
          }
        );

        if (friends.length === 0) {

          friendsList.innerHTML =
            `<div class="empty-friends">
              No chats yet.
            </div>`;

          return;
        }

        friendsList.innerHTML = "";

        for (
          const friend of friends
        ) {

          const participants =
            friend.data.participants;

          const otherUserId =
            participants.find(
              (uid) =>
                uid !== currentUser.uid
            );

          if (!otherUserId) {
            continue;
          }

          try {

            const userDoc =
              await getDoc(
                doc(
                  db,
                  "users",
                  otherUserId
                )
              );

            if (!userDoc.exists()) {
              continue;
            }

            const userData =
              userDoc.data();

            const friendElement =
              document.createElement(
                "div"
              );

            friendElement.className =
              "friend-item";

            friendElement.innerHTML = `

              <div class="friend-avatar">
                ${escapeHTML(
                  userData.username
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <div class="friend-info">

                <strong>
                  ${escapeHTML(
                    userData.username
                  )}
                </strong>

                <span>
                  ${
                    friend.data.lastMessage
                      ? escapeHTML(
                          friend.data.lastMessage
                        )
                      : "Start chatting"
                  }
                </span>

              </div>

              <button
                class="friend-chat-btn"
              >
                Chat
              </button>
            `;

            friendElement
              .querySelector(
                ".friend-chat-btn"
              )
              .addEventListener(
                "click",
                () => {

                  openChat(
                    otherUserId,
                    userData.username
                  );
                }
              );

            friendsList.appendChild(
              friendElement
            );

          } catch (error) {

            console.error(
              "FRIEND LOAD ERROR:",
              error
            );
          }
        }
      },

      (error) => {

        console.error(
          "FRIENDS ERROR:",
          error
        );

        friendsList.innerHTML =
          `<div class="error">
            Could not load friends.
          </div>`;
      }
    );
}


// =====================================================
// LOGOUT
// =====================================================

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    async () => {

      try {

        await signOut(auth);

      } catch (error) {

        console.error(
          "LOGOUT ERROR:",
          error
        );
      }
    }
  );


// =====================================================
// HTML SECURITY HELPER
// =====================================================

function escapeHTML(text) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    text;

  return div.innerHTML;
}


// =====================================================
// APP LOADED
// =====================================================

console.log(
  "Chat Wave app loaded successfully."
);
