# NI Group Website — Fixed & Upgraded

## How to Run in VS Code
1. Extract this ZIP file and open the folder in **VS Code**.
2. **Option A (Recommended — Live Server Extension):**
   - Right-click `index.html` and click **"Open with Live Server"** (ES modules require an HTTP server rather than `file://`).
3. **Option B (Terminal):**
   - Open VS Code Terminal (`Ctrl + ~`) and run:
     ```bash
     npx vite --open
     ```
   - Or with Python:
     ```bash
     python -m http.server 5500
     ```
     Then open `http://localhost:5500`.

## Note on Images & Brochures
Keep your existing `Project Photo/` folder (containing `NI LOGO/`, `Director/`, `INVICTA - Kalikapur/`, `IRA/`, `IRIS/`, `IQRA Enclave/`) and individual project HTML pages (`invicta.html`, `iris.html`, etc.) in the root folder alongside these files.
