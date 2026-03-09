/* ============================================================
   BEANZ CONSULTING — OTP FORM VERIFICATION
   Add this script just before </body> in index.html
   ============================================================ */
(function () {

  /* ── Styles injected ─────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    .otp-wrapper { margin-top: 8px; }
    .otp-send-btn {
      width: 100%; padding: 12px; background: transparent;
      border: 1.5px solid #C8973E; color: #C8973E;
      font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
      border-radius: 4px; cursor: pointer; transition: all 0.2s;
    }
    .otp-send-btn:hover { background: #C8973E; color: #0A1628; }
    .otp-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .otp-input-row {
      display: none; gap: 8px; margin-top: 8px;
    }
    .otp-input-row.visible { display: flex; }
    .otp-input {
      flex: 1; padding: 12px; border: 1.5px solid #C8973E;
      border-radius: 4px; font-size: 20px; font-weight: 700;
      letter-spacing: 8px; text-align: center; color: #0A1628;
      background: #fff; outline: none;
    }
    .otp-verify-btn {
      padding: 12px 20px; background: #C8973E; border: none;
      color: #0A1628; font-size: 13px; font-weight: 700;
      border-radius: 4px; cursor: pointer; white-space: nowrap;
      transition: opacity 0.2s;
    }
    .otp-verify-btn:hover { opacity: 0.85; }
    .otp-verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .otp-status {
      font-size: 12px; margin-top: 6px; min-height: 18px;
    }
    .otp-status.error { color: #dc2626; }
    .otp-status.success { color: #16a34a; }
    .otp-status.info { color: #6B7589; }
    .otp-verified-badge {
      display: none; align-items: center; gap: 6px;
      background: #d1fae5; border: 1px solid #6ee7b7;
      border-radius: 4px; padding: 8px 12px; margin-top: 8px;
      font-size: 13px; font-weight: 600; color: #065f46;
    }
    .otp-verified-badge.visible { display: flex; }
    .otp-resend {
      font-size: 12px; color: #C8973E; cursor: pointer;
      background: none; border: none; padding: 0;
      text-decoration: underline; margin-top: 6px;
      display: none;
    }
    .otp-resend.visible { display: inline; }
  `;
  document.head.appendChild(style);

  /* ── OTP state per form ──────────────────────────────────── */
  const state = {
    contact: { token: null, verified: false },
    careers: { token: null, verified: false }
  };

  /* ── Helpers ─────────────────────────────────────────────── */
  function setStatus(el, msg, type) {
    el.textContent = msg;
    el.className = 'otp-status ' + type;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ── Build OTP widget ────────────────────────────────────── */
  function buildOTPWidget(formId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'otp-wrapper';
    wrapper.id = `${formId}-otp-wrapper`;
    wrapper.innerHTML = `
      <button type="button" class="otp-send-btn" id="${formId}-otp-send-btn">
        Verify Email to Continue →
      </button>
      <div class="otp-input-row" id="${formId}-otp-input-row">
        <input type="text" class="otp-input" id="${formId}-otp-input"
          placeholder="000000" maxlength="6" inputmode="numeric"
          autocomplete="one-time-code">
        <button type="button" class="otp-verify-btn" id="${formId}-otp-verify-btn">Verify</button>
      </div>
      <p class="otp-status info" id="${formId}-otp-status"></p>
      <button type="button" class="otp-resend" id="${formId}-otp-resend">Resend code</button>
      <div class="otp-verified-badge" id="${formId}-otp-verified-badge">
        <span>✓</span> <span>Email verified</span>
      </div>
    `;
    return wrapper;
  }

  /* ── Send OTP ────────────────────────────────────────────── */
  async function sendOTP(formId, email) {
    const sendBtn = document.getElementById(`${formId}-otp-send-btn`);
    const statusEl = document.getElementById(`${formId}-otp-status`);
    const inputRow = document.getElementById(`${formId}-otp-input-row`);
    const resendBtn = document.getElementById(`${formId}-otp-resend`);

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    setStatus(statusEl, '', 'info');

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, formType: formId })
      });
      const data = await res.json();

      if (data.success) {
        state[formId].token = data.token;
        sendBtn.style.display = 'none';
        inputRow.classList.add('visible');
        resendBtn.classList.add('visible');
        setStatus(statusEl, `Code sent to ${email}. Check your inbox (and spam folder).`, 'info');
        document.getElementById(`${formId}-otp-input`).focus();
      } else {
        setStatus(statusEl, data.error || 'Failed to send code. Try again.', 'error');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Verify Email to Continue →';
      }
    } catch {
      setStatus(statusEl, 'Network error. Please try again.', 'error');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Verify Email to Continue →';
    }
  }

  /* ── Verify OTP ──────────────────────────────────────────── */
  async function verifyOTP(formId, email) {
    const otp = document.getElementById(`${formId}-otp-input`).value.trim();
    const statusEl = document.getElementById(`${formId}-otp-status`);
    const verifyBtn = document.getElementById(`${formId}-otp-verify-btn`);
    const inputRow = document.getElementById(`${formId}-otp-input-row`);
    const badge = document.getElementById(`${formId}-otp-verified-badge`);
    const resendBtn = document.getElementById(`${formId}-otp-resend`);
    const submitBtn = document.getElementById(`${formId}-submit-btn`);

    if (otp.length !== 6) {
      setStatus(statusEl, 'Please enter the full 6-digit code.', 'error');
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = '…';

    // Stateless verification — check token client-side then let server confirm on submit
    try {
      const { payload, hmac } = JSON.parse(atob(state[formId].token));
      const [tokenEmail, tokenOTP, expiry] = payload.split('|');

      if (Date.now() > parseInt(expiry)) {
        setStatus(statusEl, 'Code has expired. Please request a new one.', 'error');
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify';
        return;
      }
      if (tokenEmail !== email.toLowerCase() || tokenOTP !== otp) {
        setStatus(statusEl, 'Incorrect code. Please try again.', 'error');
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify';
        return;
      }

      // Verified
      state[formId].verified = true;
      inputRow.classList.remove('visible');
      resendBtn.classList.remove('visible');
      badge.classList.add('visible');
      setStatus(statusEl, '', 'info');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    } catch {
      setStatus(statusEl, 'Verification failed. Please refresh and try again.', 'error');
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify';
    }
  }

  /* ══════════════════════════════════════════════════════════
     CONTACT FORM
  ══════════════════════════════════════════════════════════ */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const emailField = form.querySelector('input[type="email"], input[name="email"]');
    if (!emailField) return;

    // Insert OTP widget after email field
    const widget = buildOTPWidget('contact');
    emailField.parentNode.insertAdjacentElement('afterend', widget);

    // Disable submit button until verified
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.id = 'contact-submit-btn';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
    }

    // Send OTP on button click
    document.getElementById('contact-otp-send-btn').addEventListener('click', () => {
      const email = emailField.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus(document.getElementById('contact-otp-status'), 'Please enter a valid email first.', 'error');
        return;
      }
      sendOTP('contact', email);
    });

    // Verify OTP
    document.getElementById('contact-otp-verify-btn').addEventListener('click', () => {
      verifyOTP('contact', emailField.value.trim());
    });
    document.getElementById('contact-otp-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') verifyOTP('contact', emailField.value.trim());
    });

    // Resend
    document.getElementById('contact-otp-resend').addEventListener('click', () => {
      const email = emailField.value.trim();
      document.getElementById('contact-otp-send-btn').style.display = '';
      document.getElementById('contact-otp-send-btn').disabled = false;
      document.getElementById('contact-otp-send-btn').textContent = 'Verify Email to Continue →';
      document.getElementById('contact-otp-input-row').classList.remove('visible');
      document.getElementById('contact-otp-resend').classList.remove('visible');
      sendOTP('contact', email);
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.contact.verified) {
        setStatus(document.getElementById('contact-otp-status'), 'Please verify your email first.', 'error');
        return;
      }

      const submitBtn = document.getElementById('contact-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      const fields = form.querySelectorAll('input, select, textarea');
      const data = { otp: state.contact.token.split('|')[1], token: state.contact.token };

      // Note: we pass the already-stored OTP from token for server re-verification
      const payload = {
        name: form.querySelector('input[name="name"], input[placeholder*="Name"]')?.value || '',
        email: emailField.value.trim(),
        company: form.querySelector('input[name="company"], input[placeholder*="Company"]')?.value || '',
        service: form.querySelector('select')?.value || '',
        message: form.querySelector('textarea')?.value || '',
        otp: JSON.parse(atob(state.contact.token)).payload.split('|')[1],
        token: state.contact.token
      };

      try {
        const res = await fetch('/api/submit-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          form.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
              <div style="font-size:36px;margin-bottom:16px;">✓</div>
              <h3 style="color:#0A1628;margin-bottom:8px;">Message Sent</h3>
              <p style="color:#6B7589;font-size:14px;">Thank you, ${payload.name}. We'll be in touch shortly.</p>
            </div>`;
        } else {
          setStatus(document.getElementById('contact-otp-status'), result.error || 'Submission failed.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message →';
        }
      } catch {
        setStatus(document.getElementById('contact-otp-status'), 'Network error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message →';
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     CAREERS FORM
  ══════════════════════════════════════════════════════════ */
  function initCareersForm() {
    const form = document.getElementById('careers-form');
    if (!form) return;

    const emailField = form.querySelector('input[type="email"], input[name="email"]');
    if (!emailField) return;

    // Insert OTP widget after email field
    const widget = buildOTPWidget('careers');
    emailField.parentNode.insertAdjacentElement('afterend', widget);

    // Disable submit button until verified
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.id = 'careers-submit-btn';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
    }

    document.getElementById('careers-otp-send-btn').addEventListener('click', () => {
      const email = emailField.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus(document.getElementById('careers-otp-status'), 'Please enter a valid email first.', 'error');
        return;
      }
      sendOTP('careers', email);
    });

    document.getElementById('careers-otp-verify-btn').addEventListener('click', () => {
      verifyOTP('careers', emailField.value.trim());
    });
    document.getElementById('careers-otp-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') verifyOTP('careers', emailField.value.trim());
    });

    document.getElementById('careers-otp-resend').addEventListener('click', () => {
      const email = emailField.value.trim();
      document.getElementById('careers-otp-send-btn').style.display = '';
      document.getElementById('careers-otp-send-btn').disabled = false;
      document.getElementById('careers-otp-send-btn').textContent = 'Verify Email to Continue →';
      document.getElementById('careers-otp-input-row').classList.remove('visible');
      document.getElementById('careers-otp-resend').classList.remove('visible');
      sendOTP('careers', email);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.careers.verified) {
        setStatus(document.getElementById('careers-otp-status'), 'Please verify your email first.', 'error');
        return;
      }

      const submitBtn = document.getElementById('careers-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      // Handle file
      const fileInput = form.querySelector('input[type="file"]');
      let resumeBase64 = null;
      let resumeName = null;
      if (fileInput && fileInput.files[0]) {
        try {
          resumeBase64 = await readFileAsBase64(fileInput.files[0]);
          resumeName = fileInput.files[0].name;
        } catch {
          console.warn('Could not read file');
        }
      }

      const nameField = form.querySelector('input[name="name"], input[placeholder*="Name"]');
      const linkedinField = form.querySelector('input[name="linkedin"], input[placeholder*="LinkedIn"]');
      const pitchField = form.querySelector('textarea[name="pitch"], textarea[placeholder*="Pitch"], textarea');
      const interestSelect = form.querySelectorAll('select')[0];
      const experienceSelect = form.querySelectorAll('select')[1];

      const payload = {
        name: nameField?.value || '',
        email: emailField.value.trim(),
        interest: interestSelect?.value || '',
        experience: experienceSelect?.value || '',
        linkedin: linkedinField?.value || '',
        pitch: pitchField?.value || '',
        resume: resumeBase64,
        resumeName,
        otp: JSON.parse(atob(state.careers.token)).payload.split('|')[1],
        token: state.careers.token
      };

      try {
        const res = await fetch('/api/submit-careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          form.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
              <div style="font-size:36px;margin-bottom:16px;">✓</div>
              <h3 style="color:#0A1628;margin-bottom:8px;">Application Received</h3>
              <p style="color:#6B7589;font-size:14px;">Thank you, ${payload.name}. We'll review your application and be in touch if there's a fit.</p>
            </div>`;
        } else {
          setStatus(document.getElementById('careers-otp-status'), result.error || 'Submission failed.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Application →';
        }
      } catch {
        setStatus(document.getElementById('careers-otp-status'), 'Network error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application →';
      }
    });
  }

  /* ── Init ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initContactForm();
    initCareersForm();
  });

})();

