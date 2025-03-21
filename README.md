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