# Modified chat_widget.py with structured thinking steps
import pathlib
import anywidget
import traitlets
import pandas as pd
import numpy as np
from markdown import markdown
import json
import time
from IPython.display import HTML

# Define the path to the bundled static assets.
_STATIC_PATH = pathlib.Path(__file__).parent / "static"

class ChatWidget(anywidget.AnyWidget):
    # _esm and _css point to the bundled front‑end files.
    _esm = _STATIC_PATH / "index.js"
    _css = _STATIC_PATH / "styles.css"
    
    # Add traitlets to track artifacts
    artifacts = traitlets.Dict().tag(sync=True)
    current_artifact_id = traitlets.Unicode().tag(sync=True)
    
    # Add traitlet for tracking extended thinking state
    thinking_active = traitlets.Bool(False).tag(sync=True)
    
    # Add a traitlet for panel width
    artifact_panel_width = traitlets.Int(350).tag(sync=True)
    
    # Add traitlet for tracking maximized state
    is_maximized = traitlets.Bool(False).tag(sync=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Expose the message handler so users can modify it after import.
        self.handle_message = self._default_handle_message
        # Register the internal wrapper to listen for messages.
        self.on_msg(self._handle_message_wrapper)
        # Initialize empty artifacts dict
        self.artifacts = {}
        self.current_artifact_id = ""
        self.thinking_active = False
        self.artifact_panel_width = 350  # Default width

    def _handle_message_wrapper(self, widget, msg, buffers):
        """Wrapper that catches and displays errors from custom message handlers"""
        try:
            # Call the (possibly overridden) message handler
            self.handle_message(widget, msg, buffers)
        except Exception as e:
            import traceback
            import sys
            
            # Get the full exception traceback
            exc_type, exc_value, exc_traceback = sys.exc_info()
            tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
            tb_text = ''.join(tb_lines)
            
            # Create an error message for the UI
            error_msg = f"<div class='error-container'><h3>⚠️ Error in message handler</h3>"
            error_msg += f"<p><strong>Error:</strong> {str(e)}</p>"
            error_msg += "</div>"
            
            # Send the error to the UI as a message
            self.send({"type": "chat_message", "content": error_msg})
            
            # Create an error artifact with the full traceback
            error_id = f"error_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}"
            self.create_artifact(
                error_id,
                tb_text,
                "",
                f"Error: {str(e)}",
                "error"
            )
            
            # Log the error to the console as well
            print(f"Error in message handler: {str(e)}")
            print(tb_text)

    def _default_handle_message(self, widget, msg, buffers):
        # Default message handling logic, now supporting structured messages
        if isinstance(msg, dict) and "command" in msg:
            # Handle structured commands
            if msg["command"] == "select_artifact":
                self.current_artifact_id = msg.get("id", "")
                response = {"type": "chat_message", "content": f"Selected artifact {self.current_artifact_id}"}
            else:
                response = {"type": "chat_message", "content": f"Unknown command: {msg['command']}"}
        elif msg.lower() == "hello":
            response = {"type": "chat_message", "content": "Hello! How can I help you?"}
        elif msg.lower() == "show dataframe":
            df = pd.DataFrame({'A': [1, 2, 3], 'B': ['x', 'y', 'z']})
            response = {"type": "chat_message", "content": df.to_html()}
        elif msg.lower() == "markdown":
            md_text = (
                "**Sample Markdown:**\n"
                "- Item 1\n"
                "- Item 2\n"
                "```python\nprint('Hello World')\n```"
            )
            response = {"type": "chat_message", "content": markdown(md_text)}
        elif msg.lower() == "show sample artifact":
            # Example command to create a sample artifact
            self.create_artifact(
                "sample_code",
                "def hello_world():\n    print('Hello, World!')",
                "python",
                "Sample Python Function"
            )
            response = {"type": "chat_message", "content": "Created a sample Python artifact."}
        elif msg.lower() == "show thinking":
            # Example of using extended thinking
            self.start_thinking()
            # Simulate thinking with some structured steps
            self.add_thinking_step(
                "Problem Analysis", 
                "First, I need to understand what we're looking for. The question involves statistical analysis of time-series data."
            )
            time.sleep(1.5)
            self.add_thinking_step(
                "Data Preparation", 
                "I should prepare the data by checking for missing values, normalizing scales, and ensuring consistent formatting."
            )
            time.sleep(1.5)
            self.add_thinking_step(
                "Applying Statistical Methods", 
                """I'll apply several statistical methods:
                1. Moving averages to identify trends
                2. Seasonal decomposition to find patterns
                3. Correlation analysis to find relationships between variables"""
            )
            time.sleep(1.5)
            # End thinking and provide the answer
            self.end_thinking()
            response = {"type": "chat_message", "content": "After careful analysis, I've determined the answer is 42."}
        else:
            response = {"type": "chat_message", "content": f"You said: {msg}"}
        
        # Send the response to the front end.
        self.send(response)
    
    # Extended Thinking Methods with structured thinking steps
    def start_thinking(self):
        """Start the extended thinking process."""
        self.thinking_active = True
        self.send({"type": "thinking_update", "action": "start"})
    
    def add_thinking_step(self, title, body=""):
        """Add a new thinking step to the current thinking process.
        
        Parameters:
        -----------
        title : str
            The title/summary of this thinking step
        body : str, optional
            Detailed explanation or content for this thinking step
        """
        if self.thinking_active:
            self.send({
                "type": "thinking_update", 
                "action": "add_step", 
                "title": title,
                "body": body
            })
    
    def end_thinking(self):
        """End the current thinking process."""
        self.thinking_active = False
        self.send({"type": "thinking_update", "action": "end"})
    
    def create_artifact(self, artifact_id, content, language="", title="", artifact_type="code"):
        """Create a new code artifact or update an existing one.
        
        Parameters:
        -----------
        artifact_id : str
            Unique identifier for the artifact
        content : str or pd.DataFrame
            Content of the artifact. Can be code, SQL, or a pandas DataFrame
        language : str
            Programming language for code syntax highlighting
        title : str
            Title of the artifact
        artifact_type : str
            Type of artifact: 'code', 'dataframe', 'sql', 'error', or 'visualization'
        """
        # Process content based on type
        processed_content = content
        
        # Special handling for DataFrames
        if artifact_type == 'dataframe' and isinstance(content, pd.DataFrame):
            # Convert DataFrame to JSON representation with styling info
            processed_content = {
                'html': content.to_html(classes='dataframe-table', index=True),
                'shape': content.shape,
                'columns': content.columns.tolist(),
                'dtypes': {col: str(dtype) for col, dtype in content.dtypes.items()},
                'preview': content.head(5).to_dict(orient='records')
            }
        
        # Store the artifact
        self.artifacts[artifact_id] = {
            "id": artifact_id,
            "content": processed_content,
            "language": language,
            "title": title,
            "type": artifact_type,
            "created_at": pd.Timestamp.now().isoformat()
        }
        
        self.current_artifact_id = artifact_id
        
        # Notify frontend of artifact change
        self.send({"type": "artifact_update", "artifact": self.artifacts[artifact_id]})
        
    def create_sql_artifact(self, artifact_id, query, result=None, error=None, title="SQL Query"):
        """Create a SQL query artifact with optional result or error.
        
        Parameters:
        -----------
        artifact_id : str
            Unique identifier for the artifact
        query : str
            SQL query text
        result : pd.DataFrame, optional
            DataFrame containing query results
        error : str, optional
            Error message if query failed
        title : str
            Title for the artifact
        """
        # Create the base content with the query
        content = {
            'query': query,
            'has_result': result is not None,
            'has_error': error is not None
        }
        
        # Determine the artifact type
        if error is not None:
            # Query resulted in an error
            artifact_type = 'sql_error'
            content['error'] = error
        elif result is not None:
            # Query returned a DataFrame
            artifact_type = 'sql_result'
            # Include DataFrame details
            content['result'] = {
                'html': result.to_html(classes='dataframe-table', index=True),
                'shape': result.shape,
                'columns': result.columns.tolist(),
                'preview': result.head(5).to_dict(orient='records')
            }
        else:
            # Just the query without execution
            artifact_type = 'sql'
        
        # Create the artifact
        self.artifacts[artifact_id] = {
            "id": artifact_id,
            "content": content,
            "language": "sql",
            "title": title,
            "type": artifact_type,
            "created_at": pd.Timestamp.now().isoformat()
        }
        
        self.current_artifact_id = artifact_id
        
        # Notify frontend of artifact change
        self.send({"type": "artifact_update", "artifact": self.artifacts[artifact_id]})
    
    def update_artifact(self, artifact_id, new_content=None, new_language=None, new_title=None, new_type=None):
        """Update an existing artifact."""
        if artifact_id not in self.artifacts:
            return False
            
        artifact = self.artifacts[artifact_id]
        if new_content is not None:
            # Handle special processing for DataFrames
            if new_type == 'dataframe' and isinstance(new_content, pd.DataFrame):
                artifact["content"] = {
                    'html': new_content.to_html(classes='dataframe-table', index=True),
                    'shape': new_content.shape,
                    'columns': new_content.columns.tolist(),
                    'dtypes': {col: str(dtype) for col, dtype in new_content.dtypes.items()},
                    'preview': new_content.head(5).to_dict(orient='records')
                }
            else:
                artifact["content"] = new_content
                
        if new_language is not None:
            artifact["language"] = new_language
        if new_title is not None:
            artifact["title"] = new_title
        if new_type is not None:
            artifact["type"] = new_type
            
        self.artifacts[artifact_id] = artifact
        self.current_artifact_id = artifact_id
        # Notify frontend of artifact change
        self.send({"type": "artifact_update", "artifact": artifact})
        return True
    
    def _handle_resize(self, width):
        """Update the saved panel width."""
        self.artifact_panel_width = width
        
    def toggle_maximized(self):
        """Toggle the maximized state of the widget."""
        self.is_maximized = not self.is_maximized