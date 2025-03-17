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
    // Create widget with chat container and artifacts panel on the right
    el.innerHTML = `
      <div class="chat-widget-container">
        <div class="chat-container">
          <div class="chat-history"></div>
          <div class="input-container">
            <div class="input-row">
              <input type="text" id="message-input" placeholder="Type your message...">
              <button id="send-button">Send</button>
            </div>
          </div>
        </div>
        <div class="artifacts-panel">
          <div class="artifacts-header">Data Artifacts</div>
          <div class="artifacts-list"></div>
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
        artifactEl.className = `artifact artifact-type-${artifact.type || 'code'}`;
        artifactEl.dataset.id = artifact.id;
        
        // Different rendering based on artifact type
        let contentHTML = '';
        const artifactType = artifact.type || 'code';
        
        if (artifactType === 'dataframe') {
          // Render DataFrame
          contentHTML = `
            <div class="dataframe-info">
              <div class="dataframe-shape">Shape: ${artifact.content.shape ? `${artifact.content.shape[0]} × ${artifact.content.shape[1]}` : 'N/A'}</div>
              <div class="dataframe-container">${artifact.content.html || 'No data available'}</div>
            </div>
          `;
        } else if (artifactType === 'sql_result') {
          // Render SQL with results
          contentHTML = `
            <div class="sql-query-section">
              <pre class="sql-query"><code>${this.escapeHTML(artifact.content.query)}</code></pre>
            </div>
            <div class="sql-results-section">
              <div class="result-header">Results (${artifact.content.result.shape ? `${artifact.content.result.shape[0]} rows` : '0 rows'})</div>
              <div class="dataframe-container">${artifact.content.result.html || 'No results'}</div>
            </div>
          `;
        } else if (artifactType === 'sql_error') {
          // Render SQL with error
          contentHTML = `
            <div class="sql-query-section">
              <pre class="sql-query"><code>${this.escapeHTML(artifact.content.query)}</code></pre>
            </div>
            <div class="sql-error-section">
              <div class="error-header">Error</div>
              <pre class="error-message">${this.escapeHTML(artifact.content.error)}</pre>
            </div>
          `;
        } else if (artifactType === 'sql') {
          // Just the SQL query
          contentHTML = `
            <div class="sql-query-section">
              <pre class="sql-query"><code>${this.escapeHTML(artifact.content.query || artifact.content)}</code></pre>
            </div>
          `;
        } else if (artifactType === 'visualization') {
          // Visualization artifact (typically HTML)
          contentHTML = `
            <div class="visualization-container">
              ${typeof artifact.content === 'string' ? artifact.content : 'Visualization not available'}
            </div>
          `;
        } else {
          // Default code artifact
          contentHTML = `<pre class="artifact-content"><code>${this.escapeHTML(
            typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content, null, 2)
          )}</code></pre>`;
        }
        
        // Type indicator in the header
        const typeLabel = {
          'code': 'Code',
          'dataframe': 'DataFrame',
          'sql': 'SQL',
          'sql_result': 'SQL Result',
          'sql_error': 'SQL Error',
          'visualization': 'Visualization',
          'error': 'Error'
        }[artifactType] || 'Code';
        
        artifactEl.innerHTML = `
          <div class="artifact-header">
            <div class="artifact-title">${artifact.title || 'Untitled'}</div>
            <div class="artifact-info">
              ${artifact.language ? `<span class="artifact-language">${artifact.language}</span>` : ''}
              <span class="artifact-type">${typeLabel}</span>
            </div>
          </div>
          <div class="artifact-content-container">${contentHTML}</div>
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