import { GOOGLE_APPS_SCRIPT_URL } from './forms-config.js';
import invictaBrochureUrl from './Project Photo/INVICTA - Kalikapur/Invicta-Brochure.pdf?url';
import irisBrochureUrl from './All Pdf/IRIS_Brochure_20241202_155121_0000.pdf?url';
import iqraBrochureUrl from './All Pdf/Iqra Enclave Brochure.pdf?url';

const MAX_CV_FILE_SIZE = 4 * 1024 * 1024;
const RESPONSE_TIMEOUT_MS = 30000;
const pendingSubmissions = new Map();
const brochureDownloads = new Map([
    ['INVICTA', { url: invictaBrochureUrl, filename: 'Invicta-Brochure.pdf' }],
    ['IRIS', { url: irisBrochureUrl, filename: 'IRIS-Brochure.pdf' }],
    ['IQRA', { url: iqraBrochureUrl, filename: 'Iqra-Enclave-Brochure.pdf' }]
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
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

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

    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.name = `ni-form-${requestId}`;
        iframe.title = 'Form submission response';
        iframe.hidden = true;
        iframe.setAttribute('aria-hidden', 'true');

        const postForm = document.createElement('form');
        postForm.method = 'POST';
        postForm.action = GOOGLE_APPS_SCRIPT_URL;
        postForm.target = iframe.name;
        postForm.hidden = true;

        for (const [name, value] of payload.entries()) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            postForm.appendChild(input);
        }

        const timeout = setTimeout(() => {
            pendingSubmissions.delete(requestId);
            iframe.remove();
            postForm.remove();
            reject(new Error('The form service did not respond in time.'));
        }, RESPONSE_TIMEOUT_MS);

        pendingSubmissions.set(requestId, { iframe, postForm, resolve, timeout });
        document.body.append(iframe, postForm);
        try {
            postForm.submit();
        } catch (error) {
            clearTimeout(timeout);
            pendingSubmissions.delete(requestId);
            iframe.remove();
            postForm.remove();
            reject(error);
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
    const detectedType = file.type.toLowerCase();
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

function startBrochureDownload(form) {
    const project = form.dataset.downloadProject;
    const brochure = project ? brochureDownloads.get(project) : null;
    if (!brochure) return true;

    try {
        const url = new URL(brochure.url, window.location.href);
        if (url.origin !== window.location.origin || !url.pathname.toLowerCase().endsWith('.pdf')) {
            throw new Error('The brochure download link is invalid.');
        }

        const link = document.createElement('a');
        link.href = url.href;
        link.download = brochure.filename;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
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
        const payload = new URLSearchParams();
        const fileInput = form.querySelector('input[type="file"]');
        const file = fileInput?.files?.[0];

        for (const [name, value] of formData.entries()) {
            if (typeof value === 'string' && name !== 'website') payload.append(name, value.trim());
        }

        payload.set('formId', form.dataset.formId);
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

        const result = await submitToAppsScript(payload, requestId);
        if (result.success !== true) {
            throw new Error(result.message || 'The form service could not save your submission.');
        }

        form.reset();
        delete form.dataset.requestId;
        const submissionMessage = result.emailSent === false
            ? result.message
            : form.dataset.successMessage || result.message || 'Thank you. Your submission has been received.';
        showStatus(form, submissionMessage, result.emailSent === false ? 'error' : 'success');
        if (!startBrochureDownload(form)) {
            showStatus(form, 'Your information was received, but the brochure download could not start. Please contact NI Group.', 'error');
        }

        if (form.id === 'leadForm') setTimeout(() => window.closePopup?.(), 2500);
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

    document.addEventListener('submit', event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || !form.dataset.formId) return;

        event.preventDefault();
        void submitWebsiteForm(form);
    });
}
