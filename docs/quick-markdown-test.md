# Quick Markdown Test Examples

Copy and paste these examples into the AtelierCode chat to test the markdown rendering:

---

## Test 1: Basic Formatting
```
I need help with **authentication**. Here's my *current* implementation using `JWT tokens`.
```

---

## Test 2: Code Block with JavaScript
```
Here's a simple React component:

```javascript
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

What do you think?
```

---

## Test 3: Lists and Code
```
I'm getting errors in my build. Here are the steps I've taken:

1. Ran `npm install`
2. Checked the package.json
3. Tried `npm run build`

**Error message:**
```bash
ERROR in ./src/index.tsx
Module not found: Can't resolve 'react-router-dom'
```

Any ideas?
```

---

## Test 4: Table
```
Here's a comparison of the frameworks:

| Framework | Performance | Learning Curve | Popularity |
|-----------|-------------|----------------|------------|
| React     | High        | Medium         | Very High  |
| Vue       | High        | Low            | High       |
| Angular   | Medium      | High           | Medium     |
| Svelte    | Very High   | Low            | Growing    |

Which one should I choose?
```

---

## Test 5: Multiple Code Blocks
```
I want to refactor this Python code:

**Before:**
```python
def process(data):
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result
```

**After (proposed):**
```python
def process(data):
    return [item * 2 for item in data if item > 0]
```

Is this better?
```

---

## Test 6: Blockquote and Links
```
I read this interesting article about TypeScript:

> TypeScript is a strongly typed programming language that builds on JavaScript,
> giving you better tooling at any scale.

Source: [TypeScript Official Docs](https://www.typescriptlang.org/)

What are your thoughts on using TypeScript for our project?
```

---

## Test 7: Mixed Content
```
# Project Setup Instructions

## Prerequisites
- Node.js 18+ installed
- npm or yarn
- Git

## Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/project.git
cd project
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=your-api-key-here
PORT=3000
```

4. Run the development server:
```bash
npm run dev
```

> **Note:** Make sure PostgreSQL is running before starting the server!

## Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change PORT in .env |
| Database connection failed | Check DATABASE_URL |
| Module not found | Run `npm install` again |

**Need help?** Check the [documentation](https://docs.example.com) or open an issue!
```

---

## Test 8: Inline Code Heavy
```
To fix the bug, update the `useState` hook to `useReducer`, change `props.onClick` to `props.handleClick`, and make sure `async/await` is used in the `fetchData` function.
```

---

## Test 9: SQL Query
```
Here's the optimized query:

```sql
SELECT
  u.id,
  u.username,
  u.email,
  COUNT(DISTINCT o.id) as order_count,
  SUM(o.total_amount) as total_spent,
  MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
  AND u.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
GROUP BY u.id, u.username, u.email
HAVING order_count > 0
ORDER BY total_spent DESC
LIMIT 100;
```

This should improve performance significantly!
```

---

## Test 10: Rust Code
```
Can you review this Rust function?

```rust
use std::collections::HashMap;

fn word_frequency(text: &str) -> HashMap<String, usize> {
    let mut frequency = HashMap::new();

    for word in text.split_whitespace() {
        let word = word.to_lowercase();
        *frequency.entry(word).or_insert(0) += 1;
    }

    frequency
}

fn main() {
    let text = "hello world hello rust world";
    let freq = word_frequency(text);

    for (word, count) in &freq {
        println!("{}: {}", word, count);
    }
}
```

Any suggestions for improvement?
```

---

## How to Use These Tests

1. Start AtelierCode
2. Open the Chat tab
3. Start a new agent session
4. Copy any of the test examples above
5. Paste into the chat input
6. Send the message
7. Observe the beautiful markdown rendering!

Each test demonstrates different features:
- Test 1: Basic text formatting
- Test 2: Simple code block
- Test 3: Lists with inline code
- Test 4: Tables
- Test 5: Multiple code blocks in one message
- Test 6: Blockquotes and links
- Test 7: Complex multi-element document
- Test 8: Heavy inline code usage
- Test 9: SQL syntax highlighting
- Test 10: Rust syntax highlighting
