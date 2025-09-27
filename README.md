# runCLAUDErun 🤖

A professional macOS scheduler for Claude CLI commands. Schedule and manage automated Claude tasks with precision control over all CLI flags and options.

## Features

- **Claude Installation Check**: Automatically detects and offers to install Claude CLI
- **Comprehensive Task Scheduling**: 
  - Manual (run on demand)
  - Interval-based
  - Calendar scheduling
  - Startup tasks
  - File watch triggers
- **Full CLI Flag Support**:
  - Model selection (Sonnet, Opus, Haiku)
  - Permission modes (Default, Plan-only, Accept Edits, Bypass)
  - Output formats (Text, JSON, Stream JSON)
  - Tool allowlisting/denylisting
  - Debug and verbose modes
  - Session management
- **Professional Interface**:
  - Dark mode by default
  - Dense, prosumer-focused UI
  - Minimal padding for maximum efficiency
  - Real-time log viewer
  - Run history tracking
- **Session Management**:
  - Connect to existing Claude sessions
  - Track session IDs per run
  - Resume previous conversations

## Installation

```bash
# Clone the repository
git clone https://github.com/runclauderun/runclauderun
cd runclauderun

# Install dependencies
bun install

# Start development mode
bun dev

# Build for macOS
bun dist:mac
```

## File Structure

All runCLAUDErun data is stored in `~/.runclauderun/`:
- `tasks.json` - Task configurations and metadata
- `logs/` - Execution logs for all runs

## Usage

1. **First Launch**: runCLAUDErun will check if Claude CLI is installed
2. **Create Task**: Click "New Claude Task" to create your first scheduled command
3. **Configure**: Set your prompt, schedule, and advanced options
4. **Enable**: Toggle the task to enable automatic execution
5. **Monitor**: View real-time logs and run history

## Task Configuration

### Basic Options
- **Task Name**: Descriptive label for your task
- **Prompt**: The Claude prompt to execute
- **Working Directory**: Optional directory for command execution
- **Schedule Type**: How/when to run the task

### Advanced Options
- **Model Selection**: Choose between Sonnet, Opus, or Haiku
- **Permission Mode**: Control Claude's execution permissions
- **Output Format**: Text, JSON, or streaming JSON
- **Tool Controls**: Allow or disallow specific Claude tools
- **Additional Directories**: Grant access to specific paths
- **Debug/Verbose**: Enable detailed logging

## Development

```bash
# Start development server
bun dev

# Build application
bun build

# Package for distribution
bun dist:mac
```

## Requirements

- macOS 10.13 or later
- Node.js 18+
- Bun runtime
- Claude CLI (installed automatically if missing)

## License

MIT

## Author

Built for professionals who demand precise control over their Claude automations.