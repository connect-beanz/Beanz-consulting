/* ============================================================
   BEANZ CONSULTING — COOKIE CONSENT BANNER
   Add <script src="/js/cookie-banner.js"></script> before </body>
   ============================================================ */
(function () {
  if (localStorage.getItem('beanz_cookie_consent')) return;

  const style = document.createElement('style');
  style.textContent = `
    #cookie-banner {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: #0a1628; border-top: 1px solid rgba(200,151,62,0.3);
      padding: 1.25rem 0; box-shadow: 0 -8px 32px rgba(0,0,0,0.4);
      transform: translateY(100%); transition: transform 0.4s ease;
    }
    #cookie-banner.visible { transform: translateY(0); }
    .cookie-inner {
      width: min(1200px, 90vw); margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between;
      gap: 2rem; flex-wrap: wrap;
    }
    .cookie-text {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.6;
      flex: 1; min-width: 240px;
    }
    .cookie-text a {
      color: #c8973e; text-decoration: underline;
      text-underline-offset: 3px;
    }
    .cookie-actions { display: flex; gap: 0.75rem; flex-shrink: 0; flex-wrap: wrap; }
    .cookie-btn-accept {
      background: #c8973e; color: #0a1628; border: none;
      padding: 0.55rem 1.4rem; border-radius: 4px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; cursor: pointer; transition: background 0.2s;
    }
    .cookie-btn-accept:hover { background: #d4a84f; }
    .cookie-btn-decline {
      background: transparent; color: rgba(255,255,255,0.4);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 0.55rem 1.4rem; border-radius: 4px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em;
      text-transform: uppercase; cursor: pointer; transition: all 0.2s;
    }
    .cookie-btn-decline:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.6); }
    @media (max-width: 600px) {
      .cookie-inner { flex-direction: column; gap: 1rem; }
      .cookie-actions { width: 100%; }
      .cookie-btn-accept, .cookie-btn-decline { flex: 1; text-align: center; }
    }
  `;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <div class="cookie-inner">
      <p class="cookie-text">
        We use cookies to improve your experience and analyse site usage.
        By clicking <strong style="color:rgba(255,255,255,0.85)">Accept</strong>, you consent to our use of cookies.
        <a href="/privacy-policy.html">Privacy &amp; Cookie Policy →</a>
      </p>
      <div class="cookie-actions">
        <button class="cookie-btn-accept" id="cookieAccept">Accept</button>
        <button class="cookie-btn-decline" id="cookieDecline">Decline</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  setTimeout(() => banner.classList.add('visible'), 600);

  function dismiss(choice) {
    localStorage.setItem('beanz_cookie_consent', choice);
    banner.style.transform = 'translateY(100%)';
    setTimeout(() => banner.remove(), 400);
  }

  document.getElementById('cookieAccept').addEventListener('click', () => dismiss('accepted'));
  document.getElementById('cookieDecline').addEventListener('click', () => dismiss('declined'));
})();
