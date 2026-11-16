const PROPERTY_KEYS = {
  spreadsheetId: 'SPREADSHEET_ID',
  cvFolderId: 'CV_FOLDER_ID',
  allowedOrigins: 'ALLOWED_ORIGINS',
  leadNotificationEmail: 'LEAD_NOTIFICATION_EMAIL'
};

const SHEET_NAME = 'Enquiries';
const DEFAULT_LEAD_NOTIFICATION_EMAIL = 'sales@nigrouprealty.com';
const HEADERS = [
  'Submission Date & Time',
  'Customer Name',
  'Email',
  'Phone Number',
  'Company Name',
  'Service Interested In',
  'Message',
  'Form Name',
  'Form ID',
  'Page URL',
  'Enquiry Status',
  'CV File URL',
  'Request ID'
];
const MAX_CV_BYTES = 4 * 1024 * 1024;
const RATE_LIMIT_WINDOW_SECONDS = 600;
const MAX_SUBMISSIONS_PER_CONTACT = 4;

const FORM_DEFINITIONS = {
  homepage_lead: {
    name: 'Homepage Lead Form',
    requiresName: true,
    requiresPhone: true,
    requiresEmail: false,
    status: 'New'
  },
  project_brochure_request: {
    name: 'Project Brochure Request',
    requiresName: true,
    requiresPhone: true,
    requiresEmail: true,
    status: 'New'
  },
  paradizia_consultation: {
    name: 'Paradizia Consultation Form',
    requiresName: true,
    requiresPhone: true,
    requiresEmail: false,
    status: 'New'
  },
  career_application: {
    name: 'Careers Application Form',
    requiresName: true,
    requiresPhone: true,
    requiresEmail: true,
    requiresCv: true,
    service: 'Careers at NI Group',
    status: 'New'
  },
  blog_newsletter: {
    name: 'Blog Newsletter Subscription',
    requiresName: false,
    requiresPhone: false,
    requiresEmail: true,
    service: 'Newsletter subscription',
    status: 'Subscribed'
  }
};

function setup() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty(PROPERTY_KEYS.spreadsheetId);
  let cvFolderId = properties.getProperty(PROPERTY_KEYS.cvFolderId);

  if (!spreadsheetId) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet() ||
      SpreadsheetApp.create('NI Group Website Enquiries');
    spreadsheetId = spreadsheet.getId();
    properties.setProperty(PROPERTY_KEYS.spreadsheetId, spreadsheetId);
  }

  if (!cvFolderId) {
    const folder = DriveApp.createFolder('NI Group Website CV Applications');
    cvFolderId = folder.getId();
    properties.setProperty(PROPERTY_KEYS.cvFolderId, cvFolderId);
  }

  if (!properties.getProperty(PROPERTY_KEYS.leadNotificationEmail)) {
    properties.setProperty(PROPERTY_KEYS.leadNotificationEmail, DEFAULT_LEAD_NOTIFICATION_EMAIL);
  }
  MailApp.getRemainingDailyQuota();

  const defaultOrigins = [
    'https://nigrouprealty.com',
    'https://www.nigrouprealty.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5501',
    'http://127.0.0.1:5501'
  ];
  const configuredOrigins = (properties.getProperty(PROPERTY_KEYS.allowedOrigins) || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set(configuredOrigins.concat(defaultOrigins)));
  properties.setProperty(PROPERTY_KEYS.allowedOrigins, allowedOrigins.join(','));

  const sheet = getEnquirySheet();
  initializeSheet(sheet);
  Logger.log('Spreadsheet: ' + SpreadsheetApp.openById(spreadsheetId).getUrl());
  Logger.log('CV folder: ' + DriveApp.getFolderById(cvFolderId).getUrl());
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    service: 'NI Group enquiry intake',
    ready: Boolean(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.spreadsheetId))
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const requestId = cleanText(parameters.requestId, 80);
  const pageOrigin = cleanText(parameters.pageOrigin, 256);

  try {
    if (!isAllowedOrigin(pageOrigin)) {
      throw userError('This form origin is not allowed.');
    }

    if (cleanText(parameters.website, 200)) {
      return responsePage({
        success: true,
        message: 'Thank you. Your submission has been received.',
        requestId: requestId
      }, pageOrigin);
    }

    if (!/^[a-f0-9-]{32,36}$/i.test(requestId)) {
      throw userError('Please refresh the page and submit again.');
    }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw userError('The form service is busy. Please try again in a moment.');
    }

    try {
      const cache = CacheService.getScriptCache();
      const idempotencyKey = `request_${requestId}`;
      if (cache.get(idempotencyKey)) {
        return responsePage({
          success: true,
          message: 'Thank you. Your submission has already been received.',
          requestId: requestId
        }, pageOrigin);
      }

      const submission = validateSubmission(parameters, pageOrigin);
      enforceRateLimit(submission.email || submission.phone);

      const sheet = getEnquirySheet();
      initializeSheet(sheet);
      let cvFile = null;
      try {
        if (submission.cv) cvFile = saveCv(submission.cv);
        sheet.appendRow([
          new Date(),
          safeSheetText(submission.name),
          safeSheetText(submission.email),
          safeSheetText(submission.phone),
          safeSheetText(submission.company),
          safeSheetText(submission.service),
          safeSheetText(submission.message),
          safeSheetText(submission.formName),
          safeSheetText(submission.formId),
          safeSheetText(submission.pageUrl),
          safeSheetText(submission.status),
          safeSheetText(cvFile ? cvFile.getUrl() : ''),
          safeSheetText(requestId)
        ]);
      } catch (error) {
        if (cvFile) cvFile.setTrashed(true);
        throw error;
      }

      cache.put(idempotencyKey, 'saved', 21600);
      if (submission.formId === 'project_brochure_request') {
        try {
          sendBrochureConfirmation(submission);
        } catch (error) {
          console.error('Brochure email failed: %s', error && error.stack ? error.stack : error);
          return responsePage({
            success: true,
            emailSent: false,
            message: 'Your request was saved, but we could not send the confirmation email. NI Group has your details.',
            requestId: requestId
          }, pageOrigin);
        }
      }

      return responsePage({
        success: true,
        emailSent: submission.formId === 'project_brochure_request',
        message: 'Thank you. Your submission has been received.',
        requestId: requestId
      }, pageOrigin);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error('Enquiry submission failed: %s', error && error.stack ? error.stack : error);
    return responsePage({
      success: false,
      message: error && error.userMessage
        ? error.message
        : 'We could not save your submission. Please try again or contact NI Group directly.',
      requestId: requestId
    }, isAllowedOrigin(pageOrigin) ? pageOrigin : '*');
  }
}

function sendBrochureConfirmation(submission) {
  const properties = PropertiesService.getScriptProperties();
  const notificationEmail = cleanText(
    properties.getProperty(PROPERTY_KEYS.leadNotificationEmail) || DEFAULT_LEAD_NOTIFICATION_EMAIL,
    254
  ).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
    throw new Error('The lead notification email address is invalid.');
  }

  const hasBrochure = ['INVICTA', 'IRIS', 'IQRA'].includes(submission.project);
  const brochureNote = hasBrochure
    ? 'You can download the brochure from the project page on our website.'
    : 'Our team will follow up with you and share the brochure when it is available.';
  const body = [
    `Assalamu Alaikum ${submission.name},`,
    '',
    `Thank you for requesting information about ${submission.project}.`,
    brochureNote,
    '',
    'Your enquiry details:',
    `Project: ${submission.project}`,
    `Name: ${submission.name}`,
    `Phone: ${submission.phone}`,
    `Email: ${submission.email}`,
    `Message: ${submission.message}`,
    `Page: ${submission.pageUrl}`,
    '',
    'NI Group Sales'
  ].join('\n');

  MailApp.sendEmail({
    to: submission.email,
    bcc: notificationEmail,
    replyTo: notificationEmail,
    name: 'NI Group',
    subject: `${submission.project} brochure request received`,
    body: body
  });
}

function validateSubmission(parameters, pageOrigin) {
  const formId = cleanText(parameters.formId, 80);
  const definition = FORM_DEFINITIONS[formId];
  if (!definition) throw userError('This form is not recognized. Please refresh the page and try again.');

  const name = cleanText(parameters.name, 120);
  const email = cleanText(parameters.email, 254).toLowerCase();
  const phone = cleanText(parameters.mobile, 30);
  const company = cleanText(parameters.companyName, 160);
  const message = cleanText(parameters.message, 2000);
  const pageUrl = cleanText(parameters.pageUrl, 2048);

  if (definition.requiresName && !name) throw userError('Please enter your name.');
  if (definition.requiresEmail && !email) throw userError('Please enter your email address.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw userError('Please enter a valid email address.');
  }
  if (definition.requiresPhone && !phone) throw userError('Please enter your phone number.');
  if (phone && !isValidPhone(phone)) throw userError('Please enter a valid phone number.');
  if (!pageUrl.startsWith(`${pageOrigin}/`) && pageUrl !== pageOrigin) {
    throw userError('The page URL could not be verified. Please refresh and try again.');
  }

  let service = cleanText(parameters.serviceInterestedIn, 160);
  if (formId === 'homepage_lead') {
    const project = cleanText(parameters.project, 80);
    const projects = ['INVICTA', 'IRIS', 'IQRA', 'PARADIZIA', 'INAYA Residency', 'INARA Metro', 'IRA Residency'];
    if (!projects.includes(project)) throw userError('Please select a project.');
    service = project;
  } else if (formId === 'project_brochure_request') {
    const project = cleanText(parameters.project, 80);
    const projects = ['INVICTA', 'IRIS', 'IQRA', 'PARADIZIA', 'INAYA Residency', 'INARA Metro', 'IRA Residency'];
    if (!projects.includes(project)) throw userError('Please select a valid project.');
    service = `${project} brochure request`;
  } else if (formId === 'paradizia_consultation') {
    const project = cleanText(parameters.project, 80);
    const preference = cleanText(parameters.bhkType, 40);
    if (project !== 'PARADIZIA') throw userError('The selected project is invalid.');
    if (preference && !['Plot', 'Villa', 'Other'].includes(preference)) {
      throw userError('Please select a valid property type.');
    }
    service = preference ? `PARADIZIA - ${preference}` : 'PARADIZIA';
  } else if (definition.service) {
    service = definition.service;
  }

  if (!service) throw userError('Please select a service.');

  return {
    name: name,
    email: email,
    phone: phone,
    company: company,
    service: service,
    message: message,
    formName: definition.name,
    formId: formId,
    pageUrl: pageUrl,
    status: definition.status,
    project: formId === 'project_brochure_request' ? cleanText(parameters.project, 80) : '',
    cv: definition.requiresCv ? validateCv(parameters) : null
  };
}

function validateCv(parameters) {
  const fileName = cleanText(parameters.cvFileName, 180);
  const mimeType = cleanText(parameters.cvMimeType, 120).toLowerCase();
  const rawBase64 = String(parameters.cvFileBase64 || '').trim();
  const maxBase64Length = Math.ceil(MAX_CV_BYTES * 4 / 3) + 8;
  if (rawBase64.length > maxBase64Length) {
    throw userError('Please choose a CV smaller than 4 MB.');
  }
  const base64 = rawBase64;
  const extension = fileName.split('.').pop().toLowerCase();
  const allowedTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  if (!fileName || !base64 || !allowedTypes[extension] || allowedTypes[extension] !== mimeType) {
    throw userError('Please upload your CV as a PDF, DOC, or DOCX file.');
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw userError('The CV file could not be read.');

  let bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch (error) {
    throw userError('The CV file could not be read.');
  }
  if (!bytes.length || bytes.length > MAX_CV_BYTES) {
    throw userError('Please choose a CV smaller than 4 MB.');
  }

  const signature = bytes.slice(0, 8).map(value => (value + 256) % 256);
  const isPdf = extension === 'pdf' && String.fromCharCode.apply(null, signature.slice(0, 5)) === '%PDF-';
  const isDoc = extension === 'doc' &&
    signature.join(',') === '208,207,17,224,161,177,26,225';
  const isDocx = extension === 'docx' && signature[0] === 80 && signature[1] === 75 &&
    signature[2] === 3 && signature[3] === 4;
  if (!isPdf && !isDoc && !isDocx) throw userError('The uploaded CV does not match its file type.');

  return {
    name: fileName.replace(/[\\/:*?"<>|]/g, '_'),
    mimeType: mimeType,
    bytes: bytes
  };
}

function saveCv(cv) {
  const folderId = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.cvFolderId);
  if (!folderId) throw new Error('CV folder is not configured.');

  const blob = Utilities.newBlob(cv.bytes, cv.mimeType, cv.name);
  return DriveApp.getFolderById(folderId).createFile(blob);
}

function enforceRateLimit(contact) {
  if (!contact) return;

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, contact.toLowerCase());
  const key = `rate_${Utilities.base64EncodeWebSafe(digest).slice(0, 40)}`;
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get(key) || 0);
  if (count >= MAX_SUBMISSIONS_PER_CONTACT) {
    throw userError('Too many submissions were received. Please wait a few minutes or contact us directly.');
  }
  cache.put(key, String(count + 1), RATE_LIMIT_WINDOW_SECONDS);
}

function getEnquirySheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.spreadsheetId);
  if (!spreadsheetId) throw new Error('Run setup() before deploying the web app.');

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function initializeSheet(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (currentHeaders.join('') !== HEADERS.join('')) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(2, 2, sheet.getMaxRows() - 1, HEADERS.length - 1).setNumberFormat('@');
  }
}

function isAllowedOrigin(origin) {
  if (!origin || !/^https?:\/\/[^/]+$/.test(origin)) return false;
  const configured = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.allowedOrigins) || '';
  return configured.split(',').map(value => value.trim()).includes(origin);
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

function safeSheetText(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function userError(message) {
  const error = new Error(message);
  error.userMessage = true;
  return error;
}

function responsePage(result, targetOrigin) {
  const response = {
    type: 'ni-form-result',
    requestId: result.requestId || '',
    success: result.success === true,
    message: result.message
  };
  if (typeof result.emailSent === 'boolean') response.emailSent = result.emailSent;
  const safeResult = JSON.stringify(response).replace(/</g, '\\u003c');
  const safeOrigin = JSON.stringify(targetOrigin || '*').replace(/</g, '\\u003c');
  const html = '<!doctype html><meta charset="utf-8"><script>' +
    `window.top.postMessage(${safeResult}, ${safeOrigin});` +
    '</script>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
