# 🚀 ScanDrive

A beautiful, fast, and cross-platform drive scanner application built with Rust and React. Analyze your disk space usage with a modern UI powered by IBM Carbon Design System.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange.svg)
![React](https://img.shields.io/badge/react-18.3-61dafb.svg)

## ✨ Features

- 🖥️ **Cross-Platform**: Native applications for macOS (.app) and Windows (.exe)
- 📊 **Drive Analysis**: Scan and analyze storage usage across all your drives
- 🎨 **Modern UI**: Beautiful interface using IBM Carbon Design System
- ⚡ **Fast Performance**: Built with Rust for blazing-fast file system operations
- 🔍 **File Browser**: Navigate and explore your file system with ease
- 📈 **Real-time Progress**: Live updates during drive scanning
- 🌓 **Dark Mode**: Automatic theme support
- ♿ **Accessible**: WCAG compliant UI components

## 🖼️ Screenshots

<!-- Add screenshots here once you have them -->

## 🛠️ Tech Stack

### Backend
- **[Rust](https://www.rust-lang.org/)** - High-performance system programming
- **[Tauri](https://tauri.app/)** - Build native desktop apps
- **[sysinfo](https://github.com/GuillaumeGomez/sysinfo)** - System information library
- **[walkdir](https://github.com/BurntSushi/walkdir)** - Recursive directory traversal
- **[rayon](https://github.com/rayon-rs/rayon)** - Parallel processing

### Frontend
- **[React](https://react.dev/)** - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Vite](https://vitejs.dev/)** - Fast build tool
- **[Carbon Design System](https://carbondesignsystem.com/)** - IBM's open-source design system
- **[Sass](https://sass-lang.com/)** - CSS preprocessor

## 📋 Prerequisites

- **Node.js** 16+ and npm
- **Rust** 1.70+
- **macOS** 10.15+ or **Windows** 10+

## 🚀 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Corrub/ScanDrive.git
   cd ScanDrive
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

   This will open the ScanDrive application window with hot-reloading enabled.

### Building for Production

#### macOS
```bash
npm run tauri build
```
Your `.app` bundle and `.dmg` installer will be in:
```
src-tauri/target/release/bundle/macos/
```

#### Windows
```bash
npm run tauri build
```
Your `.exe` installer and portable executable will be in:
```
src-tauri/target/release/bundle/
```

## 📁 Project Structure

```
ScanDrive/
├── src/                      # React frontend
│   ├── components/          # UI components
│   │   ├── DriveCard.tsx
│   │   ├── ScanProgress.tsx
│   │   ├── StorageBreakdown.tsx
│   │   └── FileSystemTree.tsx
│   ├── types/               # TypeScript definitions
│   ├── App.tsx              # Main application
│   └── App.css              # Styles
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   └── lib.rs          # Core logic
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── public/                  # Static assets
└── package.json            # Node dependencies
```

## 🎯 Usage

1. **Launch ScanDrive** - The app will automatically detect all available drives
2. **Select a Drive** - Click the "Scan" button on any drive card
3. **View Progress** - Watch real-time scanning progress
4. **Analyze Results** - Explore files, search, and sort by size/type
5. **Browse Files** - Navigate through directories with the file browser

## 🔐 Permissions

### macOS
- No special permissions required for user directories
- System directories (e.g., `/System`, `/private`) are automatically skipped
- For full system scan, grant "Full Disk Access" in System Preferences → Security & Privacy

### Windows
- Standard user permissions sufficient for most operations
- Run as Administrator to scan protected system directories

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [IBM Carbon Design System](https://carbondesignsystem.com/) for the amazing UI components
- [Tauri](https://tauri.app/) for making cross-platform desktop apps easy
- All the open-source contributors whose libraries made this possible

## 📬 Contact

Project Link: [https://github.com/Corrub/ScanDrive](https://github.com/Corrub/ScanDrive)

---

Made with ❤️ and Rust 🦀
