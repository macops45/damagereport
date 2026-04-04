# Damage Report Generator

A web app to generate insurance damage report HTML files from a structured form.

## What it does

- Shows a complete damage report form in the app (`index.html` -> React app).
- Captures user-provided data for:
  - Customer details
  - Device specifications
  - Device issue / damage
  - Diagnosis of issues
  - Repair and replacement recommendations
- Builds a full 2-page HTML report based on the `template.html` visual model.
- Renders a live preview while the user types.
- Lets the user open the generated report in a new tab.
- Lets the user download the generated report as `.html`.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Firebase (company profile sync)

The app can sync company profiles to Firestore.

1. Copy `.env.example` to `.env`.
2. Fill in your Firebase web app values.
3. Enable **Authentication -> Sign-in method -> Email/Password** in Firebase console.
4. Create at least one user in **Authentication -> Users**.
5. Ensure Firestore is enabled in your Firebase project.

If Firebase env vars are missing, the app automatically falls back to local storage mode.

## Deploy on Vercel

1. Push this repository to GitHub.
2. In Vercel, create a new project from the repository.
3. In project settings, add the same Firebase env vars from `.env.example`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Deploy.

After first deploy, add your Vercel domain (for example `your-app.vercel.app`) to Firebase:

- `Authentication -> Settings -> Authorized domains`

## Build for production

```bash
npm run build
npm run preview
```
