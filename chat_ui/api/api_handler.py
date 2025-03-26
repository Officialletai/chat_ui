# chat_ui/api/api_handler.py
from flask import Flask, request, jsonify
from functools import wraps
import threading
import logging

logger = logging.getLogger(__name__)

class APIHandler:
    """
    HTTP API handler for ChatWidget that exposes the widget's functionality
    through a simple HTTP API without modifying the core ChatWidget code.
    """
    
    def __init__(self, chat_widget, host='127.0.0.1', port=5000, api_key=None):
        """
        Initialize the API handler.
        
        Parameters:
        -----------
        chat_widget : ChatWidget
            The ChatWidget instance to expose via API
        host : str
            Host to bind the API server to
        port : int
            Port to bind the API server to
        api_key : str, optional
            API key for authentication. If None, authentication is disabled.
        """
        self.chat_widget = chat_widget
        self.host = host
        self.port = port
        self.api_key = api_key
        
        # Create Flask app
        self.app = Flask(__name__)
        
        # Register routes
        self._register_routes()
        
        # Server state
        self.server_thread = None
        self.is_running = False
    
    def _require_api_key(self, f):
        """
        Decorator to require API key authentication if enabled.
        """
        @wraps(f)
        def decorated(*args, **kwargs):
            # Skip auth if no API key is set
            if self.api_key is None:
                return f(*args, **kwargs)
                
            # Check API key
            api_key = request.headers.get('X-API-Key')
            if not api_key or api_key != self.api_key:
                return jsonify({
                    'status': 'error',
                    'message': 'Unauthorized'
                }), 401
            return f(*args, **kwargs)
        return decorated
    
    def _register_routes(self):
        """Register all API routes with the Flask app."""
        
        # --- Messages Endpoint ---
        @self.app.route('/api/v1/messages', methods=['POST'])
        @self._require_api_key
        def send_message():
            data = request.json
            if not data or 'content' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing required field: content'
                }), 400
                
            # Send message to widget
            self.chat_widget.send({
                "type": "chat_message", 
                "content": data['content']
            })
            
            return jsonify({
                'status': 'success',
                'message': 'Message sent successfully'
            })
        
        # --- Artifacts Endpoints ---
        @self.app.route('/api/v1/artifacts', methods=['GET'])
        @self._require_api_key
        def get_artifacts():
            """Get list of all artifacts."""
            artifacts = self.chat_widget.artifacts
            result = {}
            
            for id, artifact in artifacts.items():
                # Convert to serializable format
                result[id] = {
                    'id': artifact['id'],
                    'title': artifact['title'],
                    'type': artifact['type'],
                    'language': artifact['language'],
                    'created_at': artifact['created_at']
                }
                
            return jsonify({
                'status': 'success',
                'data': result
            })
            
        @self.app.route('/api/v1/artifacts/<artifact_id>', methods=['GET'])
        @self._require_api_key
        def get_artifact(artifact_id):
            """Get a specific artifact by ID."""
            if artifact_id not in self.chat_widget.artifacts:
                return jsonify({
                    'status': 'error',
                    'message': f'Artifact not found: {artifact_id}'
                }), 404
                
            artifact = self.chat_widget.artifacts[artifact_id]
            
            # Handle different artifact types for serialization
            if artifact['type'] == 'dataframe' and isinstance(artifact['content'], dict):
                # DataFrame artifacts are already in a serializable format
                content = artifact['content']
            else:
                # For other types, convert to string if needed
                content = artifact['content']
                if not isinstance(content, (str, dict, list)):
                    content = str(content)
                    
            result = {
                'id': artifact['id'],
                'title': artifact['title'],
                'type': artifact['type'],
                'language': artifact['language'],
                'content': content,
                'created_at': artifact['created_at']
            }
                
            return jsonify({
                'status': 'success',
                'data': result
            })
            
        @self.app.route('/api/v1/artifacts', methods=['POST'])
        @self._require_api_key
        def create_artifact():
            """Create a new artifact."""
            data = request.json
            
            # Validate required fields
            required_fields = ['id', 'content']
            missing = [f for f in required_fields if f not in data]
            if missing:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required fields: {", ".join(missing)}'
                }), 400
            
            # Get optional fields with defaults
            language = data.get('language', '')
            title = data.get('title', '')
            artifact_type = data.get('type', 'code')
            
            # Create the artifact
            try:
                self.chat_widget.create_artifact(
                    data['id'],
                    data['content'],
                    language,
                    title,
                    artifact_type
                )
                
                return jsonify({
                    'status': 'success',
                    'message': 'Artifact created',
                    'data': {'id': data['id']}
                })
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
                
        @self.app.route('/api/v1/artifacts/<artifact_id>', methods=['PUT'])
        @self._require_api_key
        def update_artifact(artifact_id):
            """Update an existing artifact."""
            if artifact_id not in self.chat_widget.artifacts:
                return jsonify({
                    'status': 'error',
                    'message': f'Artifact not found: {artifact_id}'
                }), 404
                
            data = request.json
            if not data:
                return jsonify({
                    'status': 'error',
                    'message': 'No update data provided'
                }), 400
                
            # Extract fields to update
            new_content = data.get('content')
            new_language = data.get('language')
            new_title = data.get('title')
            new_type = data.get('type')
            
            # Update the artifact
            try:
                result = self.chat_widget.update_artifact(
                    artifact_id,
                    new_content,
                    new_language,
                    new_title,
                    new_type
                )
                
                if result:
                    return jsonify({
                        'status': 'success',
                        'message': 'Artifact updated'
                    })
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Failed to update artifact'
                    }), 500
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
        
        # --- Thinking Endpoints ---
        @self.app.route('/api/v1/thinking', methods=['POST'])
        @self._require_api_key
        def control_thinking():
            """Control the thinking process (start/add step/end)."""
            data = request.json
            if not data or 'action' not in data:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing required field: action'
                }), 400
                
            action = data['action']
            
            try:
                if action == 'start':
                    self.chat_widget.start_thinking()
                    return jsonify({
                        'status': 'success',
                        'message': 'Thinking started'
                    })
                    
                elif action == 'add_step':
                    if 'title' not in data:
                        return jsonify({
                            'status': 'error',
                            'message': 'Missing required field: title'
                        }), 400
                        
                    title = data['title']
                    body = data.get('body', '')
                    
                    self.chat_widget.add_thinking_step(title, body)
                    return jsonify({
                        'status': 'success',
                        'message': 'Thinking step added'
                    })
                    
                elif action == 'end':
                    self.chat_widget.end_thinking()
                    return jsonify({
                        'status': 'success',
                        'message': 'Thinking ended'
                    })
                    
                else:
                    return jsonify({
                        'status': 'error',
                        'message': f'Unknown action: {action}'
                    }), 400
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': str(e)
                }), 500
    
    def start(self, background=True):
        """
        Start the API server.
        
        Parameters:
        -----------
        background : bool
            Whether to run the server in a background thread
            
        Returns:
        --------
        bool
            True if started successfully, False otherwise
        """
        if self.is_running:
            logger.warning("API server is already running")
            return False
            
        if background:
            def run_server():
                try:
                    self.app.run(
                        host=self.host, 
                        port=self.port, 
                        debug=False, 
                        use_reloader=False
                    )
                except Exception as e:
                    logger.error(f"Error starting API server: {e}")
                
            self.server_thread = threading.Thread(target=run_server)
            self.server_thread.daemon = True
            self.server_thread.start()
            self.is_running = True
            logger.info(f"API server started on http://{self.host}:{self.port}/")
            return True
        else:
            # Run in the main thread (blocking)
            try:
                logger.info(f"Starting API server on http://{self.host}:{self.port}/")
                self.app.run(host=self.host, port=self.port)
                self.is_running = True
                return True
            except Exception as e:
                logger.error(f"Error starting API server: {e}")
                return False
            
    @property
    def base_url(self):
        """Get the base URL of the API."""
        return f"http://{self.host}:{self.port}/api/v1"