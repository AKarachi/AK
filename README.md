# SALES.DB 🧾

A lightweight, offline-first sales management app built with React. No backend, no database server — all data is stored locally in the browser via `localStorage`.

---

## Features

- **Dashboard** — Overview of all orders, total sales, and daily activity
- **Orders** — Create and manage customer orders with multiple product lines
- **Stores** — Manage multiple stores with individual stock tracking
- **Clients** — Client profiles with full order history and payment tracking
- **Products** — Product catalog with category support
- **Payments** — Log payments per client (Cash, Transfer, Cheque, Mobile Money) and track outstanding balances automatically
- **GMD currency** — All amounts displayed in Gambian Dalasi (GMD)

---

## Project Structure

```
sales-db/
├── index.html    # Main HTML entry point
├── style.css     # Global styles and animations
└── app.js        # React application (all components and logic)
```

---

## Getting Started

### Run locally

Since the app uses React via CDN, you can't open `index.html` directly by double-clicking (browsers block local file requests). Use a simple local server instead.

**Option 1 — VS Code Live Server**
Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), right-click `index.html` → *Open with Live Server*.

**Option 2 — Python**
```bash
cd sales-db
python -m http.server 8000
# Open http://localhost:8000
```

**Option 3 — Node.js**
```bash
cd sales-db
npx serve .
# Open the URL shown in the terminal
```

---

## Deployment

### GitHub Pages

1. Create a new repository on [github.com](https://github.com)
2. Upload the 3 files (`index.html`, `style.css`, `app.js`)
3. Go to **Settings → Pages → Source: Deploy from branch → main → / (root)**
4. Your site will be live at `https://your-username.github.io/sales-db`

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
cd sales-db
firebase init hosting
# Public directory: .
# Single-page app: No
firebase deploy
```

Your site will be live at `https://your-project.web.app`

---

## Data & Storage

All data is saved in the browser's `localStorage` under the key `sv5`. Data persists between sessions but is **local to each device and browser**.

> ⚠️ Clearing browser data or cache will erase all records. Export your data regularly if needed.

---

## Tech Stack

| Technology | Usage |
|---|---|
| React 18 (CDN) | UI components and state management |
| Vanilla JS | Business logic, data helpers |
| localStorage | Client-side data persistence |
| Google Fonts | Inter + Syne typefaces |
| CSS (no framework) | Custom dark theme, animations |

---

## Currency

All monetary values are in **GMD (Gambian Dalasi)**. The app does not perform any currency conversion.

---

## License

MIT — free to use, modify, and distribute.
