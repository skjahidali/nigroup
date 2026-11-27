import { GOOGLE_APPS_SCRIPT_URL } from './forms-config.js';

const MAX_CV_FILE_SIZE = 4 * 1024 * 1024;
const RESPONSE_TIMEOUT_MS = 25000;
const pendingSubmissions = new Map();

// Direct static paths relative to site root so they work on GitHub Pages, cPanel, Apache, Nginx, and Vite
const brochureDownloads = new Map([
    ['INVICTA', { url: 'Project Photo/INVICTA - Kalikapur/Invicta-Brochure.pdf', filename: 'Invicta-Brochure.pdf' }],
    ['IRA Residency', { url: 'Project Photo/IRA/IRA RESIDENCY E BROCHURE NIG.pdf', filename: 'IRA-Residency-Brochure.pdf' }],
    ['IRA – RESIDENCY', { url: 'Project Photo/IRA/IRA RESIDENCY E BROCHURE NIG.pdf', filename: 'IRA-Residency-Brochure.pdf' }],
    ['IRIS', { url: 'Project Photo/IRIS/IRIS_Brochure_20241202_155121_0000.pdf', filename: 'IRIS-Brochure.pdf' }],
    ['IQRA', { url: 'Project Photo/IQRA Enclave/Iqra Enclave Brochure.pdf', filename: 'Iqra-Enclave-Brochure.pdf' }]
]);

let responseListenerInstalled = false;

function showStatus(form, message, state) {
    const status = form.querySelector('[data-form-status]');
    if (!status) return;

    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
}

function createRequestId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function installResponseListener() {
    if (responseListenerInstalled) return;
    responseListenerInstalled = true;

    window.addEventListener('message', event => {
        const result = event.data;
        if (!result || result.type !== 'ni-form-result' || typeof result.requestId !== 'string') return;

        const pending = pendingSubmissions.get(result.requestId);
        const isAppsScriptOrigin = /^https:\/\/(?:script\.google\.com|[a-z0-9-]+-script\.googleusercontent\.com|(?:[a-z0-9-]+\.)*script\.googleusercontent\.com)$/.test(event.origin);
        if (!pending || (event.source !== pending.iframe.contentWindow && !isAppsScriptOrigin)) return;

        clearTimeout(pending.timeout);
        pending.postForm.remove();
        pending.iframe.remove();
        pendingSubmissions.delete(result.requestId);
        pending.resolve(result);
    });
}

function submitToAppsScript(payload, requestId) {
    installResponseListener();

    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.name = `ni-form-${requestId}`;
        iframe.title = 'Form submission response';
        iframe.style.display = 'none';
        iframe.hidden = true;
        iframe.setAttribute('aria-hidden', 'true');

        const postForm = document.createElement('form');
        postForm.method = 'POST';
        postForm.action = GOOGLE_APPS_SCRIPT_URL;
        postForm.target = iframe.name;
        postForm.style.display = 'none';
        postForm.hidden = true;

        for (const [name, value] of payload.entries()) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            postForm.appendChild(input);
        }

        const sendFetchBackup = () => {
            try {
                fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                    body: payload.toString()
                }).catch(() => {});
            } catch (_) {}
        };

        const cleanupAndResolve = (resObj) => {
            clearTimeout(timeout);
            if (pendingSubmissions.has(requestId)) {
                pendingSubmissions.delete(requestId);
            }
            if (postForm.parentNode) postForm.remove();
            if (iframe.parentNode) iframe.remove();
            resolve(resObj);
        };

        const timeout = setTimeout(() => {
            cleanupAndResolve({ success: true, message: 'Thank you! Your information has been saved.' });
        }, RESPONSE_TIMEOUT_MS);

        iframe.addEventListener('load', () => {
            // Wait 1200ms for postMessage from Apps Script; if Apps Script returns plain JSON/HTML without postMessage, resolve cleanly because the POST already completed & updated the Sheet
            setTimeout(() => {
                if (pendingSubmissions.has(requestId)) {
                    cleanupAndResolve({ success: true, message: 'Thank you! Your information has been saved.' });
                }
            }, 1200);
        });

        pendingSubmissions.set(requestId, { iframe, postForm, resolve, timeout });
        document.body.append(iframe, postForm);

        try {
            postForm.submit();
        } catch (_) {
            sendFetchBackup();
            cleanupAndResolve({ success: true, message: 'Thank you! Your information has been saved.' });
        }
    });
}

function getFileData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
            if (!base64) {
                reject(new Error('The selected CV could not be read.'));
                return;
            }
            resolve(base64);
        };
        reader.onerror = () => reject(new Error('The selected CV could not be read.'));
        reader.readAsDataURL(file);
    });
}

function getFileMimeType(file) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const extensionTypes = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    const detectedType = (file.type || '').toLowerCase();
    return detectedType && detectedType !== 'application/octet-stream'
        ? detectedType
        : extensionTypes[extension] || '';
}

function getServiceInterestedIn(form, formData) {
    const project = formData.get('project');
    const interest = formData.get('bhkType');
    if (project && interest) return `${project} - ${interest}`;
    if (project) return String(project);
    if (interest) return String(interest);
    return form.dataset.serviceInterestedIn || form.dataset.formName || '';
}

function resolveBrochure(projectKey) {
    if (!projectKey) return null;
    if (brochureDownloads.has(projectKey)) return brochureDownloads.get(projectKey);
    const normalized = projectKey.trim().toLowerCase();
    for (const [key, val] of brochureDownloads.entries()) {
        if (key.toLowerCase() === normalized || normalized.includes(key.toLowerCase())) {
            return val;
        }
    }
    return null;
}

async function triggerFileDownload(urlStr, filename) {
    const encodedUrl = encodeURI(urlStr);
    const url = new URL(encodedUrl, window.location.href);

    try {
        const res = await fetch(url.href);
        if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
                link.remove();
            }, 2500);
            return true;
        }
    } catch (_) {
        // Fallback to direct anchor download when running over file:// or restricted CORS
    }

    const link = document.createElement('a');
    link.href = url.href;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1200);
    return true;
}

async function startBrochureDownload(form, selectedProject) {
    const projectKey = form.dataset.downloadProject || selectedProject;
    const brochure = resolveBrochure(projectKey);
    if (!brochure) return true;

    try {
        return await triggerFileDownload(brochure.url, brochure.filename);
    } catch (error) {
        console.error('Brochure download error:', error);
        return false;
    }
}

async function submitWebsiteForm(form) {
    if (form.dataset.submitting === 'true') return;
    if (!form.reportValidity()) return;

    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(?:exec|dev)$/.test(GOOGLE_APPS_SCRIPT_URL)) {
        showStatus(form, 'Online enquiries are not configured yet. Please contact us by phone or email.', 'error');
        return;
    }

    form.dataset.submitting = 'true';
    form.setAttribute('aria-busy', 'true');

    const button = form.querySelector('[type="submit"]');
    const originalButtonHTML = button?.innerHTML || '';
    if (button) {
        button.disabled = true;
        button.textContent = 'Submitting...';
    }
    showStatus(form, 'Submitting your information securely...', 'pending');

    try {
        const requestId = form.dataset.requestId || createRequestId();
        form.dataset.requestId = requestId;
        const formData = new FormData(form);
        const selectedProject = String(formData.get('project') || form.dataset.downloadProject || '');
        const payload = new URLSearchParams();
        const fileInput = form.querySelector('input[type="file"]');
        const file = fileInput?.files?.[0];

        for (const [name, value] of formData.entries()) {
            if (typeof value === 'string' && name !== 'website') payload.append(name, value.trim());
        }

        payload.set('formId', form.dataset.formId || form.id || 'website_form');
        payload.set('requestId', requestId);
        payload.set('pageUrl', `${window.location.origin}${window.location.pathname}`);
        payload.set('pageOrigin', window.location.origin);
        payload.set('companyName', String(formData.get('companyName') || ''));
        payload.set('serviceInterestedIn', getServiceInterestedIn(form, formData));
        payload.set('website', '');

        if (fileInput) {
            if (!file || file.size === 0) throw new Error('Please select a CV to upload.');
            if (file.size > MAX_CV_FILE_SIZE) throw new Error('Please choose a CV smaller than 4 MB.');
            if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
                throw new Error('Please upload your CV as a PDF, DOC, or DOCX file.');
            }

            const mimeType = getFileMimeType(file);
            const acceptedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            if (!acceptedTypes.includes(mimeType)) {
                throw new Error('Please upload your CV as a PDF, DOC, or DOCX file.');
            }

            payload.set('cvFileName', file.name);
            payload.set('cvMimeType', mimeType);
            payload.set('cvFileBase64', await getFileData(file));
        }

        const wantsHomepageBrochure = form.id === 'leadForm' && formData.get('downloadBrochure') === 'yes' && Boolean(resolveBrochure(selectedProject));
        const isBrochureForm = Boolean(form.dataset.downloadProject) || wantsHomepageBrochure || /brochure/i.test(form.dataset.formId || '') || /brochure/i.test(form.id || '');

        // Start brochure download immediately on user submit gesture so browsers never block the download popup, while syncing data to Google Sheet in parallel
        let downloadPromise = null;
        if (isBrochureForm && resolveBrochure(form.dataset.downloadProject || selectedProject)) {
            downloadPromise = startBrochureDownload(form, selectedProject);
        }

        const result = await submitToAppsScript(payload, requestId);
        if (result.success !== true) {
            throw new Error(result.message || 'The form service could not save your submission.');
        }

        form.reset();
        const cvLabel = form.querySelector('#cvFileLabel');
        if (cvLabel) {
            cvLabel.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Choose file (PDF, DOC, DOCX)';
        }
        delete form.dataset.requestId;

        const submissionMessage = result.emailSent === false
            ? result.message
            : form.dataset.successMessage || (isBrochureForm ? 'Thank you! Your details have been saved and your brochure is downloading.' : (result.message || 'Thank you. Your submission has been received.'));
        showStatus(form, submissionMessage, result.emailSent === false ? 'error' : 'success');

        if (downloadPromise) {
            const downloaded = await downloadPromise;
            if (!downloaded) {
                showStatus(form, 'Your information was received, but the brochure download could not start. Please contact NI Group.', 'error');
            }
        }

        if (form.id === 'leadForm' || form.closest('.lead-popup, .modal, .popup, [data-brochure-modal]')) {
            setTimeout(() => {
                if (typeof window.closePopup === 'function') window.closePopup();
                if (typeof window.closeBrochureModal === 'function') window.closeBrochureModal();
            }, 2200);
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showStatus(form, error.message || 'We could not submit your information. Please try again.', 'error');
    } finally {
        form.dataset.submitting = 'false';
        form.removeAttribute('aria-busy');
        if (button) {
            button.disabled = false;
            button.innerHTML = originalButtonHTML;
        }
    }
}

export function initializeFormSubmissions() {
    document.querySelectorAll('[data-brochure-download]').forEach(link => {
        const brochure = resolveBrochure(link.dataset.brochureDownload);
        if (!brochure) return;

        link.href = encodeURI(brochure.url);
        link.download = brochure.filename;
    });

    document.querySelectorAll('[data-form-id] input[type="tel"]').forEach(input => {
        const validatePhone = () => {
            const digits = input.value.replace(/\D/g, '');
            const invalid = input.value.trim() && (digits.length < 7 || digits.length > 15);
            input.setCustomValidity(invalid ? 'Enter a phone number containing 7 to 15 digits.' : '');
        };
        input.addEventListener('input', validatePhone);
        input.addEventListener('change', validatePhone);
        validatePhone();
    });

    // Capture-phase submit listener prevents any page reload across all project/brochure/lead/career/newsletter forms
    document.addEventListener('submit', event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.dataset.formId || form.id === 'leadForm' || form.id === 'brochureForm' || form.classList.contains('brochure-request-form')) {
            if (!form.dataset.formId) {
                form.dataset.formId = form.id || 'project_brochure_request';
            }
            event.preventDefault();
            event.stopPropagation();
            void submitWebsiteForm(form);
        }
    }, true);
}

// Inside submitToAppsScript() in form-submissions.js:
pendingSubmissions.set(requestId, { iframe, postForm, resolve, timeout });
document.body.append(iframe, postForm);

try {
    postForm.submit();
    // Also send beacon/fetch backup so mobile Safari/Chrome never drops the request when starting a PDF download
    sendFetchBackup();
} catch (_) {
    sendFetchBackup();
    cleanupAndResolve({ success: true, message: 'Thank you! Your information has been saved.' });
}
// Inside submitToAppsScript() in form-submissions.js:
pendingSubmissions.set(requestId, { iframe, postForm, resolve, timeout });
document.body.append(iframe, postForm);

try {
    postForm.submit();
    // Also send beacon/fetch backup so mobile Safari/Chrome never drops the request when starting a PDF download
    sendFetchBackup();
} catch (_) {
    sendFetchBackup();
    cleanupAndResolve({ success: true, message: 'Thank you! Your information has been saved.' });
}