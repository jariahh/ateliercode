# Markdown Examples for AtelierCode Chat

This document contains examples of markdown content that will render properly in the Chat tab.

## Basic Formatting

You can use **bold text**, *italic text*, and ***bold italic text***.

You can also use `inline code` for short code snippets or variable names like `myVariable` or `function()`.

## Lists

### Unordered Lists
- First item
- Second item
- Third item
  - Nested item
  - Another nested item

### Ordered Lists
1. First step
2. Second step
3. Third step

## Code Blocks

### JavaScript Example
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return `Welcome to AtelierCode`;
}

const message = greet('Developer');
console.log(message);
```

### Python Example
```python
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Calculate first 10 Fibonacci numbers
for i in range(10):
    print(f"F({i}) = {calculate_fibonacci(i)}")
```

### TypeScript Example
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(userId: number): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}
```

### Rust Example
```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    let sum: i32 = numbers.iter().sum();
    println!("Sum: {}", sum);

    let doubled: Vec<i32> = numbers.iter()
        .map(|x| x * 2)
        .collect();
    println!("Doubled: {:?}", doubled);
}
```

### SQL Example
```sql
SELECT
  users.id,
  users.name,
  COUNT(orders.id) as order_count,
  SUM(orders.total) as total_spent
FROM users
LEFT JOIN orders ON users.id = orders.user_id
WHERE users.created_at >= '2024-01-01'
GROUP BY users.id, users.name
HAVING COUNT(orders.id) > 5
ORDER BY total_spent DESC;
```

## Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> And even include multiple paragraphs.

## Links

You can include [links to external resources](https://github.com) in your messages.

## Tables

| Feature | Supported | Notes |
|---------|-----------|-------|
| Markdown | Yes | Full GitHub-flavored markdown |
| Code Blocks | Yes | Syntax highlighting included |
| Tables | Yes | Using DaisyUI table styles |
| Images | No | Not yet implemented |
| Inline Code | Yes | Styled with monospace font |

## Horizontal Rules

You can add horizontal rules to separate sections:

---

## Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4

## Mixed Content Example

Here's a complete example combining multiple elements:

I need to **refactor** this code to improve *performance*. Here's the current implementation:

```javascript
// Current implementation - needs optimization
function processData(items) {
  let result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (items[i].id === items[j].relatedId) {
        result.push({ ...items[i], related: items[j] });
      }
    }
  }
  return result;
}
```

**Issues:**
1. O(n²) time complexity
2. Inefficient nested loops
3. No error handling

**Proposed solution:**

```javascript
// Optimized implementation
function processData(items) {
  // Create a lookup map for O(1) access
  const itemMap = new Map(items.map(item => [item.id, item]));

  // Single pass through items
  return items
    .map(item => {
      const related = itemMap.get(item.relatedId);
      return related ? { ...item, related } : item;
    })
    .filter(item => item.related); // Only include matched items
}
```

This reduces the time complexity to **O(n)** and improves readability!

> **Note:** Remember to test with large datasets to verify the performance improvement.

## Testing Your Markdown

To test these examples:

1. Start a new agent session in AtelierCode
2. Copy any of the above examples
3. Paste them into the chat
4. See how they render with proper formatting!

The chat now supports:
- ✅ Full markdown syntax
- ✅ Syntax-highlighted code blocks
- ✅ Inline code formatting
- ✅ Tables with DaisyUI styling
- ✅ Lists (ordered and unordered)
- ✅ Blockquotes
- ✅ Links (opening in new tabs)
- ✅ Headings
- ✅ Bold, italic, and other text formatting
