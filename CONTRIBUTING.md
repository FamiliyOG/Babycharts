# Contributing to BabyCharts 👶

Thank you for your interest in contributing to BabyCharts! Together, we can build the best open-source, privacy-first baby health and growth tracking companion for families worldwide.

---

## 📜 Code of Conduct

By participating in this project, you agree to treat everyone with respect, kindness, and constructive feedback regardless of background or experience level.

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Git**

### Step-by-Step Setup

1. **Fork & Clone**

   ```bash
   git clone https://github.com/<your-username>/Babycharts.git
   cd Babycharts
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment**

   ```bash
   cp .env.example .env
   ```

4. **Start Development Environment**
   ```bash
   # Terminal 1: Start Frontend Dev Server (Vite)
   npm run dev

   # Terminal 2: Start Backend API Server
   npm run dev:server
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Quality Standards & Testing

Before submitting a Pull Request, make sure your code adheres to our strict quality pipeline:

```bash
# 1. Format all code with Prettier
npm run format

# 2. Run all linters (Oxlint + ESLint 9)
npm run lint:all

# 3. Test production build
npm run build
```

> [!NOTE]
> All Pull Requests require passing linters with **0 warnings and 0 errors**.

---

## 🔀 Branching & Commit Guidelines

- **Branches**: Use descriptive branch names:
  - `feat/milestone-photo-zoom`
  - `fix/calendar-export-tz`
  - `docs/update-readme`
- **Commits**: Conventional Commits format is recommended:
  - `feat: add PDF batch download support`
  - `fix: improve light mode contrast on mobile navigation`
  - `docs: update docker compose instructions`

---

## 💡 Submitting a Pull Request

1. Push your changes to your fork.
2. Open a Pull Request against the `main` branch.
3. Describe the changes, motivations, and testing steps in detail.
4. Attach screenshots or GIFs for any UI / UX modifications (testing both Light and Dark modes).

Thank you for contributing to BabyCharts! ❤️
