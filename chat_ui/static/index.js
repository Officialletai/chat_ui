// src/index.js
var src_default = {
  initialize({ model }) {
    return () => {
    };
  },
  render({ model, el }) {
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
    function addMessage(content, isUser = true) {
      const history = el.querySelector(".chat-history");
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${isUser ? "user-message" : "other-message"}`;
      messageDiv.innerHTML = content;
      history.appendChild(messageDiv);
      history.scrollTop = history.scrollHeight;
    }
    function sendMessage() {
      const input = el.querySelector("#message-input");
      const message = input.value.trim();
      if (message) {
        addMessage(message, true);
        model.send(message);
        input.value = "";
      }
    }
    el.querySelector("#send-button").addEventListener("click", sendMessage);
    el.querySelector("#message-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
    model.on("msg:custom", (msg) => {
      addMessage(msg, false);
    });
    return () => {
    };
  }
};
export {
  src_default as default
};
