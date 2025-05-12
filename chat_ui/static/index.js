// Modified chat_ui/static/index.js with improved collapsible thinking UI

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
    
    // Listen for changes to thinking state
    model.on("change:thinking_active", () => {
      this.updateThinkingUI(model);
    });

    // Listen for changes to maximized state
    model.on("change:is_maximized", () => {
      this.updateMaximizedState(model);
    });

    // Load Highlight.js dynamically for syntax highlighting
    this.loadSyntaxHighlighter();

    return () => {};
  },
  
  loadSyntaxHighlighter() {
    // Create link element for CSS with an ID for easy replacement
    const highlightCSS = document.createElement('link');
    highlightCSS.rel = 'stylesheet';
    highlightCSS.id = 'highlight-theme-css';
    // Start with light theme by default
    highlightCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
    document.head.appendChild(highlightCSS);
    
    // Create script element for JavaScript
    const highlightJS = document.createElement('script');
    highlightJS.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js';
    document.head.appendChild(highlightJS);
    
    // Create additional script for SQL language
    const sqlJS = document.createElement('script');
    sqlJS.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/sql.min.js';
    
    // Initialize highlighting after both scripts are loaded
    highlightJS.onload = () => {
      document.head.appendChild(sqlJS);
    };
    
    sqlJS.onload = () => {
      // After SQL language support is loaded, initialize any existing code blocks
      if (window.hljs) {
        window.hljs.highlightAll();
      }
    };
  },

  toggleTheme(isDarkTheme) {
    const root = document.documentElement;
    const themeCSS = document.getElementById('highlight-theme-css');
    
    if (isDarkTheme) {
      // Apply dark theme
      root.setAttribute('data-theme', 'dark');
      // Change highlight.js theme to a dark one
      if (themeCSS) {
        themeCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/monokai.min.css';
      }
    } else {
      // Apply light theme
      root.setAttribute('data-theme', 'light');
      // Change highlight.js theme to a light one
      if (themeCSS) {
        themeCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
      }
    }
    
    // Re-highlight all code blocks with new theme
    // This ensures all SQL artifacts get updated
    if (window.hljs) {
      setTimeout(() => {
        window.hljs.highlightAll();
      }, 100); // Small delay to ensure CSS has updated
    }
  },

  toggleMaximizedState(model) {
    const newState = !model.get("is_maximized");
    model.set("is_maximized", newState);
    model.save_changes();
  },

  updateMaximizedState(model) {
    const isMaximized = model.get("is_maximized") || false;
    const container = document.querySelector('.chat-widget-container');
    if (!container) return;
    
    const maximizeButton = container.querySelector('#maximize-button');
    if (!maximizeButton) return;
    
    const maximizeIcon = maximizeButton.querySelector('.maximize-icon');
    if (!maximizeIcon) return;
    
    if (isMaximized) {
      // Apply maximized styles
      container.classList.add('maximized');
      maximizeIcon.textContent = '⤡'; // Minimize icon
      maximizeButton.title = 'Minimize chat window';
    } else {
      // Apply normal styles
      container.classList.remove('maximized');
      maximizeIcon.textContent = '⤢'; // Maximize icon
      maximizeButton.title = 'Maximize chat window';
    }
    
    // Update the history scroll position after size change
    const history = container.querySelector(".chat-history");
    if (history) {
      history.scrollTop = history.scrollHeight;
    }
  },
  
  render({ model, el }) {
    // Create widget with chat container, thinking UI, and initially hidden artifacts panel
    el.innerHTML = `
    <div class="chat-widget-container">
      <div class="chat-container">
        <div class="chat-header">
          <div class="chat-title">Chat UI</div>
          <div class="header-controls">
            <button id="maximize-button" title="Maximize chat window">
              <span class="maximize-icon">⤢</span>
            </button>
            <div class="theme-toggle-container">
              <label class="theme-switch" for="theme-checkbox">
                <input type="checkbox" id="theme-checkbox">
                <span class="theme-slider round"></span>
              </label>
              <span class="theme-label">Dark Mode</span>
            </div>
          </div>
        </div>
        <div class="chat-history"></div>
        <div class="input-container">
          <div class="input-row">
            <input type="text" id="message-input" placeholder="Type your message...">
            <button id="send-button">Send</button>
          </div>
        </div>
      </div>
      <div class="resize-handle" id="resize-handle"></div>
      <div class="artifacts-panel hidden">
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
    
    // Initialize thinking state variables
    this.thinkingSteps = [];
    this.currentThinkingMessage = null;
    this.thinkingExpanded = false;

    // Initialize resize state variables
    this.panelWidth = 350; // Default panel width 
    this.isDragging = false;

    // Initialize maximized state
    this.isMaximized = false;

    const themeToggle = el.querySelector('#theme-checkbox');
    themeToggle.addEventListener('change', (e) => {
      this.toggleTheme(e.target.checked);
    });

    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkScheme) {
      themeToggle.checked = true;
      this.toggleTheme(true);
    } else {
      themeToggle.checked = false;
      this.toggleTheme(false);
    }
    
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
      const artifactsPanel = el.querySelector('.artifacts-panel');
      
      // Show or hide the list view
      const artifactsList = el.querySelector('.artifacts-list');
      artifactsList.style.display = 'none'; // Hide the list view by default
      
      // Clear the display area
      artifactsDisplay.innerHTML = '';
      
      const artifacts = model.get("artifacts") || {};
      this.artifactIds = Object.keys(artifacts);
      
      // Show or hide the artifacts panel based on whether there are any artifacts
      if (this.artifactIds.length > 0) {
        // Show the artifacts panel if it was hidden
        artifactsPanel.classList.remove('hidden');
        
        // Apply saved width when showing artifacts panel
        artifactsPanel.style.width = `${this.panelWidth}px`;
        chatContainer.style.width = `calc(100% - ${this.panelWidth}px)`;
      } else {
        // Hide the artifacts panel if there are no artifacts
        artifactsPanel.classList.add('hidden');
        
        // Reset chat container width
        chatContainer.style.width = '100%';
        return;
      }
      
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
            } else if (artifactType === 'sql') {
              // Just the SQL query
              contentHTML = `
                <div class="sql-query-section">
                  <pre class="sql-query"><code class="language-sql">${this.escapeHTML(typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content, null, 2))}</code></pre>
                </div>
              `;
            } else if (artifactType === 'sql_result') {
              // Render SQL with results
              contentHTML = `
                <div class="sql-query-section">
                  <pre class="sql-query"><code class="language-sql">${this.escapeHTML(artifact.content.query)}</code></pre>
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
                  <pre class="sql-query"><code class="language-sql">${this.escapeHTML(artifact.content.query)}</code></pre>
                </div>
                <div class="sql-error-section">
                  <div class="error-header">Error</div>
                  <pre class="error-message">${this.escapeHTML(artifact.content.error)}</pre>
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
              contentHTML = `<pre class="artifact-content">"><code class="language-sql">${this.escapeHTML(
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
            if (['sql', 'sql_result', 'sql_error'].includes(artifactType)) {
              // Find all code blocks in the artifact and apply syntax highlighting
              const codeElements = artifactEl.querySelectorAll('code.language-sql');
              codeElements.forEach(el => this.applySyntaxHighlighting(el));
            }
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

    this.applySyntaxHighlighting = function(element) {
      if (window.hljs) {
        window.hljs.highlightElement(element);
      }
    };
    
    // Function to toggle thinking expanded/collapsed state
    this.toggleThinkingExpanded = function(event) {
      // Find the closest thinking container element from the clicked button
      const toggleBtn = event.currentTarget;
      const thinkingElement = toggleBtn.closest('.thinking-container') || 
                            toggleBtn.closest('.thinking-result');
      
      if (!thinkingElement) return;
      
      // Get current expanded state from data attribute (default to false)
      const isExpanded = thinkingElement.getAttribute('data-expanded') === 'true';
      
      // Toggle the state
      const newExpandedState = !isExpanded;
      thinkingElement.setAttribute('data-expanded', newExpandedState);
      
      // Find the body and toggle icon within this specific thinking element
      const thinkingBody = thinkingElement.querySelector('.thinking-body');
      const toggleIcon = toggleBtn.querySelector('.thinking-toggle-icon');
      
      if (thinkingBody && toggleIcon) {
        if (newExpandedState) {
          // Show all steps when expanded
          thinkingBody.classList.remove('collapsed');
          toggleIcon.innerHTML = '&#9650;'; // Up arrow
          toggleIcon.setAttribute('aria-label', 'Collapse thinking');
        } else {
          // Hide all but latest step when collapsed
          thinkingBody.classList.add('collapsed');
          toggleIcon.innerHTML = '&#9660;'; // Down arrow
          toggleIcon.setAttribute('aria-label', 'Expand thinking');
        }
      }
    };
    
    // Update the thinking message display based on expanded/collapsed state
    this.updateThinkingMessageDisplay = function() {
      if (!this.currentThinkingMessage) return;
      
      const thinkingBody = this.currentThinkingMessage.querySelector('.thinking-body');
      const toggleIcon = this.currentThinkingMessage.querySelector('.thinking-toggle-icon');
      
      if (this.thinkingExpanded) {
        // Show all steps when expanded
        thinkingBody.classList.remove('collapsed');
        toggleIcon.innerHTML = '&#9650;'; // Up arrow
        toggleIcon.setAttribute('aria-label', 'Collapse thinking');
      } else {
        // Hide all but latest step when collapsed
        thinkingBody.classList.add('collapsed');
        toggleIcon.innerHTML = '&#9660;'; // Down arrow
        toggleIcon.setAttribute('aria-label', 'Expand thinking');
      }
    };

    // Add a click handler to a thinking toggle button
    this.setupThinkingToggleHandler = function(toggleBtn) {
      if (toggleBtn) {
        // Remove any existing event listeners to prevent duplicates
        toggleBtn.removeEventListener('click', this.toggleThinkingExpanded);
        
        // Add the new event listener
        toggleBtn.addEventListener('click', this.toggleThinkingExpanded);
      }
    };

    // Bind the toggleThinking method to this instance
    this.toggleThinkingBound = this.toggleThinkingExpanded.bind(this);

    // Update the thinking UI based on model state
    this.updateThinkingUI = function(model) {
      const isThinking = model.get("thinking_active") || false;
      
      // If thinking is active but there's no thinking message yet, create one
      if (isThinking && !this.currentThinkingMessage) {
        // Create a new thinking message
        const history = el.querySelector(".chat-history");
        this.currentThinkingMessage = document.createElement("div");
        this.currentThinkingMessage.className = "message other-message thinking-message";
        this.currentThinkingMessage.innerHTML = `
          <div class="thinking-container" data-expanded="false">
            <div class="thinking-header">
              <div class="thinking-header-left">
                <div class="thinking-indicator">
                  <span class="thinking-dot"></span>
                  <span class="thinking-dot"></span>
                  <span class="thinking-dot"></span>
                </div>
                <div class="thinking-label">Thinking...</div>
              </div>
              <div class="thinking-toggle">
                <button class="thinking-toggle-btn" aria-label="Toggle thinking display">
                  <span class="thinking-toggle-icon">&#9660;</span>
                </button>
              </div>
            </div>
            <div class="thinking-body collapsed">
              <div class="thinking-steps"></div>
            </div>
          </div>
        `;
        history.appendChild(this.currentThinkingMessage);
        history.scrollTop = history.scrollHeight;
        
        // Reset the thinking steps
        this.thinkingSteps = [];
        
        // Add click handler for toggle button
        const toggleBtn = this.currentThinkingMessage.querySelector('.thinking-toggle-btn');
        this.setupThinkingToggleHandler(toggleBtn);
      } 
      // If thinking is no longer active but we have a thinking message, clean up
      else if (!isThinking && this.currentThinkingMessage) {
        // Convert the thinking message to a regular message if there were steps
        if (this.thinkingSteps.length > 0) {
          // Get the current expanded state from the thinking container
          const thinkingContainer = this.currentThinkingMessage.querySelector('.thinking-container');
          const wasExpanded = thinkingContainer && thinkingContainer.getAttribute('data-expanded') === 'true';
          
          // Update the thinking message to show a summary of the thinking process
          this.currentThinkingMessage.classList.remove("thinking-message");
          
          // Create the HTML for all thinking steps, marking the last one as latest
          const stepsHTML = this.thinkingSteps.map((step, index) => {
            const isLatest = index === this.thinkingSteps.length - 1;
            return `
              <div class="thinking-step ${isLatest ? 'latest-step' : ''}">
                <div class="thinking-step-title">${step.title}</div>
                ${step.body ? `<div class="thinking-step-body">${step.body}</div>` : ''}
              </div>
            `;
          }).join('');
          
          this.currentThinkingMessage.innerHTML = `
            <div class="thinking-result" data-expanded="${wasExpanded}">
              <div class="thinking-result-header">
                <span>Finished thinking process:</span>
                <div class="thinking-toggle">
                  <button class="thinking-toggle-btn" aria-label="Toggle thinking display">
                    <span class="thinking-toggle-icon">${wasExpanded ? '&#9650;' : '&#9660;'}</span>
                  </button>
                </div>
              </div>
              <div class="thinking-body ${wasExpanded ? '' : 'collapsed'}">
                <div class="thinking-steps">${stepsHTML}</div>
              </div>
            </div>
          `;
          
          // Re-add click handler for toggle button
          const toggleBtn = this.currentThinkingMessage.querySelector('.thinking-toggle-btn');
          this.setupThinkingToggleHandler(toggleBtn);
        } else {
          // If there were no steps, just remove the thinking message
          this.currentThinkingMessage.remove();
        }
        
        // Reset the current thinking message
        this.currentThinkingMessage = null;
      }
    };
    
    // Add a new thinking step
    this.addThinkingStep = function(title, body) {
      if (this.currentThinkingMessage) {
        // Save the step to our array
        const step = { title, body };
        this.thinkingSteps.push(step);
        
        // Get the current expanded state from the thinking container
        const thinkingContainer = this.currentThinkingMessage.querySelector('.thinking-container');
        const isExpanded = thinkingContainer && thinkingContainer.getAttribute('data-expanded') === 'true';
        
        // Generate HTML for all steps, marking the newest one as latest
        const allStepsHTML = this.thinkingSteps.map((step, index) => {
          const isLatest = index === this.thinkingSteps.length - 1;
          return `
            <div class="thinking-step ${isLatest ? 'latest-step' : ''}">
              <div class="thinking-step-title">${step.title}</div>
              ${step.body ? `<div class="thinking-step-body">${step.body}</div>` : ''}
            </div>
          `;
        }).join('');
        
        // Update the steps container
        const stepsContainer = this.currentThinkingMessage.querySelector(".thinking-steps");
        stepsContainer.innerHTML = allStepsHTML;
        
        // Update the collapsed/expanded state
        const thinkingBody = this.currentThinkingMessage.querySelector('.thinking-body');
        const toggleIcon = this.currentThinkingMessage.querySelector('.thinking-toggle-icon');
        
        if (isExpanded) {
          thinkingBody.classList.remove('collapsed');
          toggleIcon.innerHTML = '&#9650;'; // Up arrow
        } else {
          thinkingBody.classList.add('collapsed');
          toggleIcon.innerHTML = '&#9660;'; // Down arrow
        }
        
        // Scroll to the bottom
        const history = el.querySelector(".chat-history");
        history.scrollTop = history.scrollHeight;
      }
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

    // Event listeners for maximize button
    el.querySelector("#maximize-button").addEventListener("click", () => {
      self.toggleMaximizedState(model);
    });
    
    // Event listeners for navigation buttons
    el.querySelector(".prev-button").addEventListener("click", () => {
      self.prevArtifact(model);
    });
    
    el.querySelector(".next-button").addEventListener("click", () => {
      self.nextArtifact(model);
    });

    // Setup resize handler
    const container = el.querySelector('.chat-widget-container');
    const chatContainer = el.querySelector('.chat-container');
    const resizeHandle = el.querySelector('#resize-handle');
    const artifactsPanel = el.querySelector('.artifacts-panel');
    
    // Min and max width constraints
    const MIN_CHAT_WIDTH = 300;
    const MIN_PANEL_WIDTH = 250;
    // const MAX_PANEL_WIDTH = 600;
    const getMaxPanelWidth = () => Math.max(MIN_PANEL_WIDTH, window.innerWidth * 0.5);

    // Set initial width if artifacts panel is visible
    if (!artifactsPanel.classList.contains('hidden')) {
      artifactsPanel.style.width = `${this.panelWidth}px`;
    }
    
    // Handle mouse down event on resize handle
    resizeHandle.addEventListener('mousedown', function(e) {
      if (artifactsPanel.classList.contains('hidden')) return;
      
      // Start dragging
      self.isDragging = true;
      self.startX = e.clientX;
      self.startWidth = artifactsPanel.offsetWidth;
      
      // Add dragging class to indicate resizing is in progress
      container.classList.add('resizing');
      
      // Prevent text selection during drag
      e.preventDefault();
    });
    
    // Handle mouse move event (for drag resizing)
    document.addEventListener('mousemove', function(e) {
      if (!self.isDragging) return;
      
      // Calculate new width based on mouse movement
      const containerWidth = container.offsetWidth;
      const deltaX = self.startX - e.clientX;
      let newWidth = Math.min(getMaxPanelWidth(), Math.max(MIN_PANEL_WIDTH, self.startWidth + deltaX));
      
      // Ensure chat container doesn't get too small
      if (containerWidth - newWidth < MIN_CHAT_WIDTH) {
        newWidth = containerWidth - MIN_CHAT_WIDTH;
      }
      
      // Apply the new width
      artifactsPanel.style.width = `${newWidth}px`;
      chatContainer.style.width = `calc(100% - ${newWidth}px)`;
      
      // Update state variable
      self.panelWidth = newWidth;
    });
    
    // Handle mouse up event (end dragging)
    document.addEventListener('mouseup', function() {
      if (self.isDragging) {
        self.isDragging = false;
        container.classList.remove('resizing');
        
        // Optionally save the width in model for persistence
        model.set('artifact_panel_width', self.panelWidth);
        model.save_changes();
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
        } else if (msg.type === 'thinking_update') {
          // Handle thinking updates
          if (msg.action === 'start') {
            // Start a new thinking process
            model.set("thinking_active", true);
            model.save_changes();
          } else if (msg.action === 'add_step') {
            // Add a new thinking step with title and optional body
            self.addThinkingStep(msg.title, msg.body || '');
          } else if (msg.action === 'end') {
            // End the thinking process
            model.set("thinking_active", false);
            model.save_changes();
          }
        }
      } else {
        // Backwards compatibility with string messages
        addMessage(msg, false);
      }
    });

    // Initialize the artifacts panel
    this.updateArtifactsNavigation(model);
    this.updateMaximizedState(model);
    
    return () => {};
  }
};