# NI Group form integration

The website's homepage lead form, Paradizia consultation form, careers CV form, and blog newsletter form use one Google Apps Script web app. Submissions are appended to a single `Enquiries` tab.

## Create and deploy the Apps Script

1. Create a standalone project at [script.google.com](https://script.google.com/).
2. Replace its `Code.gs` with [`apps-script/Code.gs`](./apps-script/Code.gs). In Project Settings, enable **Show "appsscript.json" manifest file**, then copy [`apps-script/appsscript.json`](./apps-script/appsscript.json) into the project manifest.
3. Run `setup()` from the Apps Script editor and authorize the requested Google Sheets and Drive permissions. The function creates the `NI Group Website Enquiries` spreadsheet and a private `NI Group Website CV Applications` Drive folder, stores their IDs in Script Properties, and writes the column headers. Open the execution log to get the spreadsheet and folder links.
4. Deploy as a **Web app**, executing as your account, with access set to **Anyone** so the public website can submit. Google may label this access option differently depending on the account. Do not share the spreadsheet or CV folder publicly.
5. Copy the deployed URL ending in `/exec` into `GOOGLE_APPS_SCRIPT_URL` in [`forms-config.js`](./forms-config.js), preserving the quotes. Redeploy the website with `npm run build`.
6. In Apps Script Project Settings, confirm `ALLOWED_ORIGINS` contains the exact production origins `https://nigrouprealty.com` and `https://www.nigrouprealty.com`. `setup()` adds the localhost origins for Vite (`5173`) and Live Server (`5501`) development; remove them if they are no longer needed. If the script was already set up, run `setup()` again to append these defaults while preserving any custom origins.

After changing Apps Script code, deploy a new web app version. Keep the spreadsheet and CV folder private; the web app writes to them as the deploying account.

The `/dev` test URL is intended only for script editors and uses the latest saved code. Use the deployed `/exec` URL for visitors to the public website.

## Stored columns and form IDs

The sheet includes the requested columns: Submission Date & Time, Customer Name, Email, Phone Number, Company Name, Service Interested In, Message, Form Name, Page URL, and Enquiry Status. It also includes Form ID, CV File URL, and Request ID for routing, CV retrieval, and duplicate protection.

| Form | Form ID | Service |
| --- | --- | --- |
| Homepage lead popup | `homepage_lead` | Selected project |
| Paradizia consultation | `paradizia_consultation` | Paradizia and selected property type |
| Careers application | `career_application` | Careers at NI Group |
| Blog newsletter | `blog_newsletter` | Newsletter subscription |

Career CV files are restricted to PDF, DOC, or DOCX and 4 MB; they are saved in the private Drive folder and linked from the sheet.

## CORS and public endpoint notes

Apps Script `ContentService` does not expose a supported way to set arbitrary CORS response headers. To provide a readable success or validation error without `no-cors`, the website posts to a hidden iframe and receives a nonce-matched `postMessage` from the web app. The script allows iframe embedding for this response only and targets the configured site origin.

The endpoint must be publicly reachable for a static website. Server-side validation, form-ID allowlisting, a honeypot, rate limiting, request-ID deduplication, and CV type/size checks reduce abuse, but a public endpoint cannot authenticate website visitors or fully prevent spam. The origin allowlist restricts where response messages are sent; it is not authentication because a direct HTTP client can spoof form parameters. Review Apps Script executions and the Sheet periodically.

The website's legal page is a practical summary of the collection and storage introduced by this integration. Have NI Group review the privacy, disclaimer, and terms text before publishing it as an official legal policy.

## Local checks

Run `npm run build` to generate the website. Do not test the live endpoint with real customer data; use an explicitly marked test row and remove it afterward if you need to verify a deployed Sheet write.
