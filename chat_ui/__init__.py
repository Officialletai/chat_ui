# chat_ui/__init__.py
from .chat_widget import ChatWidget

# Lazy loading to avoid importing Flask when not needed
def get_api_handler():
    """
    Lazily import and return the APIHandler class.
    This ensures Flask is only imported when the API is actually needed.
    
    Returns:
        APIHandler class if dependencies are available, otherwise raises ImportError
    """
    try:
        from .api.api_handler import APIHandler
        return APIHandler
    except ImportError as e:
        raise ImportError(
            "API dependencies not found. Install with 'pip install chat_ui[api]'"
        ) from e