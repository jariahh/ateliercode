// Simple Node.js script to test task creation
// This simulates what the Tauri frontend would do

const testTasks = [
  {
    title: "Set up project structure",
    description: "Initialize the project with Tauri v2, React 18, TypeScript, and Tailwind CSS with DaisyUI",
    priority: "high"
  },
  {
    title: "Implement authentication system",
    description: "Create user login and registration with JWT tokens",
    priority: "high"
  },
  {
    title: "Design database schema",
    description: "Create SQLite database schema for projects, tasks, and chat messages",
    priority: "medium"
  },
  {
    title: "Build chat interface",
    description: "Implement real-time chat with AI agent integration",
    priority: "medium"
  },
  {
    title: "Add file watcher",
    description: "Monitor project files for changes and display in UI",
    priority: "medium"
  },
  {
    title: "Create task management UI",
    description: "Build the Tasks tab with filtering, sorting, and CRUD operations",
    priority: "high"
  },
  {
    title: "Write documentation",
    description: "Document all features and API endpoints",
    priority: "low"
  },
  {
    title: "Add unit tests",
    description: "Write comprehensive unit tests for all components",
    priority: "low"
  },
  {
    title: "Implement dark mode toggle",
    description: "Add theme switcher for light/dark modes",
    priority: "low"
  }
];

console.log("Test tasks data structure:");
console.log(JSON.stringify(testTasks, null, 2));
console.log("\nThese tasks can be created via the Tauri 'create_task' command");
console.log("Each task will be assigned to a project_id");
