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

## Build for production

```bash
npm run build
npm run preview
```
