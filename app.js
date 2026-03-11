/**
 * AgriConnect AI Console - Frontend Application Logic
 */

// UI Elements
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const messagesWrapper = document.getElementById('messages-wrapper');
const welcomeScreen = document.getElementById('welcome-screen');
const chatContainer = document.getElementById('chat-container');

// Sidebar / Layout Elements
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const themeToggleBtn = document.getElementById('theme-toggle');
const newChatBtn = document.getElementById('new-chat-btn');
const languageSelector = document.getElementById('language-selector');

// API Configuration
// const API_BASE = 'http://localhost:3000/api'; // Or 'https://farm-ai-iota.vercel.app/api' for production
const API_BASE = 'https://farm-ai-iota.vercel.app/api'; // Or 'https://farm-ai-iota.vercel.app/api' for production

// State
let chatHistory = [];
let isWaitingForResponse = false;
let userEmail = localStorage.getItem('agriconnect_user_email') || '';

// Auth Elements
const authModal = document.getElementById('auth-modal');
const authEmailInput = document.getElementById('auth-email-input');
const authSubmitBtn = document.getElementById('auth-submit-btn');

document.addEventListener('DOMContentLoaded', () => {
    if (!userEmail) {
        authModal.classList.add('active');
    } else {
        updateUserDisplay();
        loadHistory();
    }
});

authSubmitBtn.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    if (!email) return alert('Please enter a valid email address.');

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'Loading...';

    try {
        const res = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (res.ok) {
            userEmail = email;
            localStorage.setItem('agriconnect_user_email', email);
            authModal.classList.remove('active');
            updateUserDisplay();
            loadHistory();
        } else {
            alert('Failed to authenticate. Please try again.');
        }
    } catch (err) {
        console.error(err);
        alert('Network error during authentication.');
    } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = 'Continue to AI Consultation';
    }
});

async function loadHistory() {
    if (!userEmail) return;

    try {
        const res = await fetch(`${API_BASE}/history?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();

        const historyListEl = document.getElementById('chat-history-list');

        if (data.history && data.history.length > 0) {
            welcomeScreen.style.display = 'none';
            chatHistory = []; // Reset locally if modifying history
            messagesWrapper.innerHTML = '';

            // clear sidebar history
            historyListEl.innerHTML = '';

            data.history.forEach(msg => {
                chatHistory.push({ role: msg.role, content: msg.content });
                addMessageToUI(msg.content, msg.role === 'user' ? 'user' : 'ai');

                // Add user messages to the sidebar as recent topics
                if (msg.role === 'user') {
                    const li = document.createElement('li');
                    li.className = 'chat-history-item';

                    // take first 25 characters of the prompt as a title summary
                    const previewText = msg.content.length > 25 ? msg.content.substring(0, 25) + '...' : msg.content;

                    li.innerHTML = `<i class="ph ph-chat-teardrop-text"></i> <span>${previewText}</span>`;
                    historyListEl.prepend(li); // add to top
                }
            });
        }
    } catch (err) {
        console.error("Failed to load history", err);
    }
}

function updateUserDisplay() {
    if (!userEmail) return;
    const nameDisplay = document.getElementById('user-name-display');
    const emailDisplay = document.getElementById('user-email-display');

    if (nameDisplay && emailDisplay) {
        emailDisplay.textContent = userEmail;
        const namePart = userEmail.split('@')[0];
        // Capitalize first letter
        nameDisplay.textContent = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
}

// Auto-resizing textarea
chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';

    if (this.value.trim() !== '' && !isWaitingForResponse) {
        sendBtn.disabled = false;
    } else {
        sendBtn.disabled = true;
    }
});

// Submit on Enter (Shift+Enter for new line)
chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) handleSend();
    }
});

sendBtn.addEventListener('click', handleSend);

// Mobile Sidebar Toggle
mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
});

// Theme toggler
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    const icon = themeToggleBtn.querySelector('i');

    if (isLight) {
        icon.classList.replace('ph-moon', 'ph-sun');
    } else {
        icon.classList.replace('ph-sun', 'ph-moon');
    }
});

// Reset Chat
newChatBtn.addEventListener('click', () => {
    if (chatHistory.length === 0) return;
    if (confirm('Start a new session? Current session will be cleared from view.')) {
        chatHistory = [];
        messagesWrapper.innerHTML = '';
        welcomeScreen.style.display = 'flex';
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;
    }
});

// Expose setInput to global scope for suggestion cards
window.setInput = function (text) {
    chatInput.value = text;
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
    sendBtn.disabled = false;
    chatInput.focus();
};

/**
 * Handle sending message
 */
async function handleSend() {
    const text = chatInput.value.trim();
    if (!text || isWaitingForResponse) return;

    // UI Updates
    welcomeScreen.style.display = 'none';
    addMessageToUI(text, 'user');

    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    isWaitingForResponse = true;

    // Show loading
    const loadingId = addLoadingIndicator();

    // Check language preference
    const preferredLang = languageSelector.value;
    let apiMessage = text;
    if (preferredLang && preferredLang !== 'English') {
        if (preferredLang === 'Mix Language') {
            apiMessage = `[Please respond to this using a mix of English, Nigerian Pidgin English, and Yoruba seamlessly, just like a local Nigerian agricultural expert would speak.] ` + text;
        } else {
            apiMessage = `[Please ensure your entire response is translated and spoken in strict ${preferredLang}] ` + text;
        }
    }

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: apiMessage, history: chatHistory, email: userEmail })
        });

        const data = await response.json();
        removeElement(loadingId);

        if (response.ok) {
            // Update History array for Groq context
            chatHistory.push({ role: 'user', content: apiMessage });
            chatHistory.push({ role: 'assistant', content: data.reply });

            // Render AI Response
            addMessageToUI(data.reply, 'ai');

            // Re-render sidebar history logic manually for the new prompt
            const historyListEl = document.getElementById('chat-history-list');
            if (historyListEl) {
                const li = document.createElement('li');
                li.className = 'chat-history-item';
                const previewText = apiMessage.length > 25 ? apiMessage.substring(0, 25) + '...' : apiMessage;
                li.innerHTML = `<i class="ph ph-chat-teardrop-text"></i> <span>${previewText}</span>`;
                historyListEl.prepend(li);
            }

        } else {
            console.error(data.error);
            addMessageToUI("Error: " + (data.error || "Failed to reach AI Engine."), 'ai');
        }
    } catch (err) {
        console.error(err);
        removeElement(loadingId);
        addMessageToUI("Network Error...", 'ai');
    } finally {
        isWaitingForResponse = false;
        if (chatInput.value.trim() !== '') sendBtn.disabled = false;
    }
}

/**
 * Parse Markdown-like text from LLM to HTML
 */
function parseMD(text) {
    // Escape HTML first to prevent XSS
    let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Lists: * item or - item
    html = html.replace(/^[*-]\s+(.*)$/gm, '<li>$1</li>');

    // Group adjacent lists
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Paragraphs / Newlines
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
}

function addMessageToUI(text, sender) {
    const isUser = sender === 'user';
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatarIcon = isUser ? '<i class="ph ph-user"></i>' : '<i class="ph-fill ph-plant"></i>';
    const avatarClass = isUser ? 'user-avatar' : 'ai-avatar';

    let contentHtml = isUser ? `<p>${text.replace(/\n/g, '<br>')}</p>` : parseMD(text);

    messageDiv.innerHTML = `
        <div class="avatar ${avatarClass}">
            ${avatarIcon}
        </div>
        <div class="message-content-box" style="${isUser ? 'background: var(--accent-glow-subtle); border-color: var(--border-highlight);' : ''}">
            ${contentHtml}
        </div>
    `;

    messagesWrapper.appendChild(messageDiv);
    scrollToBottom();
}

function addLoadingIndicator() {
    const id = 'loader-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = id;
    messageDiv.className = 'message ai';

    messageDiv.innerHTML = `
        <div class="avatar ai-avatar">
            <i class="ph-fill ph-plant"></i>
        </div>
        <div class="message-content-box" style="padding: 1rem;">
            <div class="skeleton-loader">
                <div class="skeleton-line"></div>
                <div class="skeleton-line medium"></div>
                <div class="skeleton-line short"></div>
            </div>
        </div>
    `;

    messagesWrapper.appendChild(messageDiv);
    scrollToBottom();
    return id;
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// --- Share Chat Logic ---
const shareChatBtn = document.getElementById('share-chat-btn');
const shareModal = document.getElementById('share-modal');
const shareLinkInput = document.getElementById('share-link-input');
const copyShareBtn = document.getElementById('copy-share-btn');
const copyToast = document.getElementById('copy-toast');

shareChatBtn.addEventListener('click', () => {
    // Basic validation: Is there a chat to share?
    if (chatHistory.length === 0) {
        alert("There is no chat history to share yet! Start a conversation first.");
        return;
    }

    // Open Modal
    shareModal.classList.add('active');

    // Simulate link generation delay
    shareLinkInput.value = "Generating secure link...";
    copyShareBtn.disabled = true;

    setTimeout(() => {
        // Generate a fun dummy UUID for the share link
        const dummyId = Math.random().toString(36).substring(2, 10);
        shareLinkInput.value = `https://agriconnect.ai/share/${dummyId}`;
        copyShareBtn.disabled = false;
    }, 800);
});

copyShareBtn.addEventListener('click', () => {
    // Copy the generated link to clipboard
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999); // For mobile devices

    try {
        navigator.clipboard.writeText(shareLinkInput.value).then(() => {
            // Show toast notification
            copyToast.classList.add('show');
            setTimeout(() => {
                copyToast.classList.remove('show');
            }, 2500);
        });
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
});

// --- Custom Language Dropdown Logic ---
const langDropdownBtn = document.getElementById('dropdown-selected');
const langDropdownOpts = document.getElementById('dropdown-options');
const hiddenLangInput = document.getElementById('language-selector');
const dropdownText = document.getElementById('dropdown-text');

langDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdownBtn.classList.toggle('open');
    langDropdownOpts.classList.toggle('show');
});

langDropdownOpts.querySelectorAll('li').forEach(item => {
    item.addEventListener('click', () => {
        // Update selection visual
        langDropdownOpts.querySelectorAll('li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');

        const value = item.getAttribute('data-value');
        const iconClass = item.getAttribute('data-icon');

        // Update button visual
        dropdownText.innerText = value;
        const iconEl = langDropdownBtn.querySelector('i.ph:not(.caret)');
        iconEl.className = `ph ${iconClass}`;

        // Update hidden input
        hiddenLangInput.value = value;

        // Close dropdown
        langDropdownBtn.classList.remove('open');
        langDropdownOpts.classList.remove('show');
    });
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!document.getElementById('lang-dropdown').contains(e.target)) {
        langDropdownBtn.classList.remove('open');
        langDropdownOpts.classList.remove('show');
    }
});
