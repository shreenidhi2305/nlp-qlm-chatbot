/* ============================================
   QUANTIZED LLM CHATBOT - APPLICATION LOGIC
   Production-quality JavaScript for chat UI
   ============================================ */

/* ============================================
   CONFIGURATION & CONSTANTS
   ============================================ */

/**
 * API endpoint for the streaming LLM backend
 * @constant {string}
 * @description Update this with your current ngrok URL
 */
const API_URL = "https://louvenia-potentae-victor.ngrok-free.dev/generate_stream";

/**
 * Maximum characters allowed in a single message
 * @constant {number}
 */
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Auto-scroll behavior threshold (in pixels from bottom)
 * @constant {number}
 */
const AUTO_SCROLL_THRESHOLD = 100;

/**
 * Theme storage key for localStorage
 * @constant {string}
 */
const THEME_STORAGE_KEY = "chatbot-theme";

/* ============================================
   STATE MANAGEMENT
   ============================================ */

/**
 * Application state
 * @type {Object}
 */
const state = {
    isStreaming: false,
    currentAbortController: null,
    currentTheme: localStorage.getItem(THEME_STORAGE_KEY) || "light",
    messageCount: 0
};

/* ============================================
   DOM ELEMENT REFERENCES
   ============================================ */

let elements = {};

/**
 * Initialize DOM element references
 * @description Caches references to frequently accessed DOM elements
 */
function initializeElements() {
    elements = {
        messagesArea: document.getElementById("messagesArea"),
        emptyState: document.getElementById("emptyState"),
        messageInput: document.getElementById("messageInput"),
        sendBtn: document.getElementById("sendBtn"),
        clearBtn: document.getElementById("clearBtn"),
        themeToggle: document.getElementById("themeToggle"),
        charCounter: document.getElementById("charCounter"),
        promptCards: document.querySelectorAll(".prompt-card")
    };
}

/* ============================================
   INITIALIZATION
   ============================================ */

/**
 * Initialize the application
 * @description Sets up event listeners, applies saved theme, and configures marked.js
 */
function initialize() {
    initializeElements();
    setupEventListeners();
    applyTheme(state.currentTheme);
    configureMarked();
    
    // Auto-focus input on load
    elements.messageInput.focus();
}

/**
 * Configure marked.js for markdown rendering
 * @description Sets up safe rendering options and custom renderer
 */
function configureMarked() {
    if (typeof marked !== "undefined") {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
    }
}

/**
 * Set up all event listeners
 * @description Attaches event handlers to interactive elements
 */
function setupEventListeners() {
    // Send button
    elements.sendBtn.addEventListener("click", handleSendMessage);
    
    // Clear button
    elements.clearBtn.addEventListener("click", handleClearChat);
    
    // Theme toggle
    elements.themeToggle.addEventListener("click", handleThemeToggle);
    
    // Input field events
    elements.messageInput.addEventListener("input", handleInputChange);
    elements.messageInput.addEventListener("keydown", handleKeyDown);
    
    // Suggested prompt cards
    elements.promptCards.forEach(card => {
        card.addEventListener("click", handlePromptClick);
    });
    
    // Global keyboard shortcuts
    document.addEventListener("keydown", handleGlobalKeyboard);
}

/* ============================================
   EVENT HANDLERS
   ============================================ */

/**
 * Handle send message button click
 * @description Validates input and initiates message sending
 */
function handleSendMessage() {
    const message = elements.messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    if (message.length > MAX_MESSAGE_LENGTH) {
        showError(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`);
        return;
    }
    
    sendMessage(message);
}

/**
 * Handle clear chat button click
 * @description Clears all messages and shows empty state
 */
function handleClearChat() {
    if (!confirm("Are you sure you want to clear the chat?")) {
        return;
    }
    
    // Remove all messages
    const messages = elements.messagesArea.querySelectorAll(".message, .typing-indicator");
    messages.forEach(msg => msg.remove());
    
    // Show empty state
    elements.emptyState.classList.remove("hidden");
    
    // Reset state
    state.messageCount = 0;
    
    // Focus input
    elements.messageInput.focus();
}

/**
 * Handle theme toggle button click
 * @description Switches between light and dark themes
 */
function handleThemeToggle() {
    const newTheme = state.currentTheme === "light" ? "dark" : "light";
    applyTheme(newTheme);
}

/**
 * Handle input field changes
 * @description Updates character counter and button state
 */
function handleInputChange() {
    const length = elements.messageInput.value.length;
    elements.charCounter.textContent = `${length} character${length !== 1 ? "s" : ""}`;
    
    // Enable/disable send button
    elements.sendBtn.disabled = elements.messageInput.value.trim().length === 0;
    
    // Auto-resize textarea
    autoResizeTextarea();
}

/**
 * Handle keyboard events in input field
 * @description Implements Enter to send, Shift+Enter for new line
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyDown(event) {
    // Enter key without Shift = send message
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
}

/**
 * Handle suggested prompt card clicks
 * @description Populates input with suggested prompt
 * @param {Event} event - The click event
 */
function handlePromptClick(event) {
    const card = event.currentTarget;
    const prompt = card.dataset.prompt;
    
    if (prompt) {
        elements.messageInput.value = prompt;
        elements.messageInput.focus();
        handleInputChange();
    }
}

/**
 * Handle global keyboard shortcuts
 * @description Implements Ctrl+K to focus input, Esc to clear input
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleGlobalKeyboard(event) {
    // Ctrl+K or Cmd+K = focus input
    if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        elements.messageInput.focus();
    }
    
    // Esc = clear input (if focused)
    if (event.key === "Escape" && document.activeElement === elements.messageInput) {
        elements.messageInput.value = "";
        handleInputChange();
    }
}

/* ============================================
   THEME MANAGEMENT
   ============================================ */

/**
 * Apply theme to the application
 * @description Updates DOM and saves preference to localStorage
 * @param {string} theme - The theme to apply ("light" or "dark")
 */
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    state.currentTheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/* ============================================
   MESSAGE HANDLING
   ============================================ */

/**
 * Send a message to the chatbot
 * @description Displays user message and initiates streaming response
 * @param {string} message - The message text to send
 */
async function sendMessage(message) {
    // Hide empty state
    elements.emptyState.classList.add("hidden");
    
    // Display user message
    appendMessage("user", message);
    
    // Clear input
    elements.messageInput.value = "";
    handleInputChange();
    
    // Reset textarea height
    elements.messageInput.style.height = "auto";
    
    // Show typing indicator
    showTypingIndicator();
    
    // Stream bot response
    await streamBotResponse(message);
}

/**
 * Append a message to the chat
 * @description Creates and displays a message bubble
 * @param {string} role - The message role ("user" or "bot")
 * @param {string} content - The message content (plain text for user, markdown for bot)
 * @param {string} [messageId] - Optional message ID for updates
 * @returns {HTMLElement} The created message element
 */
function appendMessage(role, content, messageId = null) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;
    
    if (messageId) {
        messageDiv.id = messageId;
    }
    
    // Create avatar
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "U" : "AI";
    avatar.setAttribute("aria-label", role === "user" ? "User" : "Bot");
    
    // Create content container
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    // Create message bubble
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    
    if (role === "user") {
        // User messages are plain text
        bubble.textContent = content;
    } else {
        // Bot messages are rendered as markdown
        bubble.innerHTML = renderMarkdown(content);
        highlightCode(bubble);
    }
    
    // Create metadata (timestamp and actions)
    const meta = document.createElement("div");
    meta.className = "message-meta";
    
    const timestamp = document.createElement("span");
    timestamp.className = "message-timestamp";
    timestamp.textContent = getCurrentTime();
    
    meta.appendChild(timestamp);
    
    // Add copy button for bot messages
    if (role === "bot") {
        const actions = document.createElement("div");
        actions.className = "message-actions";
        
        const copyBtn = document.createElement("button");
        copyBtn.className = "message-action-btn";
        copyBtn.setAttribute("aria-label", "Copy message");
        copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        copyBtn.addEventListener("click", () => copyMessage(content));
        
        actions.appendChild(copyBtn);
        meta.appendChild(actions);
    }
    
    contentDiv.appendChild(bubble);
    contentDiv.appendChild(meta);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    elements.messagesArea.appendChild(messageDiv);
    scrollToBottom();
    
    state.messageCount++;
    
    return messageDiv;
}

/**
 * Update an existing message's content
 * @description Updates message bubble with new content and re-renders markdown
 * @param {string} messageId - The ID of the message to update
 * @param {string} content - The new content
 */
function updateMessage(messageId, content) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;
    
    const bubble = messageDiv.querySelector(".message-bubble");
    if (!bubble) return;
    
    bubble.innerHTML = renderMarkdown(content);
    highlightCode(bubble);
    scrollToBottom();
}

/**
 * Show typing indicator
 * @description Displays animated typing dots while bot is generating response
 */
function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.id = "typingIndicator";
    
    indicator.innerHTML = `
        <div class="message-avatar" aria-label="Bot">AI</div>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    
    elements.messagesArea.appendChild(indicator);
    scrollToBottom();
}

/**
 * Hide typing indicator
 * @description Removes the typing indicator from the chat
 */
function hideTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) {
        indicator.remove();
    }
}

/* ============================================
   API & STREAMING
   ============================================ */

/**
 * Stream bot response from API
 * @description Fetches streaming response and updates UI in real-time
 * @param {string} prompt - The user's message/prompt
 */
async function streamBotResponse(prompt) {
    state.isStreaming = true;
    state.currentAbortController = new AbortController();
    
    // Replace send button with stop button
    replaceSendWithStop();
    
    const messageId = `bot-message-${state.messageCount}`;
    let accumulatedResponse = "";
    
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt }),
            signal: state.currentAbortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Create initial bot message
        appendMessage("bot", "", messageId);
        
        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            // Decode chunk and accumulate
            const chunk = decoder.decode(value, { stream: true });
            accumulatedResponse += chunk;
            
            // Update message with accumulated response
            updateMessage(messageId, accumulatedResponse);
        }
        
    } catch (error) {
        hideTypingIndicator();
        
        if (error.name === "AbortError") {
            // User stopped generation
            if (accumulatedResponse) {
                // Keep partial response
                console.log("Generation stopped by user");
            } else {
                // No response yet, show message
                appendMessage("bot", "*Generation stopped*");
            }
        } else {
            // Network or other error
            console.error("Error streaming response:", error);
            showError("Failed to get response from the chatbot. Please try again.");
        }
    } finally {
        state.isStreaming = false;
        state.currentAbortController = null;
        replaceStopWithSend();
    }
}

/**
 * Stop ongoing generation
 * @description Aborts the current streaming request
 */
function stopGeneration() {
    if (state.currentAbortController) {
        state.currentAbortController.abort();
    }
}

/* ============================================
   UI UTILITIES
   ============================================ */

/**
 * Replace send button with stop button
 * @description Swaps UI to show stop button during streaming
 */
function replaceSendWithStop() {
    const stopBtn = document.createElement("button");
    stopBtn.className = "stop-btn";
    stopBtn.id = "stopBtn";
    stopBtn.setAttribute("aria-label", "Stop generation");
    stopBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="6" width="12" height="12" fill="currentColor" rx="2"/>
        </svg>
    `;
    stopBtn.addEventListener("click", stopGeneration);
    
    elements.sendBtn.replaceWith(stopBtn);
    elements.sendBtn = stopBtn;
}

/**
 * Replace stop button with send button
 * @description Swaps UI back to send button after streaming completes
 */
function replaceStopWithSend() {
    const sendBtn = document.createElement("button");
    sendBtn.className = "send-btn";
    sendBtn.id = "sendBtn";
    sendBtn.setAttribute("aria-label", "Send message");
    sendBtn.disabled = elements.messageInput.value.trim().length === 0;
    sendBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    sendBtn.addEventListener("click", handleSendMessage);
    
    elements.sendBtn.replaceWith(sendBtn);
    elements.sendBtn = sendBtn;
}

/**
 * Auto-resize textarea based on content
 * @description Dynamically adjusts textarea height as user types
 */
function autoResizeTextarea() {
    elements.messageInput.style.height = "auto";
    elements.messageInput.style.height = elements.messageInput.scrollHeight + "px";
}

/**
 * Scroll messages area to bottom
 * @description Smoothly scrolls to show the latest message
 */
function scrollToBottom() {
    const { messagesArea } = elements;
    const isNearBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight < AUTO_SCROLL_THRESHOLD;
    
    // Only auto-scroll if user is near bottom (prevents interrupting manual scrolling)
    if (isNearBottom || state.isStreaming) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
}

/**
 * Show error message
 * @description Displays an error message in the chat
 * @param {string} errorText - The error message to display
 */
function showError(errorText) {
    appendMessage("bot", `⚠️ **Error:** ${errorText}`);
}

/**
 * Copy message to clipboard
 * @description Copies message content to clipboard and shows feedback
 * @param {string} content - The content to copy
 */
async function copyMessage(content) {
    try {
        await navigator.clipboard.writeText(content);
        
        // Show brief success feedback (could be enhanced with a toast notification)
        console.log("Message copied to clipboard");
    } catch (error) {
        console.error("Failed to copy message:", error);
    }
}

/**
 * Get current time formatted as HH:MM
 * @description Returns current time in 12-hour format
 * @returns {string} Formatted time string
 */
function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
}

/* ============================================
   MARKDOWN & CODE HIGHLIGHTING
   ============================================ */

/**
 * Render markdown to HTML
 * @description Converts markdown text to HTML using marked.js
 * @param {string} markdown - The markdown text to render
 * @returns {string} Rendered HTML
 */
function renderMarkdown(markdown) {
    if (typeof marked === "undefined") {
        // Fallback if marked.js is not loaded
        return escapeHtml(markdown).replace(/\n/g, "<br>");
    }
    
    try {
        return marked.parse(markdown);
    } catch (error) {
        console.error("Markdown rendering error:", error);
        return escapeHtml(markdown).replace(/\n/g, "<br>");
    }
}

/**
 * Highlight code blocks using Prism.js
 * @description Applies syntax highlighting to code blocks in the element
 * @param {HTMLElement} element - The element containing code blocks
 */
function highlightCode(element) {
    if (typeof Prism === "undefined") {
        return;
    }
    
    const codeBlocks = element.querySelectorAll("pre code");
    codeBlocks.forEach(block => {
        Prism.highlightElement(block);
    });
}

/**
 * Escape HTML special characters
 * @description Prevents XSS by escaping HTML in user input
 * @param {string} text - The text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/* ============================================
   APPLICATION ENTRY POINT
   ============================================ */

// Initialize the application when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
} else {
    initialize();
}
