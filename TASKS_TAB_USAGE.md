# Tasks Tab - Usage Guide

## Quick Start

### Step 1: Access the Tasks Tab

1. Open AtelierCode application
2. Select or create a project
3. Click on the **"Tasks"** tab in the workspace navigation

### Step 2: Create Your First Task

1. Click the **"New Task"** button (top right)
2. Fill in the task details:
   - **Title**: Required - Enter a descriptive title
   - **Description**: Optional - Add more details
   - **Priority**: Choose High, Medium, or Low
3. Click **"Create Task"**

### Step 3: Manage Tasks

- **Mark Complete**: Click the checkbox ☑
- **Change Status**: Hover over the status badge and select from dropdown
- **View Details**: Click the expand button (▼) to see full description
- **Filter/Search**: Use the filter bar to find specific tasks

---

## Common Workflows

### Workflow 1: Daily Task Management

**Morning Setup**
```
1. Open Tasks tab
2. Filter by "In Progress" to see ongoing work
3. Review and prioritize tasks
4. Expand high-priority tasks to review details
```

**During Work**
```
1. Mark tasks as "In Progress" when you start
2. Check completed tasks when done
3. Add new tasks as they come up
```

**End of Day**
```
1. Filter by "Completed" to review progress
2. Move unfinished tasks to next day priorities
3. Update task descriptions with notes
```

### Workflow 2: Sprint Planning

**Sprint Start**
```
1. Create all sprint tasks
2. Set priorities (High for critical, Medium for nice-to-have)
3. Estimate hours for each task
4. Group by priority to see workload
```

**During Sprint**
```
1. Filter by "Todo" to see pending work
2. Move tasks to "In Progress" as you work
3. Complete tasks as finished
4. Track progress via stats dashboard
```

**Sprint Review**
```
1. Filter by "Completed" to see accomplishments
2. Review uncompleted tasks
3. Export data for reports
```

### Workflow 3: Bug Tracking

**Bug Reported**
```
1. Create new task with bug title
2. Add description with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
3. Set priority based on severity
4. Set status to "Todo"
```

**Bug Fixing**
```
1. Filter by "High Priority" bugs
2. Move bug to "In Progress"
3. Update description with fix notes
4. Mark complete when tested
```

---

## Tips & Best Practices

### Task Creation

**Good Task Titles**
✅ "Implement user authentication with JWT"
✅ "Fix login button not responding on mobile"
✅ "Add dark mode toggle to settings"

**Poor Task Titles**
❌ "Do stuff"
❌ "Fix bug"
❌ "Update"

**Good Descriptions**
✅ Include acceptance criteria
✅ Link to relevant files
✅ Add technical notes
✅ Mention dependencies

**Example:**
```
Title: Implement user authentication with JWT

Description:
- Set up JWT token generation
- Create login/logout endpoints
- Add middleware for protected routes
- Update user model with auth fields
- Test with Postman

Affected Files:
- src/api/auth.ts
- src/middleware/auth.ts
- src/models/User.ts
```

### Priority Guidelines

**High Priority** 🔴
- Blocking issues
- Critical bugs
- Deadline-driven tasks
- Core features

**Medium Priority** 🟡
- Important but not urgent
- Feature enhancements
- Non-critical bugs
- Refactoring

**Low Priority** 🔵
- Nice-to-have features
- Documentation
- Code cleanup
- Future improvements

### Status Management

**Use "Todo"** when:
- Task is planned but not started
- Waiting for dependencies
- In backlog

**Use "In Progress"** when:
- Actively working on task
- Code is being written
- Testing in progress

**Use "Completed"** when:
- Task fully finished
- Tested and verified
- Merged/deployed

### Filtering Strategies

**Focus Mode**
```
Filter: Status = "In Progress"
Result: See only what you're working on
```

**Planning Mode**
```
Filter: Status = "Todo", Priority = "High"
Result: See urgent upcoming work
```

**Review Mode**
```
Filter: Status = "Completed"
Result: See what's been accomplished
```

**Bug Hunt**
```
Search: "bug" or "fix"
Filter: Priority = "High"
Result: Critical bugs to address
```

---

## Advanced Features

### Search Techniques

**By Keyword**
```
Search: "authentication"
→ Finds all tasks mentioning auth
```

**By File**
```
Search: "src/api/auth.ts"
→ Finds tasks affecting that file
```

**By Type**
```
Search: "fix" or "bug"
→ Finds all bug-related tasks
```

**By Feature**
```
Search: "dark mode"
→ Finds all dark mode tasks
```

### Multi-Filter Combinations

**Critical Bugs**
```
Status: Todo
Priority: High
Search: "bug"
```

**Ready to Work**
```
Status: Todo
Priority: High/Medium
No dependencies
```

**Sprint Progress**
```
Status: All
Priority: High
Date: This week
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus search (if implemented) |
| `Tab` | Navigate fields |
| `Enter` | Submit form |
| `Escape` | Close modal |
| `Space` | Toggle checkbox |

---

## Troubleshooting

### Tasks Not Loading

**Problem**: Tasks tab shows loading spinner forever

**Solutions**:
1. Check internet connection (if remote DB)
2. Verify project is selected
3. Refresh the application
4. Check browser console for errors
5. Verify database permissions

### Task Not Updating

**Problem**: Status change doesn't stick

**Solutions**:
1. Check if optimistic update failed
2. Look for error message
3. Verify backend is running
4. Check database connection
5. Try again (may be temporary network issue)

### Search Not Working

**Problem**: Search doesn't find tasks

**Solutions**:
1. Check spelling
2. Try searching in title vs description
3. Clear filters first
4. Case-sensitive? Try different casing
5. Verify tasks exist in database

### Modal Won't Close

**Problem**: Create task modal stuck open

**Solutions**:
1. Press Escape key
2. Click outside modal area
3. Check for form errors
4. Refresh page if needed

---

## Integration with Other Features

### With Chat Tab

**Ask AI for help:**
```
User: "Create tasks for implementing authentication"
AI: [Generates task list]
→ Copy to Tasks tab
```

**Reference tasks in chat:**
```
User: "Help me with task #123"
AI: [Provides guidance]
```

### With Files Tab

**Link tasks to files:**
```
Task Description:
"Fix login bug
Affected: src/auth/login.ts, src/components/Login.tsx"

→ Navigate to Files tab to view
```

### With Changes Tab

**Review changes per task:**
```
1. Complete task in Tasks tab
2. Go to Changes tab
3. Review all changes made
4. Approve/reject before commit
```

---

## Sample Task Structures

### Feature Task
```
Title: Add Export to CSV Feature
Description:
- Add export button to tasks list
- Generate CSV from current filtered tasks
- Include all task fields
- Download via browser
Priority: Medium
Status: Todo
```

### Bug Task
```
Title: Fix Task Checkbox Not Updating
Description:
BUG: Checkbox doesn't update status
Steps to reproduce:
1. Click task checkbox
2. Status doesn't change
3. Refresh shows old status

Expected: Checkbox updates status
Actual: No change occurs

Priority: High
Status: In Progress
```

### Research Task
```
Title: Research State Management Solutions
Description:
Evaluate options for state management:
- Redux vs Zustand vs Jotai
- Compare bundle size
- Assess learning curve
- Check TypeScript support
- Make recommendation

Priority: Low
Status: Todo
```

### Documentation Task
```
Title: Document API Endpoints
Description:
Create API documentation:
- List all endpoints
- Show request/response examples
- Document authentication
- Add error codes
- Update README

Priority: Low
Status: Todo
```

---

## Performance Tips

### For Large Task Lists

1. **Use Filters**
   - Don't load all 500+ tasks at once
   - Filter by status to reduce visible tasks
   - Use search to narrow down

2. **Archive Completed**
   - Move old completed tasks to archive
   - Keep active list under 50-100 tasks
   - Use date filters if available

3. **Batch Operations**
   - Update multiple tasks at once (if feature added)
   - Use bulk status changes
   - Import/export for large changes

### For Better Organization

1. **Clear Naming Convention**
   - Use prefixes: [BUG], [FEATURE], [DOCS]
   - Include ticket numbers if using external tracker
   - Keep titles under 60 characters

2. **Regular Cleanup**
   - Archive completed tasks weekly
   - Delete duplicate tasks
   - Update stale task descriptions

3. **Priority Discipline**
   - Not everything is high priority
   - Balance across priorities
   - Re-evaluate priorities weekly

---

## Export/Import (Future)

### Export Tasks
```
1. Filter tasks to export
2. Click "Export" button
3. Choose format (CSV/JSON)
4. Save file
```

### Import Tasks
```
1. Prepare CSV/JSON file
2. Click "Import" button
3. Map columns
4. Review preview
5. Confirm import
```

---

## FAQ

**Q: Can I reorder tasks?**
A: Not yet - tasks are ordered by creation date. Drag-and-drop coming soon.

**Q: Can I assign tasks to team members?**
A: Not yet - this is a planned feature.

**Q: Can I add subtasks?**
A: Not yet - currently flat task structure only.

**Q: How do I delete a task?**
A: Task deletion UI not implemented yet, use database directly if needed.

**Q: Can I set due dates?**
A: Not yet - only created/started/completed timestamps available.

**Q: Can I add attachments?**
A: Not yet - use description to link to files.

**Q: Is there a mobile app?**
A: No - this is a desktop Tauri application.

**Q: Can I share tasks with others?**
A: Not yet - currently single-user per project.

---

## Getting Help

### Support Channels

1. **Documentation**
   - Read TASKS_TAB_SUMMARY.md
   - Check TASKS_TAB_FEATURES.md
   - Review this usage guide

2. **Code Examples**
   - See test-tasks.js for sample data
   - Check src/components/workspace/TasksTab.tsx
   - Review API docs in src/api/tasks.ts

3. **Community**
   - File issues on GitHub
   - Check existing issues
   - Contribute improvements

---

**Last Updated**: 2025-11-21
**Version**: 1.0.0
**Status**: Production Ready
