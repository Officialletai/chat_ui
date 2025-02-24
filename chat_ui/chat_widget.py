# my_chat_widget/chat_widget.py
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Expose the message handler so users can modify it after import.
        self.handle_message = self._default_handle_message
        # Register the internal wrapper to listen for messages.
        self.on_msg(self._handle_message_wrapper)

    def _handle_message_wrapper(self, widget, msg, buffers):
        # Calls the (possibly overridden) message handler.
        self.handle_message(widget, msg, buffers)

    def _default_handle_message(self, widget, msg, buffers):
        # Default message handling logic.
        if msg.lower() == "hello":
            response = "Hello! How can I help you?"
        elif msg.lower() == "show dataframe":
            df = pd.DataFrame({'A': [1, 2, 3], 'B': ['x', 'y', 'z']})
            response = df.to_html()
        elif msg.lower() == "markdown":
            md_text = (
                "**Sample Markdown:**\n"
                "- Item 1\n"
                "- Item 2\n"
                "```python\nprint('Hello World')\n```"
            )
            response = markdown(md_text)
        else:
            response = f"You said: {msg}"
        # Send the response to the front end.
        self.send(response)
