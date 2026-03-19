# RIKEO.TECH — Community Forum

A clean, dark-themed forum website built as a companion platform for RIKEO's video content. Built with vanilla HTML, CSS, and JavaScript — no build step required.

## Design

- **Color scheme**: Near-black background (`#0d0d0d`) with white text and gold (`#c9a84c`) accents
- **Typography**: Syne (display), Inter (body), Space Mono (code/labels)
- **Aesthetic**: Sharp edges, editorial grid, strong typographic hierarchy — deliberately handcrafted

## Features

- **Homepage** — category grid + recent threads with filter tabs
- **Forum categories** — 6 categories with sortable post lists
- **Thread view** — full post + nested comments, voting, video embeds
- **Post creation** — rich editor with markdown preview, image uploads, tags, YouTube embeds
- **User profiles** — post history, reply history, bio editing
- **Search** — full-text search with category filter and highlighted results
- **Auth** — sign in / register modal with localStorage persistence

## File Structure

```
rikeo.tech/
├── index.html          # Homepage
├── forum.html          # Category view
├── post.html           # Thread view
├── create.html         # Create post
├── profile.html        # User profile
├── search.html         # Search
├── css/
│   └── style.css       # All styles
└── js/
    ├── data.js         # Data layer (localStorage)
    └── app.js          # Shared utilities, auth, components
```

## Running Locally

No build step needed. Serve the files with any static file server:

```bash
# Python (built-in)
python3 -m http.server 8000

# Node.js (npx)
npx serve .

# VS Code: use the Live Server extension
```

Then open `http://localhost:8000` in your browser.

Register a new account from the Sign In modal.

## Backend Integration

The data layer is fully contained in `js/data.js`. Every method maps cleanly to a REST API endpoint:

| Method | REST equivalent |
|--------|----------------|
| `DB.getPosts(opts)` | `GET /api/posts?category=&search=` |
| `DB.createPost(data)` | `POST /api/posts` |
| `DB.getComments(postId)` | `GET /api/posts/:id/comments` |
| `DB.createComment(data)` | `POST /api/posts/:id/comments` |
| `DB.login(username, pass)` | `POST /api/auth/login` |
| `DB.createUser(data)` | `POST /api/auth/register` |

Replace the `localStorage` calls in `data.js` with `fetch()` calls to wire up a real backend.

> **Security note**: The current auth uses plaintext password comparison in localStorage — suitable for demo only. Production deployments must use proper password hashing (bcrypt) and server-side session management.
