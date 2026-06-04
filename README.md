# 🌐 LaCzek Stream

LaCzek Stream is a modern multi-source entertainment streaming platform built with TypeScript, Vite, and Supabase.

It is designed as a unified media hub that aggregates different types of content into a single fast and responsive web interface, allowing users to access movies, TV series, anime, live sports, radio, podcasts, YouTube content, and publicly available live streams.

The project focuses on performance, simplicity, and cross-device usability, providing a smooth streaming experience on mobile, desktop, and tablet devices.

---

## 🚀 Project Overview

LaCzek Stream is not a traditional streaming service—it is a **media aggregation and streaming interface**.

Instead of hosting content directly, the platform organizes and presents multiple external media sources in one structured UI.

The goal is to reduce fragmentation across entertainment platforms by offering a centralized viewing experience.

Key focus areas:
- Fast navigation between content categories
- Lightweight and responsive UI
- Modular architecture
- API-driven content rendering
- Cross-platform compatibility

---

## 🎯 Core Features

### 🎬 Movies Streaming
Browse and access movie content through integrated external sources and APIs.

### 📺 TV Shows & Series
Structured TV series browsing with seasons and episodes support.

### 🎌 Anime Section
Dedicated anime category with organized listings and categorization.

### ⚽ Live Sports Streaming
Access sports-related live streams and embedded sources where available.

### 📡 Live TV Channels
View publicly available live TV streams from supported providers.

### 📻 Radio Streaming
Listen to online radio stations across different regions and genres.

### 🎙️ Podcasts
Stream podcast content directly inside the platform interface.

### 📺 YouTube Integration
Embedded YouTube playback support for videos and channels.

### 📷 Public Live Cameras (YouTube Streams)
Displays publicly available live camera feeds and CCTV-style streams from YouTube and similar platforms.

### 📱 Responsive UI
Fully optimized layout for:
- Mobile devices
- Tablets
- Desktop screens

### ⚡ Performance Optimized
- Fast initial load times
- Lazy-loaded media sections
- Optimized routing and rendering

### 🌐 Web-Based Platform
Runs entirely in the browser with no installation required.

---

## 🧱 Tech Stack

- **TypeScript** — Core language for type-safe development
- **Vite** — Fast frontend build tooling and development server
- **Supabase** — Backend services (auth, database, realtime features if used)
- **Capacitor** — Mobile app wrapper support
- **JavaScript** — Runtime logic
- **CSS** — UI styling system

---

## 🗂️ Architecture Overview

The project follows a modular frontend structure:

- Each media category is separated into independent UI modules
- Data is fetched dynamically from external APIs or Supabase-backed services
- Routing system handles navigation between content sections
- Components are reusable and optimized for performance
- Designed with a mobile-first approach

---

## 📁 Project Structure

```text
src/
 ├── components/     Reusable UI components
 ├── pages/          Main views (Movies, TV, Sports, etc.)
 ├── services/       API / Supabase data layer
 ├── hooks/          Custom React hooks (if applicable)
 ├── utils/          Helper functions
 ├── assets/         Static assets (icons, images)
 └── main.ts         Application entry point
```

---

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/iamcz3k/laczekstream-16397c62.git
```

### 2. Navigate into project
```bash
cd laczekstream-16397c62
```

### 3. Install dependencies
```bash
npm install
```

### 4. Start development server
```bash
npm run dev
```

---

## 🏗️ Production Build

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## ☁️ Deployment

This project is compatible with modern frontend hosting platforms:

- Vercel
- Netlify
- Cloudflare Pages
- Firebase Hosting

Build command:
```bash
npm run build
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

⚠️ Never expose sensitive service keys in frontend code.

---

## 🧠 Design Philosophy

LaCzek Stream is built around the idea of **media convergence**—bringing different entertainment formats into a single interface.

Instead of building a traditional streaming service, the system acts as:
- A content aggregator
- A unified media dashboard
- A lightweight streaming interface

---

## ⚠️ Disclaimer

LaCzek Stream does not host or store copyrighted media files on its own servers.

The platform may integrate third-party sources and publicly available streams.

Users are responsible for how they access and use external content.

This project is intended for **educational and development purposes only**.

---

## 🤝 Contributing

Contributions are welcome.

To contribute:
1. Fork the repository
2. Create a new feature branch
3. Make your changes
4. Submit a pull request

---

## 📜 License

This project is licensed under the MIT License.

You are free to:
- Use
- Modify
- Distribute
- Build upon the project

With proper attribution.

---

## 👨‍💻 Author

Built and maintained by **La Czek❤️**

---

## 🌍 Vision

The goal of LaCzek Stream is to simplify digital entertainment access by unifying multiple media sources into a single fast, clean, and responsive interface.

---

## 🔮 Future Improvements

- Personalized recommendations system
- User accounts & watch history
- Advanced search and filtering
- Offline/PWA improvements
- Performance optimizations for low-end devices
- Multi-language support
- Better streaming source management

---
