function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function withFallback(value, fallback) {
  const trimmed = String(value ?? '').trim();
  return escapeHtml(trimmed || fallback);
}

function toParagraphs(value, fallback) {
  const lines = String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraphs = lines.length ? lines : [fallback];
  return paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

function formatReportDate(rawDate) {
  const value = String(rawDate ?? '').trim();

  if (!value) {
    return 'Date not provided';
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return escapeHtml(value);
  }

  return new Intl.DateTimeFormat('en-NZ', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function safeImageSrc(src) {
  return String(src ?? '').replace(/"/g, '%22').trim();
}

function buildImageMarkup(src, alt) {
  const clean = safeImageSrc(src);
  if (!clean) {
    return '';
  }

  return `<img src="${clean}" alt="${escapeHtml(alt)}">`;
}

function normalizeCompany(companyInput) {
  const source = companyInput ?? {};

  return {
    name: String(source.name ?? '').trim() || 'Company',
    headerLogoSrc: String(source.headerLogoSrc ?? '').trim(),
    watermarkLogoSrc: String(source.watermarkLogoSrc ?? '').trim(),
    footerLogoSrc: String(source.footerLogoSrc ?? '').trim(),
    addressLine1: String(source.addressLine1 ?? '').trim(),
    addressLine2: String(source.addressLine2 ?? '').trim(),
    phone: String(source.phone ?? '').trim(),
    email: String(source.email ?? '').trim(),
    footerLine1: String(source.footerLine1 ?? '').trim(),
    website: String(source.website ?? '').trim(),
  };
}

function getPhotoLayout(photoCount) {
  if (photoCount <= 1) {
    return { columns: 1, cardHeight: 620 };
  }

  if (photoCount <= 2) {
    return { columns: 2, cardHeight: 320 };
  }

  if (photoCount <= 4) {
    return { columns: 2, cardHeight: 250 };
  }

  if (photoCount <= 6) {
    return { columns: 3, cardHeight: 185 };
  }

  return { columns: 3, cardHeight: 130 };
}

function buildPhotosMarkup(photos) {
  if (!photos.length) {
    return '<p class="photos-empty">No device photos were uploaded for this report.</p>';
  }

  const { columns, cardHeight } = getPhotoLayout(photos.length);

  return `<div class="photos-grid" style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
    ${photos
      .map(
        (photo, index) => `<figure class="photo-card" style="height:${cardHeight}px;">
          <img src="${safeImageSrc(photo.src)}" alt="${escapeHtml(photo.name || `Device Photo ${index + 1}`)}">
        </figure>`,
      )
      .join('')}
  </div>`;
}

export function buildReportHtml(data, companyInput) {
  const company = normalizeCompany(companyInput);
  const companyName = company.name;
  const footerLine1 = String(company.footerLine1 ?? '').trim();
  const footerTextMarkup = [footerLine1]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br>\n      ');

  const headerLogoMarkup = buildImageMarkup(
    company.headerLogoSrc,
    `${companyName} Header Logo`,
  );

  const watermarkSrc = company.watermarkLogoSrc || company.headerLogoSrc;
  const watermarkMarkup = buildImageMarkup(watermarkSrc, `${companyName} Watermark`);

  const footerLogoMarkup = company.footerLogoSrc
    ? `<div class="footer-logo">
        ${buildImageMarkup(company.footerLogoSrc, `${companyName} Footer Logo`)}
      </div>`
    : '';

  const photos = Array.isArray(data.photos)
    ? data.photos
        .filter((photo) => photo && typeof photo.src === 'string' && photo.src.trim())
        .slice(0, 9)
    : [];

  const photosMarkup = buildPhotosMarkup(photos);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Insurance Assessment</title>
<style>
  body {
    margin: 0;
    background: #f2f2f2;
    font-family: Arial, Helvetica, sans-serif;
    padding: 20px 0;
  }

  .page {
    width: 794px;
    min-height: 1123px;
    margin: 0 auto 20px;
    background: #ffffff;
    padding: 60px 70px;
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
  }

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 250px;
    height: 85px;
  }

  .logo img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
  }

  .company-info {
    text-align: right;
    font-size: 14px;
    color: #777;
    line-height: 1.5;
  }

  .page-main {
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .title {
    text-align: center;
    font-size: 30px;
    font-weight: bold;
    margin-top: 35px;
    margin-bottom: 25px;
    text-decoration: underline;
  }

  .meta {
    text-align: right;
    font-size: 15px;
    margin-bottom: 35px;
    line-height: 1.6;
  }

  .section-title {
    font-size: 18px;
    font-weight: bold;
    text-decoration: underline;
    margin-top: 25px;
    margin-bottom: 10px;
  }

  .section-content {
    margin-left: 40px;
  }

  .row {
    margin-bottom: 8px;
    font-size: 16px;
  }

  .label {
    font-weight: bold;
    display: inline-block;
    min-width: 220px;
  }

  .report {
    margin-top: 15px;
    margin-left: 40px;
    font-size: 17px;
    line-height: 1.7;
  }

  .report p {
    margin: 0 0 14px 0;
  }

  .footer {
    margin-top: auto;
    padding-top: 20px;
    text-align: center;
    font-size: 12px;
    color: #b5b5b5;
    line-height: 1.6;
    position: relative;
    z-index: 1;
  }

  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 70%;
    height: 70%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 0;
  }

  .watermark img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    opacity: 0.06;
  }

  .footer-logo {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 60px;
  }

  .footer-logo img {
    display: block;
    margin: 0 auto;
    max-width: 160px;
    max-height: 60px;
    width: auto;
    height: auto;
    object-fit: contain;
  }

  .photos-wrapper {
    margin-left: 40px;
    margin-top: 12px;
  }

  .photos-grid {
    display: grid;
    gap: 12px;
  }

  .photo-card {
    margin: 0;
    border: 1px solid #dedede;
    border-radius: 10px;
    background: #fafafa;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 6px;
  }

  .photo-card img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .photos-empty {
    margin: 0;
    font-size: 16px;
    color: #666;
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: 0;
    }

    html,
    body {
      margin: 0;
      padding: 0;
    }

    body {
      background: #ffffff;
      padding: 0;
    }

    .page {
      margin: 0 auto;
      page-break-after: always;
      break-after: page;
    }

    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="watermark">
      ${watermarkMarkup}
    </div>

    <div class="header">
      <div class="logo">
        ${headerLogoMarkup}
      </div>

      <div class="company-info">
        ${withFallback(company.addressLine1, 'Address line 1 not provided')}<br>
        ${withFallback(company.addressLine2, 'Address line 2 not provided')}<br>
        Phone: ${withFallback(company.phone, 'Not provided')}<br>
        E-mail: ${withFallback(company.email, 'Not provided')}
      </div>
    </div>

    <div class="page-main">
      <div class="title">Insurance Assessment</div>

      <div class="meta">
        <strong>${escapeHtml(companyName)} Assessment: ${withFallback(data.assessmentNumber, '0001')}</strong><br>
        ${formatReportDate(data.assessmentDate)}
      </div>

      <div class="section-title">Customer details:</div>
      <div class="section-content">
        <div class="row"><span class="label">Name:</span> ${withFallback(data.customerName, 'Not provided')}</div>
        <div class="row"><span class="label">Phone:</span> ${withFallback(data.customerPhone, 'Not provided')}</div>
        <div class="row"><span class="label">E-mail:</span> ${withFallback(data.customerEmail, 'Not provided')}</div>
        <div class="row"><span class="label">Insurance Claim Number:</span> ${withFallback(data.claimNumber, 'Not provided')}</div>
      </div>

      <div class="section-title">Device Specifications:</div>
      <div class="section-content">
        <div class="row"><span class="label">Device:</span> ${withFallback(data.deviceModel, 'Not provided')}</div>
        <div class="row"><span class="label">Replacement Value:</span> ${withFallback(data.replacementValue, 'Not provided')}</div>
        <div class="row"><span class="label">Storage:</span> ${withFallback(data.storage, 'Not provided')}</div>
        <div class="row"><span class="label">Serial Number:</span> ${withFallback(data.serialNumber, 'Not provided')}</div>
        <div class="row"><span class="label">IMEI:</span> ${withFallback(data.imei, 'Not provided')}</div>
      </div>

      <div class="section-title">Device Issue / Damage Report:</div>
      <div class="report">
        ${toParagraphs(data.deviceIssue, 'No issue details provided.')}
      </div>
    </div>

    <div class="footer">
      ${footerTextMarkup ? `${footerTextMarkup}<br>` : ''}
      ${footerLogoMarkup}
      ${withFallback(company.website, 'Website not provided')}
    </div>
  </div>

  <div class="page">
    <div class="watermark">
      ${watermarkMarkup}
    </div>

    <div class="header">
      <div class="logo">
        ${headerLogoMarkup}
      </div>

      <div class="company-info">
        ${withFallback(company.addressLine1, 'Address line 1 not provided')}<br>
        ${withFallback(company.addressLine2, 'Address line 2 not provided')}<br>
        Phone: ${withFallback(company.phone, 'Not provided')}<br>
        E-mail: ${withFallback(company.email, 'Not provided')}
      </div>
    </div>

    <div class="page-main">
      <div class="title">Insurance Assessment</div>

      <div class="meta">
        <strong>${escapeHtml(companyName)} Assessment: ${withFallback(data.assessmentNumber, '0001')}</strong><br>
        ${formatReportDate(data.assessmentDate)}
      </div>

      <div class="section-title">Diagnosis of Issues / Damage:</div>
      <div class="report">
        ${toParagraphs(data.diagnosisIssues, 'No diagnosis details provided.')}
      </div>

      <div class="section-title">Repair and or Replacement Recommendations:</div>
      <div class="report">
        ${toParagraphs(data.repairRecommendation, 'No recommendation details provided.')}
      </div>

      <div class="section-content">
        <div class="row"><span class="label">Replacement Device:</span> ${withFallback(data.replacementDevice, 'Not provided')}</div>
        <div class="row"><span class="label">Replacement Value:</span> ${withFallback(data.replacementValue, 'Not provided')}</div>
        <div class="row"><span class="label">Insurance Assessment:</span> ${withFallback(data.damageReportValue, 'Not provided')}</div>
        <div class="row"><span class="label">Total:</span> ${withFallback(data.totalReportValue, 'Not provided')}</div>
        <p><i>All prices include GST, parts, labour, freight, and testing.</i></p>
      </div>
    </div>

    <div class="footer">
      ${footerTextMarkup ? `${footerTextMarkup}<br>` : ''}
      ${footerLogoMarkup}
      ${withFallback(company.website, 'Website not provided')}
    </div>
  </div>

  <div class="page">
    <div class="watermark">
      ${watermarkMarkup}
    </div>

    <div class="header">
      <div class="logo">
        ${headerLogoMarkup}
      </div>

      <div class="company-info">
        ${withFallback(company.addressLine1, 'Address line 1 not provided')}<br>
        ${withFallback(company.addressLine2, 'Address line 2 not provided')}<br>
        Phone: ${withFallback(company.phone, 'Not provided')}<br>
        E-mail: ${withFallback(company.email, 'Not provided')}
      </div>
    </div>

    <div class="page-main">
      <div class="title">Insurance Assessment</div>

      <div class="meta">
        <strong>${escapeHtml(companyName)} Assessment: ${withFallback(data.assessmentNumber, '0001')}</strong><br>
        ${formatReportDate(data.assessmentDate)}
      </div>

      <div class="section-title">Device Photos (If applicable):</div>
      <div class="photos-wrapper">
        ${photosMarkup}
      </div>
    </div>

    <div class="footer">
      ${footerTextMarkup ? `${footerTextMarkup}<br>` : ''}
      ${footerLogoMarkup}
      ${withFallback(company.website, 'Website not provided')}
    </div>
  </div>
</body>
</html>`;
}
