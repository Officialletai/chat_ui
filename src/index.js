// src/index.js
export default {
    // Called once when the widget is created (model initialization)
    initialize({ model }) {
      return () => {};
    },
    // Called each time a view is rendered.
    render({ model, el }) {
      // Inject HTML for the chat UI
      el.innerHTML = `
        <div class="chat-container">
          <div class="chat-history"></div>
          <div class="input-container">
            <div class="input-row">
              <input type="text" id="message-input" placeholder="Type your message...">
              <button id="send-button">Send</button>
            </div>
          </div>
        </div>
      `;
      // Function to append messages
      function addMessage(content, isUser = true) {
        const history = el.querySelector('.chat-history');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'other-message'}`;
        messageDiv.innerHTML = content;
        history.appendChild(messageDiv);
        history.scrollTop = history.scrollHeight;
      }
      // Function to send a message
      function sendMessage() {
        const input = el.querySelector('#message-input');
        const message = input.value.trim();
        if (message) {
          addMessage(message, true);
          // Send the message to Python via model.send
          model.send(message);
          input.value = '';
        }
      }
      // Event listeners for button click and Enter key
      el.querySelector('#send-button').addEventListener('click', sendMessage);
      el.querySelector('#message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
      // Listen for custom messages from the backend
      model.on("msg:custom", (msg) => {
        addMessage(msg, false);
      });
      return () => {};
    }
  };
  