# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Converted static HTML/CSS/JS multi-page site to a React 18 + Vite 5 SPA
- React Router v6 client-side navigation across 7 pages (Home, About, Careers, Notices, Results, Call Letter, Contact)
- `LangContext` — EN / HI / GU language toggle with localStorage persistence
- Interactive filter chips on Careers and Notices pages (React `useState`)
- Shared `Header`, `Footer`, and `SiteMarquee` components replacing DOM-injection pattern in `site.js`
- Job listings and i18n strings extracted into typed data modules (`src/data/`)
- Static SVG assets moved to `public/assets/` for Vite static serving
- `CHANGELOG.md` — this file
