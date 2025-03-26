# Chat UI for Jupyter

A flexible, interactive chat interface widget for Jupyter notebooks with support for structured thinking, artifacts, and enhanced UI components.

## Installation

```bash
pip install chat_ui
```

## Basic Usage

```python
from chat_ui import ChatWidget

# Create the widget
chat = ChatWidget()

# Display the widget
chat
```

## Creating Artifacts

Artifacts are rich content displays that can be used to show code, data, visualizations, and more.

```python
# Create a code artifact
chat.create_artifact(
    "sample_code",
    "def hello_world():\n    print('Hello, World!')",
    "python",
    "Sample Python Function"
)

# Create a DataFrame artifact
import pandas as pd
df = pd.DataFrame({'A': [1, 2, 3], 'B': ['x', 'y', 'z']})
chat.create_artifact(
    "sample_dataframe",
    df,
    "",
    "Sample DataFrame",
    "dataframe"
)
```

## Using Structured Thinking

The structured thinking feature allows you to visualize step-by-step reasoning processes:

```python
# Start thinking process
chat.start_thinking()

# Add multiple thinking steps
chat.add_thinking_step(
    "Problem Analysis", 
    "First, I need to understand what we're looking for. This involves..."
)
chat.add_thinking_step(
    "Data Exploration", 
    "Now I'll examine the data structure and key metrics..."
)
chat.add_thinking_step(
    "Conclusion", 
    "Based on the analysis, the answer is..."
)

# End thinking process
chat.end_thinking()

# Send the final answer
chat.send({"type": "chat_message", "content": "Here's my final analysis..."})
```

## HTTP API Interface

The ChatWidget can be exposed via an HTTP API, allowing you to interact with it from external applications or services.

### Setting Up the API Handler

To use the API, you'll need to install the API dependencies:

```bash
pip install chat_ui[api]
```

Then you can set up the API handler in your Jupyter notebook:

```python
from chat_ui import ChatWidget
from chat_ui import get_api_handler

# Create the chat widget
chat = ChatWidget()

# Get the APIHandler class
APIHandler = get_api_handler()

# Create an API handler
api = APIHandler(
    chat_widget=chat,
    host='127.0.0.1',
    port=5000,
    api_key='your_secure_api_key'  # Set to None to disable authentication
)

# Start the API server in the background
api.start(background=True)

print(f"API server running at {api.base_url}")
```

### API Endpoints

The API provides access to all core ChatWidget functionality:

#### Health Check

- `GET /health` - Check if the API server is running

#### Messages

- `POST /api/v1/messages` - Send a message to the chat widget
  - Required: `{"content": "Your message here"}`

#### Artifacts

- `GET /api/v1/artifacts` - Get a list of all artifacts
- `GET /api/v1/artifacts/<artifact_id>` - Get a specific artifact
- `POST /api/v1/artifacts` - Create a new artifact
  - Required: `{"id": "artifact_id", "content": "artifact content"}`
  - Optional: `"language"`, `"title"`, `"type"`
- `PUT /api/v1/artifacts/<artifact_id>` - Update an existing artifact
  - Optional: `"content"`, `"language"`, `"title"`, `"type"`

#### Structured Thinking

- `POST /api/v1/thinking` - Control the thinking process
  - Start thinking: `{"action": "start"}`
  - Add step: `{"action": "add_step", "title": "Step Title", "body": "Step Details"}`
  - End thinking: `{"action": "end"}`

### Authentication

API requests are authenticated using the `X-API-Key` header. This header should contain the API key specified when creating the APIHandler instance.

### Example API Usage

Here's an example of using the API with Python's `requests` library:

```python
import requests

base_url = "http://127.0.0.1:5000"
headers = {"X-API-Key": "your_secure_api_key", "Content-Type": "application/json"}

# Send a message
response = requests.post(
    f"{base_url}/api/v1/messages",
    headers=headers,
    json={"content": "Hello from the API!"}
)
print(response.json())

# Create an artifact
response = requests.post(
    f"{base_url}/api/v1/artifacts",
    headers=headers,
    json={
        "id": "api_artifact",
        "content": "print('Hello from API')",
        "language": "python",
        "title": "API Created Artifact",
        "type": "code"
    }
)
print(response.json())
```

## Custom Message Handling

You can create custom message handlers to respond to specific commands:

```python
def custom_handler(widget, msg, buffers):
    if msg.lower() == "hello":
        widget.send({"type": "chat_message", "content": "Hello there! How can I help you?"})
    elif msg.lower() == "show data":
        # Create a DataFrame and show it as an artifact
        import pandas as pd
        df = pd.DataFrame({'A': [1, 2, 3], 'B': ['x', 'y', 'z']})
        widget.create_artifact(
            "data_example",
            df,
            "",
            "Sample Data",
            "dataframe"
        )
        widget.send({"type": "chat_message", "content": "Here's your data!"})
    else:
        # Fall back to the default handler for other messages
        widget._default_handle_message(widget, msg, buffers)

# Set the custom handler
chat.handle_message = custom_handler
```

## API Reference

### ChatWidget

The main class for creating interactive chat interfaces.

#### Methods

- **send(message)**: Send a message to the UI
- **create_artifact(id, content, language, title, artifact_type)**: Create a new artifact
- **update_artifact(id, new_content, new_language, new_title, new_type)**: Update an existing artifact
- **create_sql_artifact(id, query, result, error, title)**: Create a SQL query artifact with results
- **start_thinking()**: Start a structured thinking process
- **add_thinking_step(title, body)**: Add a thinking step with title and details
- **end_thinking()**: End the structured thinking process

### APIHandler

HTTP API interface for exposing the ChatWidget functionality.

#### Methods

- **start(background=True)**: Start the API server (in background or blocking mode)

#### Properties

- **base_url**: Get the base URL for the API endpoints

#### Artifact Types

- `"code"`: Code snippets
- `"dataframe"`: Pandas DataFrames
- `"sql"`: SQL queries
- `"sql_result"`: SQL queries with results
- `"sql_error"`: SQL queries with errors
- `"visualization"`: HTML visualizations or charts
- `"error"`: Error messages

## Examples

### Data Analysis Assistant

```python
# Import the ChatWidget
from chat_ui import ChatWidget
import pandas as pd
import numpy as np

# Create the widget instance
chat = ChatWidget()

# Define a custom message handler for data analysis
def data_analysis_handler(widget, msg, buffers):
    if msg.lower() == "show sales data":
        # Generate sample sales data
        dates = pd.date_range(start='2023-01-01', periods=12, freq='M')
        data = {
            'Date': dates,
            'Revenue': np.random.randint(100000, 500000, 12),
            'Expenses': np.random.randint(50000, 200000, 12),
            'Customers': np.random.randint(500, 2000, 12)
        }
        df = pd.DataFrame(data)
        df['Profit'] = df['Revenue'] - df['Expenses']
        df['Profit_Margin'] = (df['Profit'] / df['Revenue'] * 100).round(2)
        
        # Create DataFrame artifact
        widget.create_artifact(
            "sales_data",
            df,
            "",
            "Monthly Sales Data (2023)",
            "dataframe"
        )
        widget.send({"type": "chat_message", "content": "Here's the sales data for 2023."})
    else:
        # For other messages, use the default handler
        widget._default_handle_message(widget, msg, buffers)

# Set the custom message handler
chat.handle_message = data_analysis_handler

# Display the widget
chat
```

### Forecasting with Structured Thinking

```python
# Use the structured thinking UI to demonstrate forecasting
def forecast_handler(widget, msg, buffers):
    if msg.lower() == "forecast next quarter":
        # Start thinking process for forecasting
        widget.start_thinking()
        
        # Add thinking steps with detailed reasoning
        widget.add_thinking_step(
            "Data Preparation",
            """To make an accurate forecast, I need to:
            1. Gather historical sales data
            2. Adjust for seasonality
            3. Identify underlying trends"""
        )
        
        widget.add_thinking_step(
            "Model Selection",
            """Based on the data characteristics, I'll evaluate:
            - ARIMA models
            - Exponential Smoothing
            - Linear regression with seasonality"""
        )
        
        widget.add_thinking_step(
            "Forecast Generation",
            """The model predicts:
            January 2024: $435,000
            February 2024: $422,000
            March 2024: $478,000
            
            Total Q1 forecast: $1,335,000"""
        )
        
        # End thinking process
        widget.end_thinking()
        
        # Send final result
        widget.send({
            "type": "chat_message",
            "content": """<h3>Q1 2024 Revenue Forecast</h3>
            <p>Based on the analysis, the total Q1 forecast is $1,335,000, 
            representing a 12.5% year-over-year growth.</p>"""
        })
    else:
        # For other messages, use the default handler
        widget._default_handle_message(widget, msg, buffers)

# Set the custom handler
chat.handle_message = forecast_handler
```

### API Integration Example

This example demonstrates setting up the API and testing all endpoints:

```python
import requests
import json
import time
import pandas as pd
from chat_ui import ChatWidget
from chat_ui import get_api_handler

# Create the chat widget
chat = ChatWidget()

# Get API handler and start server
APIHandler = get_api_handler()
api = APIHandler(chat_widget=chat, api_key='test_key')
api.start(background=True)

# Create a sample artifact
chat.create_artifact(
    "test_code",
    "def hello_world():\n    print('Hello, World!')",
    "python",
    "Test Python Function"
)

# Test API - Send a message
response = requests.post(
    f"http://{api.host}:{api.port}/api/v1/messages",
    headers={"X-API-Key": "test_key", "Content-Type": "application/json"},
    json={"content": "Hello from API!"}
)
print(f"Message API Response: {response.status_code}")
print(response.json())

# Display the widget to see results
chat
```