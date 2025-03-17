# chat_ui/chat_widget.py
import pathlib
import anywidget
import traitlets
import pandas as pd
import numpy as np
from markdown import markdown
import json
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Expose the message handler so users can modify it after import.
        self.handle_message = self._default_handle_message
        # Register the internal wrapper to listen for messages.
        self.on_msg(self._handle_message_wrapper)
        # Initialize empty artifacts dict
        self.artifacts = {}
        self.current_artifact_id = ""

    def _handle_message_wrapper(self, widget, msg, buffers):
        # Calls the (possibly overridden) message handler.
        self.handle_message(widget, msg, buffers)

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
        else:
            response = {"type": "chat_message", "content": f"You said: {msg}"}
        
        # Send the response to the front end.
        self.send(response)
    
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