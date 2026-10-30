# ajty.cz

Website of AjTy, s.r.o. — https://ajty.cz

Plain static site in `public/`, no build step. Every push to `main` runs the tests and deploys `public/` to GitHub Pages.

- Preview: `python3 -m http.server -d public 8000` → http://localhost:8000
- Tests (Node 20+, no dependencies): `node --test tests/`
