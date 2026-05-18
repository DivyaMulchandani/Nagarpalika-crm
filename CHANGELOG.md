# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Three-tier project structure: `Web/` (public portal), `Admin/` (admin panel), `Server/` (REST API backend)
- `Admin/` — full admin panel frontend repurposed from hms-admin (React 18, Reactstrap, Formik, Recharts, role-based permission system)
- `Server/` — Express 4 + MongoDB backend repurposed from hms-server (session auth, secure file uploads, WhatsApp Cloud API, Nodemailer)
- `knowledge_base/` — SRS index, full PRD (incl. 15-section pentest-ready security spec), 9 phase plan docs, and tech-stack reference
- `.env` templates for all three folders with all required variable keys documented
- Converted static HTML/CSS/JS multi-page site to a React 18 + Vite 5 SPA
- React Router v6 client-side navigation across 7 pages (Home, About, Careers, Notices, Results, Call Letter, Contact)
- `LangContext` — EN / HI / GU language toggle with localStorage persistence
- Interactive filter chips on Careers and Notices pages (React `useState`)
- Shared `Header`, `Footer`, and `SiteMarquee` components replacing DOM-injection pattern in `site.js`
- Job listings and i18n strings extracted into typed data modules (`src/data/`)
- Static SVG assets moved to `public/assets/` for Vite static serving
- `CHANGELOG.md` — this file

### Changed
- Moved public portal source from repo root into `Web/` subfolder
- `Admin/src/config.jsx` reads API base URL from `VITE_API_URL` env var (was hardcoded to `hms.vyaris.com`)
- `Admin/package.json` build script outputs to `Server/out/admin` (was `hms-server/out/admin`)
- `.gitignore` extended to block `.env` files, `Admin/build/`, `Server/out/`, `Server/uploads/`, `Server/log/`
