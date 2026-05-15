# Pages Launch Kit

A small static frontend starter that can be deployed on GitHub Pages for free.

## Run Locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Deploy To GitHub Pages

1. Create a new GitHub repository.
2. From this folder, run:

```bash
git init
git add .
git commit -m "Initial GitHub Pages site"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

3. In GitHub, open the repository settings.
4. Go to **Pages**.
5. Set **Source** to **GitHub Actions**.
6. Push to `main`; the workflow in `.github/workflows/deploy.yml` will publish the site.

The published URL will usually be:

```text
https://YOUR-USER.github.io/YOUR-REPO/
```

## Project Structure

```text
.
├── .github/workflows/deploy.yml
├── assets/deploy-preview.png
├── index.html
├── script.js
├── styles.css
└── README.md
```

## Customize

Edit the copy in `index.html`, colors and layout in `styles.css`, and the checklist behavior in `script.js`.
