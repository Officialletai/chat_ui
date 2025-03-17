// chat_ui/static/index.js
export default {
  initialize({ model }) {
    // Set up listeners for artifact changes
    model.on("change:artifacts", () => {
      // Update artifacts panel when artifacts dictionary changes
      this.updateArtifactsPanel(model);
    });

    model.on("change:current_artifact_id", () => {
      // Highlight the current artifact when it changes
      this.highlightCurrentArtifact(model);
    });

    return () => {};
  },
  
  render({ model, el }) {
    // Create widget with artifacts panel and chat container
    el.innerHTML = `
      <div class="chat-widget-container">
        <div class="artifacts-panel">
          <div class="artifacts-header">Code Artifacts</div>
          <div class="artifacts-list"></div>
        </div>
        <div class="chat-container">
          <div class="chat-history"></div>
          <div class="input-container">
            <div class="input-row">
              <input type="text" id="message-input" placeholder="Type your message...">
              <button id="send-button">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Store reference to this for use in event handlers
    const self = this;
    
    // Function to update the artifacts panel
    this.updateArtifactsPanel = function(model) {
      const artifactsList = el.querySelector('.artifacts-list');
      const artifacts = model.get("artifacts") || {};
      
      // Clear the current list
      artifactsList.innerHTML = '';
      
      // Add each artifact to the panel
      Object.values(artifacts).forEach(artifact => {
        const artifactEl = document.createElement('div');
        artifactEl.className = 'artifact';
        artifactEl.dataset.id = artifact.id;
        
        artifactEl.innerHTML = `
          <div class="artifact-header">
            <div class="artifact-title">${artifact.title || 'Untitled'}</div>
            <div class="artifact-language">${artifact.language || ''}</div>
          </div>
          <pre class="artifact-content"><code>${this.escapeHTML(artifact.content)}</code></pre>
        `;
        
        // Add click event to select the artifact
        artifactEl.addEventListener('click', function() {
          model.send({
            command: "select_artifact", 
            id: artifact.id
          });
        });
        
        artifactsList.appendChild(artifactEl);
      });
      
      // Highlight the current artifact
      this.highlightCurrentArtifact(model);
    };
    
    // Function to highlight the current artifact
    this.highlightCurrentArtifact = function(model) {
      const currentId = model.get("current_artifact_id");
      
      // Remove highlight from all artifacts
      el.querySelectorAll('.artifact').forEach(el => {
        el.classList.remove('current-artifact');
      });
      
      // Add highlight to current artifact
      if (currentId) {
        const currentArtifact = el.querySelector(`.artifact[data-id="${currentId}"]`);
        if (currentArtifact) {
          currentArtifact.classList.add('current-artifact');
          currentArtifact.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    };
    
    // Helper function to escape HTML
    this.escapeHTML = function(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Function to append messages to chat history
    function addMessage(content, isUser = true) {
      const history = el.querySelector(".chat-history");
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${isUser ? "user-message" : "other-message"}`;
      messageDiv.innerHTML = content;
      history.appendChild(messageDiv);
      history.scrollTop = history.scrollHeight;
    }

    // Function to send a message
    function sendMessage() {
      const input = el.querySelector("#message-input");
      const message = input.value.trim();
      if (message) {
        addMessage(message, true);
        model.send(message);
        input.value = "";
      }
    }

    // Event listeners for chat input
    el.querySelector("#send-button").addEventListener("click", sendMessage);
    el.querySelector("#message-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });

    // Listen for custom messages from the backend
    model.on("msg:custom", (msg) => {
      if (typeof msg === 'object') {
        if (msg.type === 'chat_message') {
          // Regular chat message
          addMessage(msg.content, false);
        } else if (msg.type === 'artifact_update') {
          // Artifact update message - handled by traitlets
          const artifacts = { ...model.get("artifacts") };
          artifacts[msg.artifact.id] = msg.artifact;
          model.set("artifacts", artifacts);
          model.set("current_artifact_id", msg.artifact.id);
          model.save_changes();
        }
      } else {
        // Backwards compatibility with string messages
        addMessage(msg, false);
      }
    });

    // Initialize the artifacts panel
    this.updateArtifactsPanel(model);
    
    return () => {};
  }
};