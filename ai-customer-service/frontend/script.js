document.addEventListener("DOMContentLoaded", () => {
    // --- ELEMENT SELECTION ---
    // Chat functionality elements
    const chatBody = document.getElementById("chat-body");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");

    // Chat widget toggle elements
    const chatWidget = document.querySelector(".chat-widget");
    const chatToggleBtn = document.getElementById("chat-toggle-btn");
    const chatCloseBtn = document.getElementById("chat-close-btn");


    // --- CHAT VISIBILITY ---
    // Function to toggle the 'open' class on the chat widget
    const toggleChat = () => {
        chatWidget.classList.toggle("open");
    };

    // Event listeners for the toggle and close buttons
    chatToggleBtn.addEventListener("click", toggleChat);
    chatCloseBtn.addEventListener("click", toggleChat);


    // --- CHAT MESSAGE LOGIC ---
    // Main function to send a message and receive a stream
    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (message === "") return; // Don't send empty messages

        // Display the user's message immediately
        appendMessage(message, "user");
        chatInput.value = ""; // Clear the input field
        
        // Create a placeholder for the bot's streaming response
        const botMessageElement = createMessageElement("bot");
        let botResponse = "";

        try {
            // Talk to our FastAPI backend
            const response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: message }),
            });

            if (!response.ok || !response.body) {
                throw new Error("Failed to get a response from the server.");
            }
            
            // Set up the tools to read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // Loop to read each chunk of data as it arrives
            while (true) {
                const { done, value } = await reader.read();
                if (done) break; // Stream is finished
                
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n\n");
                
                lines.forEach(line => {
                    if (line.startsWith("data: ")) {
                        const jsonStr = line.substring(6);
                        try {
                           const parsed = JSON.parse(jsonStr);
                            if (parsed.content) {
                                // Append the new content and update the UI
                                botResponse += parsed.content;
                                botMessageElement.querySelector('p').textContent = botResponse;
                                chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll
                            }
                        } catch (e) {
                            // Silently ignore JSON parsing errors for incomplete chunks
                        }
                    }
                });
            }

        } catch (error) {
            console.error("Error:", error);
            botMessageElement.querySelector('p').textContent = "Sorry, something went wrong. Please try again.";
        }
    };

    // Helper function to add a new message bubble to the chat body
    function appendMessage(text, sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-message", sender);
        const p = document.createElement("p");
        p.textContent = text;
        messageElement.appendChild(p);
        chatBody.appendChild(messageElement);
        chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll
    }

    // Helper function to create the bot's message bubble with a typing indicator
    function createMessageElement(sender) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-message", sender);
        const p = document.createElement("p");
        p.textContent = "●"; // Typing indicator
        messageElement.appendChild(p);
        chatBody.appendChild(messageElement);
        chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll
        return messageElement;
    }

    // --- EVENT LISTENERS FOR SENDING MESSAGES ---
    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        // Allow sending with the "Enter" key
        if (e.key === "Enter") {
            sendMessage();
        }
    });
});