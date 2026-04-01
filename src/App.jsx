import { useEffect, useMemo, useState } from 'react';
import { buildReportHtml } from './reportTemplate';

const COMPANIES_STORAGE_KEY = 'damage-report-companies-v1';
const SELECTED_COMPANY_STORAGE_KEY = 'damage-report-selected-company-v1';
const MAX_PHOTOS = 9;
const HEADER_LOGO_UPLOAD_MAX_WIDTH = 2400;
const HEADER_LOGO_UPLOAD_MAX_HEIGHT = 800;
const WATERMARK_LOGO_UPLOAD_MAX_WIDTH = 2400;
const WATERMARK_LOGO_UPLOAD_MAX_HEIGHT = 1200;
const FOOTER_LOGO_UPLOAD_MAX_WIDTH = 1800;
const FOOTER_LOGO_UPLOAD_MAX_HEIGHT = 600;

const DEFAULT_COMPANY = {
  id: 'mac-ops',
  name: 'Mac Ops',
  headerLogoSrc: 'https://mac-ops.co.nz/wp-content/uploads/2015/12/Mac-ops-clear-logo-new.jpg',
  watermarkLogoSrc: '',
  footerLogoSrc: 'https://mac-ops.co.nz/wp-content/uploads/2026/03/Screenshot-2026-03-27-at-4.58.35-PM.png',
  addressLine1: 'Level 1 / 45 Camp Street',
  addressLine2: 'Queenstown 9300, New Zealand',
  phone: '034282911',
  email: 'info@mac-ops.co.nz',
  footerLine1:
    'Mac Ops is a leading Sales, Service and Repair business for Apple, Windows, computers, phones, drones and electronic devices.',
  website: 'www.mac-ops.co.nz',
};

const MONEY_FIELDS = new Set(['replacementValue', 'damageReportValue']);
const NUMERIC_ONLY_FIELDS = new Set(['customerPhone', 'imei']);

function createCompanyId() {
  return `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCompanyProfile(overrides = {}) {
  return {
    id: overrides.id ?? createCompanyId(),
    name: overrides.name ?? '',
    headerLogoSrc: overrides.headerLogoSrc ?? '',
    watermarkLogoSrc: overrides.watermarkLogoSrc ?? '',
    footerLogoSrc: overrides.footerLogoSrc ?? '',
    addressLine1: overrides.addressLine1 ?? '',
    addressLine2: overrides.addressLine2 ?? '',
    phone: overrides.phone ?? '',
    email: overrides.email ?? '',
    footerLine1: overrides.footerLine1 ?? '',
    website: overrides.website ?? '',
  };
}

function createInitialForm() {
  return {
    assessmentNumber: '0001',
    assessmentDate: new Date().toISOString().slice(0, 10),
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    claimNumber: '',
    deviceModel: '',
    replacementValue: '',
    storage: '',
    serialNumber: '',
    imei: '',
    deviceIssue: '',
    diagnosisIssues: '',
    repairRecommendation: '',
    replacementDevice: '',
    damageReportValue: '',
    totalReportValue: '',
    photos: [],
  };
}

function keepOnlyNumbers(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function toCurrency(value) {
  const clean = String(value ?? '').replace(/[^\d.]/g, '');
  if (!clean) {
    return '';
  }

  const [integerPart, ...decimalParts] = clean.split('.');
  const normalized = decimalParts.length ? `${integerPart}.${decimalParts.join('')}` : integerPart;
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    return '';
  }

  return `$ ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sanitizeMoneyTypingInput(value) {
  const clean = String(value ?? '').replace(/[^\d.]/g, '');
  if (!clean) {
    return '';
  }

  const dotIndex = clean.indexOf('.');
  if (dotIndex === -1) {
    return clean;
  }

  const integerPart = clean.slice(0, dotIndex).replace(/\./g, '');
  const decimalPart = clean.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2);
  const normalizedInteger = integerPart || '0';

  if (!decimalPart && clean.endsWith('.')) {
    return `${normalizedInteger}.`;
  }

  return `${normalizedInteger}.${decimalPart}`;
}

function parseMoneyNumber(value) {
  const clean = String(value ?? '').replace(/[^\d.]/g, '');
  if (!clean) {
    return null;
  }

  const [integerPart, ...decimalParts] = clean.split('.');
  const normalized = decimalParts.length ? `${integerPart}.${decimalParts.join('')}` : integerPart;
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}

function buildAutoTotal(replacementValue, insuranceAssessmentValue) {
  const replacementAmount = parseMoneyNumber(replacementValue);
  const insuranceAmount = parseMoneyNumber(insuranceAssessmentValue);

  if (replacementAmount === null && insuranceAmount === null) {
    return '';
  }

  return toCurrency((replacementAmount ?? 0) + (insuranceAmount ?? 0));
}

function sanitizeField(name, value) {
  if (NUMERIC_ONLY_FIELDS.has(name)) {
    return keepOnlyNumbers(value);
  }

  if (MONEY_FIELDS.has(name)) {
    return sanitizeMoneyTypingInput(value);
  }

  if (name === 'serialNumber') {
    return String(value ?? '').toUpperCase();
  }

  return value;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        src: String(reader.result ?? ''),
      });
    };

    reader.onerror = () => reject(new Error(`Could not read image ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function resolveOutputMimeType(mimeType) {
  const normalized = String(mimeType ?? '').toLowerCase().trim();
  if (normalized === 'image/png' || normalized === 'image/jpeg' || normalized === 'image/webp') {
    return normalized;
  }

  return 'image/png';
}

function resizeImageDataUrl(dataUrl, { maxWidth, maxHeight, mimeType }) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const targetWidth = Math.max(1, Math.round(image.width * scale));
      const targetHeight = Math.max(1, Math.round(image.height * scale));

      if (scale >= 1) {
        resolve(dataUrl);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const outputMimeType = resolveOutputMimeType(mimeType);
      const outputQuality =
        outputMimeType === 'image/jpeg' || outputMimeType === 'image/webp' ? 0.98 : undefined;

      resolve(canvas.toDataURL(outputMimeType, outputQuality));
    };

    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function normalizeStoredCompany(company, index) {
  const normalized = createCompanyProfile({
    id: company?.id || `company-${index + 1}`,
    name: company?.name || '',
    headerLogoSrc: company?.headerLogoSrc || '',
    watermarkLogoSrc: company?.watermarkLogoSrc || '',
    footerLogoSrc: company?.footerLogoSrc || '',
    addressLine1: company?.addressLine1 || '',
    addressLine2: company?.addressLine2 || '',
    phone: String(company?.phone || ''),
    email: company?.email || '',
    footerLine1: company?.footerLine1 || '',
    website: company?.website || '',
  });

  return normalized;
}

function loadInitialCompanies() {
  if (typeof window === 'undefined') {
    return [DEFAULT_COMPANY];
  }

  try {
    const raw = window.localStorage.getItem(COMPANIES_STORAGE_KEY);
    if (!raw) {
      return [DEFAULT_COMPANY];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return [DEFAULT_COMPANY];
    }

    return parsed.map(normalizeStoredCompany);
  } catch (_error) {
    return [DEFAULT_COMPANY];
  }
}

function loadInitialSelectedCompanyId(companies) {
  if (typeof window === 'undefined') {
    return companies[0]?.id ?? DEFAULT_COMPANY.id;
  }

  const storedId = window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
  const exists = companies.some((company) => company.id === storedId);

  return exists ? storedId : companies[0]?.id ?? DEFAULT_COMPANY.id;
}

function App() {
  const [formData, setFormData] = useState(createInitialForm);
  const [companies, setCompanies] = useState(loadInitialCompanies);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    const initialCompanies = loadInitialCompanies();
    return loadInitialSelectedCompanyId(initialCompanies);
  });
  const [companyForm, setCompanyForm] = useState(() => {
    const initialCompanies = loadInitialCompanies();
    const selectedId = loadInitialSelectedCompanyId(initialCompanies);
    return initialCompanies.find((company) => company.id === selectedId) ?? initialCompanies[0] ?? DEFAULT_COMPANY;
  });
  const [companyNotice, setCompanyNotice] = useState('');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? DEFAULT_COMPANY;
  }, [companies, selectedCompanyId]);

  const canGenerateReport = Boolean(selectedCompany?.name?.trim() && selectedCompany?.headerLogoSrc?.trim());

  const reportHtml = useMemo(() => buildReportHtml(formData, selectedCompany), [formData, selectedCompany]);

  useEffect(() => {
    if (!companies.some((company) => company.id === selectedCompanyId)) {
      setSelectedCompanyId(companies[0]?.id ?? DEFAULT_COMPANY.id);
    }
  }, [companies, selectedCompanyId]);

  useEffect(() => {
    setCompanyForm(selectedCompany);
    setCompanyNotice('');
  }, [selectedCompany]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
    window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, selectedCompanyId);
  }, [companies, selectedCompanyId]);

  useEffect(() => {
    setFormData((current) => {
      const computedTotal = buildAutoTotal(current.replacementValue, current.damageReportValue);
      if (current.totalReportValue === computedTotal) {
        return current;
      }

      return {
        ...current,
        totalReportValue: computedTotal,
      };
    });
  }, [formData.replacementValue, formData.damageReportValue]);

  function updateField(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: sanitizeField(name, value),
    }));
  }

  function normalizeMoneyFieldForEditing(event) {
    const { name, value } = event.target;
    if (!MONEY_FIELDS.has(name)) {
      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: sanitizeMoneyTypingInput(value),
    }));
  }

  function formatMoneyFieldOnBlur(event) {
    const { name, value } = event.target;
    if (!MONEY_FIELDS.has(name)) {
      return;
    }

    setFormData((current) => ({
      ...current,
      [name]: toCurrency(value),
    }));
  }

  function updateCompanyField(event) {
    const { name, value } = event.target;

    setCompanyForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handlePhotoUpload(event) {
    const files = Array.from(event.target.files ?? [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, MAX_PHOTOS);

    if (!files.length) {
      return;
    }

    try {
      const photos = await Promise.all(files.map(fileToDataUrl));
      setFormData((current) => ({
        ...current,
        photos,
      }));
    } catch (_error) {
      setFormData((current) => ({
        ...current,
        photos: [],
      }));
    } finally {
      event.target.value = '';
    }
  }

  function clearPhotos() {
    setFormData((current) => ({
      ...current,
      photos: [],
    }));
  }

  async function handleCompanyLogoUpload(fieldName, event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    try {
      const logo = await fileToDataUrl(file);
      const isHeaderLogo = fieldName === 'headerLogoSrc';
      const isWatermarkLogo = fieldName === 'watermarkLogoSrc';
      const resizedLogoSrc = await resizeImageDataUrl(logo.src, {
        maxWidth: isHeaderLogo
          ? HEADER_LOGO_UPLOAD_MAX_WIDTH
          : isWatermarkLogo
            ? WATERMARK_LOGO_UPLOAD_MAX_WIDTH
            : FOOTER_LOGO_UPLOAD_MAX_WIDTH,
        maxHeight: isHeaderLogo
          ? HEADER_LOGO_UPLOAD_MAX_HEIGHT
          : isWatermarkLogo
            ? WATERMARK_LOGO_UPLOAD_MAX_HEIGHT
            : FOOTER_LOGO_UPLOAD_MAX_HEIGHT,
        mimeType: file.type,
      });

      setCompanyForm((current) => ({
        ...current,
        [fieldName]: resizedLogoSrc,
      }));
      setCompanyNotice('');
    } catch (_error) {
      setCompanyNotice('Could not read selected logo image. Please try another file.');
    } finally {
      event.target.value = '';
    }
  }

  function clearCompanyLogo(fieldName) {
    setCompanyForm((current) => ({
      ...current,
      [fieldName]: '',
    }));
  }

  function deleteCurrentCompany() {
    if (typeof window !== 'undefined') {
      const companyName = String(companyForm.name ?? '').trim() || 'this company';
      const confirmed = window.confirm(`Delete "${companyName}"? This action cannot be undone.`);

      if (!confirmed) {
        return;
      }
    }

    const targetCompanyId = companyForm.id;
    const remaining = companies.filter((company) => company.id !== targetCompanyId);

    if (remaining.length) {
      setCompanies(remaining);
      setSelectedCompanyId(remaining[0].id);
      setCompanyNotice('');
      setIsCompanyModalOpen(false);
      return;
    }

    const fallback = createCompanyProfile({
      name: 'New Company',
      footerLine1: 'Company footer line 1',
      website: 'www.company-site.com',
    });

    setCompanies([fallback]);
    setSelectedCompanyId(fallback.id);

    setCompanyNotice('');
    setIsCompanyModalOpen(false);
  }

  function createCompany() {
    const newCompany = createCompanyProfile({
      name: 'New Company',
      footerLine1: 'Company footer line 1',
      website: 'www.company-site.com',
    });

    setCompanies((current) => [...current, newCompany]);
    setCompanyForm(newCompany);
    setSelectedCompanyId(newCompany.id);
    setCompanyNotice('');
    setIsCompanyModalOpen(true);
  }

  function saveCompany() {
    const normalized = {
      ...companyForm,
      name: String(companyForm.name ?? '').trim(),
      headerLogoSrc: String(companyForm.headerLogoSrc ?? '').trim(),
      watermarkLogoSrc: String(companyForm.watermarkLogoSrc ?? '').trim(),
      footerLogoSrc: String(companyForm.footerLogoSrc ?? '').trim(),
      addressLine1: String(companyForm.addressLine1 ?? '').trim(),
      addressLine2: String(companyForm.addressLine2 ?? '').trim(),
      phone: String(companyForm.phone ?? '').trim(),
      email: String(companyForm.email ?? '').trim(),
      footerLine1: String(companyForm.footerLine1 ?? '').trim(),
      website: String(companyForm.website ?? '').trim(),
    };

    if (!normalized.name) {
      setCompanyNotice('Company name is required.');
      return;
    }

    if (!normalized.headerLogoSrc) {
      setCompanyNotice('Header logo is required.');
      return;
    }

    setCompanies((current) =>
      current.map((company) => (company.id === normalized.id ? normalized : company)),
    );
    setCompanyNotice('Company profile saved.');
    setIsCompanyModalOpen(false);
  }

  function openReportInNewTab() {
    if (!canGenerateReport) {
      setCompanyNotice('Please save a company with name and required header logo before generating the report.');
      setIsCompanyModalOpen(true);
      return;
    }

    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  }

  function downloadReportHtml() {
    if (!canGenerateReport) {
      setCompanyNotice('Please save a company with name and required header logo before downloading.');
      setIsCompanyModalOpen(true);
      return;
    }

    const safeAssessment = formData.assessmentNumber.trim() || 'report';
    const fileName = `damage-report-${safeAssessment}.html`;
    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportReportPdf() {
    if (!canGenerateReport) {
      setCompanyNotice('Please save a company with name and required header logo before exporting PDF.');
      setIsCompanyModalOpen(true);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 300);
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }

      try {
        frameWindow.addEventListener('afterprint', cleanup, { once: true });
      } catch (_error) {
        // ignore and rely on timeout cleanup below
      }

      window.setTimeout(() => {
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(cleanup, 3000);
      }, 400);
    };

    iframe.srcdoc = reportHtml;
    document.body.appendChild(iframe);
  }

  function resetForm() {
    setFormData(createInitialForm());
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Damage Report Generator</h1>
          <p>Fill in the fields and generate a complete report in HTML using your template model.</p>
        </div>

        <div className="topbar-actions">
          <label className="select-company">
            <span>Select company</span>
            <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name || 'Unnamed company'}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={createCompany}>
            Create Company
          </button>
          <button type="button" onClick={() => setIsCompanyModalOpen(true)}>
            Edit Company
          </button>
          <button type="button" onClick={openReportInNewTab} disabled={!canGenerateReport}>
            Open Report
          </button>
          <button type="button" onClick={downloadReportHtml} disabled={!canGenerateReport}>
            Download HTML
          </button>
          <button type="button" onClick={exportReportPdf} disabled={!canGenerateReport}>
            Export PDF
          </button>
          <button type="button" className="secondary" onClick={resetForm}>
            Reset Form
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="form-panel">
          <h2>Report Form</h2>

          <div className="form-section">
            <h3>Assessment</h3>
            <div className="field-grid two-col">
              <label>
                Assessment Number
                <input name="assessmentNumber" value={formData.assessmentNumber} onChange={updateField} />
              </label>
              <label>
                Assessment Date
                <input type="date" name="assessmentDate" value={formData.assessmentDate} onChange={updateField} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Customer details</h3>
            <div className="field-grid two-col">
              <label>
                Name
                <input name="customerName" value={formData.customerName} onChange={updateField} />
              </label>
              <label>
                Phone (numbers only)
                <input
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={updateField}
                  inputMode="numeric"
                />
              </label>
              <label>
                E-mail
                <input name="customerEmail" value={formData.customerEmail} onChange={updateField} />
              </label>
              <label>
                Claim Number
                <input name="claimNumber" value={formData.claimNumber} onChange={updateField} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Device Specifications</h3>
            <div className="field-grid two-col">
              <label>
                Device
                <input name="deviceModel" value={formData.deviceModel} onChange={updateField} />
              </label>
              <label>
                Replacement Value
                <input
                  name="replacementValue"
                  value={formData.replacementValue}
                  onChange={updateField}
                  onFocus={normalizeMoneyFieldForEditing}
                  onBlur={formatMoneyFieldOnBlur}
                  inputMode="decimal"
                />
              </label>
              <label>
                Storage
                <input name="storage" value={formData.storage} onChange={updateField} />
              </label>
              <label>
                Serial Number (auto uppercase)
                <input name="serialNumber" value={formData.serialNumber} onChange={updateField} />
              </label>
              <label>
                IMEI (numbers only)
                <input name="imei" value={formData.imei} onChange={updateField} inputMode="numeric" />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Device Issue / Damage</h3>
            <label>
              Issue Details
              <textarea
                rows={4}
                name="deviceIssue"
                value={formData.deviceIssue}
                onChange={updateField}
                placeholder="Describe what happened to the device"
              />
            </label>
          </div>

          <div className="form-section">
            <h3>Diagnosis of Issues</h3>
            <label>
              Diagnosis Details
              <textarea
                rows={4}
                name="diagnosisIssues"
                value={formData.diagnosisIssues}
                onChange={updateField}
                placeholder="Describe technician diagnosis and findings"
              />
            </label>
          </div>

          <div className="form-section">
            <h3>Repair and Replacement</h3>
            <label>
              Recommendation
              <textarea
                rows={4}
                name="repairRecommendation"
                value={formData.repairRecommendation}
                onChange={updateField}
                placeholder="Describe the repair/replacement recommendation"
              />
            </label>

            <div className="field-grid two-col">
              <label>
                Replacement Device
                <input name="replacementDevice" value={formData.replacementDevice} onChange={updateField} />
              </label>
              <label>
                Insurance Assessment Value
                <input
                  name="damageReportValue"
                  value={formData.damageReportValue}
                  onChange={updateField}
                  onFocus={normalizeMoneyFieldForEditing}
                  onBlur={formatMoneyFieldOnBlur}
                  inputMode="decimal"
                />
              </label>
              <label>
                Total Report Value
                <input
                  name="totalReportValue"
                  value={formData.totalReportValue}
                  readOnly
                  title="Calculated automatically from Replacement Value + Insurance Assessment Value"
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Device Photos (If applicable)</h3>
            <label>
              Upload Photos (up to {MAX_PHOTOS})
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
            </label>

            <div className="photo-tools">
              <p>{formData.photos.length} photo(s) selected</p>
              <button type="button" className="secondary" onClick={clearPhotos} disabled={!formData.photos.length}>
                Clear Photos
              </button>
            </div>

            {formData.photos.length ? (
              <div className="photo-grid">
                {formData.photos.map((photo, index) => (
                  <div className="photo-thumb" key={`${photo.name}-${index}`}>
                    <img src={photo.src} alt={photo.name || `Photo ${index + 1}`} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="preview-panel">
          <div className="preview-header">
            <h2>Live HTML Preview</h2>
            <p>The report updates automatically as the user fills out the form.</p>
          </div>

          <iframe
            className="preview-frame"
            srcDoc={reportHtml}
            title="Damage report preview"
            sandbox="allow-same-origin"
          />
        </section>
      </main>

      {isCompanyModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setCompanyForm(selectedCompany);
            setCompanyNotice('');
            setIsCompanyModalOpen(false);
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Company Profile</h3>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setCompanyForm(selectedCompany);
                  setCompanyNotice('');
                  setIsCompanyModalOpen(false);
                }}
              >
                Close
              </button>
            </div>

            <div className="modal-body">
              <div className="field-grid two-col">
                <label>
                  Company Name
                  <input name="name" value={companyForm.name} onChange={updateCompanyField} />
                </label>
                <label>
                  Header Phone
                  <input name="phone" value={companyForm.phone} onChange={updateCompanyField} type="tel" />
                </label>
                <label>
                  Header Address Line 1
                  <input name="addressLine1" value={companyForm.addressLine1} onChange={updateCompanyField} />
                </label>
                <label>
                  Header Address Line 2
                  <input name="addressLine2" value={companyForm.addressLine2} onChange={updateCompanyField} />
                </label>
                <label>
                  Header E-mail
                  <input name="email" value={companyForm.email} onChange={updateCompanyField} />
                </label>
                <label>
                  Footer Website
                  <input name="website" value={companyForm.website} onChange={updateCompanyField} />
                </label>
              </div>

              <label>
                Footer Text Line 1
                <textarea rows={2} name="footerLine1" value={companyForm.footerLine1} onChange={updateCompanyField} />
              </label>

              <div className="logo-upload-grid">
                <div className="logo-upload-card">
                  <p>Header Logo (required)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleCompanyLogoUpload('headerLogoSrc', event)}
                  />
                  {companyForm.headerLogoSrc ? (
                    <div className="logo-preview logo-preview-header">
                      <img src={companyForm.headerLogoSrc} alt="Header logo preview" />
                    </div>
                  ) : (
                    <p className="hint">No header logo selected.</p>
                  )}
                </div>

                <div className="logo-upload-card">
                  <p>Watermark Logo (optional)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleCompanyLogoUpload('watermarkLogoSrc', event)}
                  />
                  {companyForm.watermarkLogoSrc ? (
                    <>
                      <div className="logo-preview logo-preview-watermark">
                        <img src={companyForm.watermarkLogoSrc} alt="Watermark logo preview" />
                      </div>
                      <button type="button" className="secondary" onClick={() => clearCompanyLogo('watermarkLogoSrc')}>
                        Remove Watermark Logo
                      </button>
                    </>
                  ) : (
                    <p className="hint">If not selected, the system will use the header logo as watermark.</p>
                  )}
                </div>

                <div className="logo-upload-card">
                  <p>Footer Logo (optional)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleCompanyLogoUpload('footerLogoSrc', event)}
                  />
                  {companyForm.footerLogoSrc ? (
                    <>
                      <div className="logo-preview logo-preview-footer">
                        <img src={companyForm.footerLogoSrc} alt="Footer logo preview" />
                      </div>
                      <button type="button" className="secondary" onClick={() => clearCompanyLogo('footerLogoSrc')}>
                        Remove Footer Logo
                      </button>
                    </>
                  ) : (
                    <p className="hint">No footer logo selected.</p>
                  )}
                </div>
              </div>

              {companyNotice ? <p className="company-notice">{companyNotice}</p> : null}
            </div>

            <div className="modal-actions">
              <button type="button" className="danger" onClick={deleteCurrentCompany}>
                Delete Company
              </button>

              <div className="modal-actions-right">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setCompanyForm(selectedCompany);
                    setCompanyNotice('');
                    setIsCompanyModalOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button type="button" onClick={saveCompany}>
                  Save Company
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
