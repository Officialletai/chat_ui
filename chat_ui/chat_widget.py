# chat_ui/chat_widget.py
import pathlib
import anywidget
import traitlets
import pandas as pd
from markdown import markdown

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
    
    def create_artifact(self, artifact_id, content, language="", title=""):
        """Create a new code artifact or update an existing one."""
        self.artifacts[artifact_id] = {
            "id": artifact_id,
            "content": content,
            "language": language,
            "title": title,
            "created_at": pd.Timestamp.now().isoformat()
        }
        self.current_artifact_id = artifact_id
        # Notify frontend of artifact change
        self.send({"type": "artifact_update", "artifact": self.artifacts[artifact_id]})
        
    def update_artifact(self, artifact_id, new_content=None, new_language=None, new_title=None):
        """Update an existing artifact."""
        if artifact_id not in self.artifacts:
            return False
            
        artifact = self.artifacts[artifact_id]
        if new_content is not None:
            artifact["content"] = new_content
        if new_language is not None:
            artifact["language"] = new_language
        if new_title is not None:
            artifact["title"] = new_title
            
        self.artifacts[artifact_id] = artifact
        self.current_artifact_id = artifact_id
        # Notify frontend of artifact change
        self.send({"type": "artifact_update", "artifact": artifact})
        return True