// Modified chat_ui/static/index.js to add artifact navigation

export default {
  initialize({ model }) {
    // Set up listeners for artifact changes
    model.on("change:artifacts", () => {
      // Update artifacts panel when artifacts dictionary changes
      this.updateArtifactsPanel(model);
    });

    model.on("change:current_artifact_id", () => {
      // Update the navigation when current artifact changes
      this.updateArtifactsNavigation(model);
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
          <div class="artifacts-display"></div>
          <div class="artifacts-navigation">
            <button class="nav-button prev-button" disabled>&larr;</button>
            <span class="artifact-counter">0 of 0</span>
            <button class="nav-button next-button" disabled>&rarr;</button>
          </div>
          <div class="artifacts-list"></div>
        </div>
      </div>
    `;
    
    // Store reference to this for use in event handlers
    const self = this;
    
    // Initialize variables to track artifact navigation
    this.artifactIds = [];
    this.currentArtifactIndex = -1;
    
    // Function to show a specific artifact by index
    this.showArtifactByIndex = function(model, index) {
      if (index >= 0 && index < this.artifactIds.length) {
        // Update current artifact index
        this.currentArtifactIndex = index;
        
        // Get the ID of the artifact at this index
        const artifactId = this.artifactIds[index];
        
        // Set the current artifact ID in the model
        model.set("current_artifact_id", artifactId);
        model.save_changes();
        
        // Update the navigation controls
        this.updateArtifactsNavigation(model);
      }
    };
    
    // Function to handle next button click
    this.nextArtifact = function(model) {
      if (this.currentArtifactIndex < this.artifactIds.length - 1) {
        this.showArtifactByIndex(model, this.currentArtifactIndex + 1);
      }
    };
    
    // Function to handle previous button click
    this.prevArtifact = function(model) {
      if (this.currentArtifactIndex > 0) {
        this.showArtifactByIndex(model, this.currentArtifactIndex - 1);
      }
    };
    
    // Function to update the artifacts navigation controls
    this.updateArtifactsNavigation = function(model) {
      const prevButton = el.querySelector('.prev-button');
      const nextButton = el.querySelector('.next-button');
      const artifactCounter = el.querySelector('.artifact-counter');
      const artifactsDisplay = el.querySelector('.artifacts-display');
      
      // Show or hide the list view
      const artifactsList = el.querySelector('.artifacts-list');
      artifactsList.style.display = 'none'; // Hide the list view by default
      
      // Clear the display area
      artifactsDisplay.innerHTML = '';
      
      const artifacts = model.get("artifacts") || {};
      this.artifactIds = Object.keys(artifacts);
      
      // Update the counter
      if (this.artifactIds.length > 0) {
        // Find the index of the current artifact
        const currentId = model.get("current_artifact_id");
        this.currentArtifactIndex = this.artifactIds.indexOf(currentId);
        
        // If no current artifact or not found, set to the first one
        if (this.currentArtifactIndex === -1 && this.artifactIds.length > 0) {
          this.currentArtifactIndex = 0;
          model.set("current_artifact_id", this.artifactIds[0]);
          model.save_changes();
        }
        
        // Update the counter text
        artifactCounter.textContent = `${this.currentArtifactIndex + 1} of ${this.artifactIds.length}`;
        
        // Update button states
        prevButton.disabled = this.currentArtifactIndex <= 0;
        nextButton.disabled = this.currentArtifactIndex >= this.artifactIds.length - 1;
        
        // Display the current artifact
        if (this.currentArtifactIndex >= 0) {
          const artifactId = this.artifactIds[this.currentArtifactIndex];
          const artifact = artifacts[artifactId];
          
          if (artifact) {
            // Create element for the current artifact
            const artifactEl = document.createElement('div');
            artifactEl.className = `artifact artifact-type-${artifact.type || 'code'} current-artifact`;
            
            // Different rendering based on artifact type - same as in updateArtifactsPanel
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
            
            artifactsDisplay.appendChild(artifactEl);
          }
        }
      } else {
        // No artifacts
        artifactCounter.textContent = '0 of 0';
        prevButton.disabled = true;
        nextButton.disabled = true;
        
        // Show empty state
        artifactsDisplay.innerHTML = '<div class="no-artifacts">No artifacts created yet</div>';
      }
    };
    
    // Function to update the artifacts panel (now used for internal tracking)
    this.updateArtifactsPanel = function(model) {
      // Update the navigation with the new artifacts
      this.updateArtifactsNavigation(model);
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
    
    // Event listeners for navigation buttons
    el.querySelector(".prev-button").addEventListener("click", () => {
      self.prevArtifact(model);
    });
    
    el.querySelector(".next-button").addEventListener("click", () => {
      self.nextArtifact(model);
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
    this.updateArtifactsNavigation(model);
    
    return () => {};
  }
};