/* ==========================================================================
   blend.com | Frontend Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- Initialize Lucide Icons ---
  lucide.createIcons();

  // --- Socket.io Setup ---
  const socket = io();

  // --- Modern Modal System Helper Functions ---
  function showModalAlert(message, title = 'Notification', type = 'info') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';
      
      let iconHtml = '<i data-lucide="info" class="modal-icon info"></i>';
      if (type === 'error') {
        iconHtml = '<i data-lucide="alert-triangle" class="modal-icon error"></i>';
      } else if (type === 'success') {
        iconHtml = '<i data-lucide="check-circle" class="modal-icon success"></i>';
      }

      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim">
          <div class="modal-header">
            ${iconHtml}
            <h3>${title}</h3>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-primary btn-modal-ok">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      lucide.createIcons();

      const btnOk = overlay.querySelector('.btn-modal-ok');
      btnOk.focus();

      const closeModal = () => {
        overlay.classList.remove('active');
        const modal = overlay.querySelector('.custom-modal');
        if (modal) {
          modal.classList.remove('popup-anim');
          modal.classList.add('popout-anim');
        }
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 150);
      };

      btnOk.addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    });
  }

  function showModalConfirm(message, title = 'Confirmation Required') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';

      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim">
          <div class="modal-header">
            <i data-lucide="help-circle" class="modal-icon confirm"></i>
            <h3>${title}</h3>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer" style="gap: 12px;">
            <button class="btn-secondary btn-modal-cancel">Cancel</button>
            <button class="btn-primary btn-modal-confirm">Confirm</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      lucide.createIcons();

      const btnCancel = overlay.querySelector('.btn-modal-cancel');
      const btnConfirm = overlay.querySelector('.btn-modal-confirm');
      btnConfirm.focus();

      const closeWithResult = (result) => {
        overlay.classList.remove('active');
        const modal = overlay.querySelector('.custom-modal');
        if (modal) {
          modal.classList.remove('popup-anim');
          modal.classList.add('popout-anim');
        }
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 150);
      };

      btnCancel.addEventListener('click', () => closeWithResult(false));
      btnConfirm.addEventListener('click', () => closeWithResult(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeWithResult(false);
      });
    });
  }

  // Helper: Open Guest Login/Signup Modal
  function showGuestAuthModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';

      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim" style="max-width: 380px;">
          <div class="modal-header">
            <i data-lucide="user-check" class="modal-icon info"></i>
            <h3 id="auth-modal-title">Guest Login</h3>
          </div>
          <div class="modal-body">
            <form id="modal-auth-form" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="auth-tabs">
                <button type="button" class="auth-tab-btn active" id="auth-tab-login">Login</button>
                <button type="button" class="auth-tab-btn" id="auth-tab-signup">Sign Up</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <label for="auth-username" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Username</label>
                <div class="input-glow-wrapper">
                  <input type="text" id="auth-username" required placeholder="Enter name..." style="width: 100%; background: transparent; border: none; outline: none; color: var(--text-primary); padding: 8px 12px; font-size: 14px;">
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <label for="auth-password" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Password</label>
                <div class="input-glow-wrapper">
                  <input type="password" id="auth-password" required placeholder="Enter password..." style="width: 100%; background: transparent; border: none; outline: none; color: var(--text-primary); padding: 8px 12px; font-size: 14px;">
                </div>
              </div>
              <div id="auth-error-msg" style="color: var(--accent-pink); font-size: 12px; display: none;"></div>
              <div class="modal-footer" style="margin-top: 8px; gap: 12px; display: flex; width: 100%;">
                <button type="button" class="btn-secondary btn-modal-cancel" style="flex: 1; padding: 10px;">Cancel</button>
                <button type="submit" class="btn-primary btn-modal-submit" style="flex: 1; padding: 10px;">
                  <span id="auth-submit-text">Login</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      lucide.createIcons();

      const form = overlay.querySelector('#modal-auth-form');
      const tabLogin = overlay.querySelector('#auth-tab-login');
      const tabSignup = overlay.querySelector('#auth-tab-signup');
      const title = overlay.querySelector('#auth-modal-title');
      const submitText = overlay.querySelector('#auth-submit-text');
      const usernameInput = overlay.querySelector('#auth-username');
      const passwordInput = overlay.querySelector('#auth-password');
      const errorMsg = overlay.querySelector('#auth-error-msg');
      const btnCancel = overlay.querySelector('.btn-modal-cancel');

      let currentTab = 'login';

      usernameInput.focus();

      tabLogin.addEventListener('click', () => {
        currentTab = 'login';
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        title.textContent = 'Guest Login';
        submitText.textContent = 'Login';
        errorMsg.style.display = 'none';
      });

      tabSignup.addEventListener('click', () => {
        currentTab = 'signup';
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        title.textContent = 'Guest Sign Up';
        submitText.textContent = 'Sign Up';
        errorMsg.style.display = 'none';
      });

      const closeModal = (username) => {
        overlay.classList.remove('active');
        const modal = overlay.querySelector('.custom-modal');
        if (modal) {
          modal.classList.remove('popup-anim');
          modal.classList.add('popout-anim');
        }
        setTimeout(() => {
          overlay.remove();
          resolve(username);
        }, 150);
      };

      btnCancel.addEventListener('click', () => closeModal(null));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(null);
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';

        const uVal = usernameInput.value.trim();
        const pVal = passwordInput.value;

        const endpoint = currentTab === 'login' ? '/api/auth/login' : '/api/auth/signup';
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uVal, password: pVal })
          });

          const data = await res.json();
          if (res.ok) {
            closeModal(data.username);
          } else {
            errorMsg.textContent = data.error || 'Authentication failed.';
            errorMsg.style.display = 'block';
          }
        } catch (err) {
          errorMsg.textContent = 'Network error. Please try again.';
          errorMsg.style.display = 'block';
        }
      });
    });
  }

  // Helper: Open Owner/Admin Login Modal
  function showOwnerAuthModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';

      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim" style="max-width: 380px;">
          <div class="modal-header">
            <i data-lucide="shield-check" class="modal-icon info" style="color: var(--accent-cyan);"></i>
            <h3 id="owner-modal-title">Admin Authentication</h3>
          </div>
          <div class="modal-body">
            <form id="modal-owner-form" style="display: flex; flex-direction: column; gap: 14px;">
              <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">Please enter admin credentials to access Owner Mode.</p>
              
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <label for="owner-username" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Username</label>
                <div class="input-glow-wrapper">
                  <input type="text" id="owner-username" required placeholder="Enter admin username..." style="width: 100%; background: transparent; border: none; outline: none; color: var(--text-primary); padding: 8px 12px; font-size: 14px;">
                </div>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <label for="owner-password" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Password</label>
                <div class="input-glow-wrapper">
                  <input type="password" id="owner-password" required placeholder="Enter password..." style="width: 100%; background: transparent; border: none; outline: none; color: var(--text-primary); padding: 8px 12px; font-size: 14px;">
                </div>
              </div>
              
              <div id="owner-error-msg" style="color: var(--accent-pink); font-size: 12px; display: none;"></div>
              
              <div class="modal-footer" style="margin-top: 8px; gap: 12px; display: flex; width: 100%;">
                <button type="button" class="btn-secondary btn-modal-cancel" style="flex: 1; padding: 10px;">Cancel</button>
                <button type="submit" class="btn-primary btn-modal-submit" style="flex: 1; padding: 10px;">
                  <span>Authenticate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      lucide.createIcons();

      const form = overlay.querySelector('#modal-owner-form');
      const usernameInput = overlay.querySelector('#owner-username');
      const passwordInput = overlay.querySelector('#owner-password');
      const errorMsg = overlay.querySelector('#owner-error-msg');
      const btnCancel = overlay.querySelector('.btn-modal-cancel');

      usernameInput.focus();

      const closeModal = (successResult) => {
        overlay.classList.remove('active');
        const modal = overlay.querySelector('.custom-modal');
        if (modal) {
          modal.classList.remove('popup-anim');
          modal.classList.add('popout-anim');
        }
        setTimeout(() => {
          overlay.remove();
          resolve(successResult);
        }, 150);
      };

      btnCancel.addEventListener('click', () => closeModal(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(false);
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';

        const uVal = usernameInput.value.trim();
        const pVal = passwordInput.value;

        try {
          const res = await fetch('/api/auth/owner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uVal, password: pVal })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            localStorage.setItem('owner_token', data.token);
            closeModal(true);
          } else {
            errorMsg.textContent = data.error || 'Authentication failed.';
            errorMsg.style.display = 'block';
          }
        } catch (err) {
          errorMsg.textContent = 'Network error. Please try again.';
          errorMsg.style.display = 'block';
        }
      });
    });
  }

  // --- State Variables ---
  let savedLinks = [];
  let currentFilter = 'all';
  let activeMediaInfo = null;

  // --- Clock Logic ---
  const clockEl = document.getElementById('live-clock');
  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- Guest vs. Owner Mode Logic ---
  const modeSwitcherFooter = document.getElementById('mode-switcher-footer');
  const avatarTextMode = document.getElementById('avatar-text-mode');
  const userNameMode = document.getElementById('user-name-mode');
  const userRoleMode = document.getElementById('user-role-mode');
  const btnLockMode = document.getElementById('btn-lock-mode');

  let guestUser = localStorage.getItem('guest_user') || null;

  function setAppMode(mode) {
    if (mode === 'owner') {
      document.body.classList.remove('mode-guest', 'mode-guest-auth');
      document.body.classList.add('mode-owner');
      if (avatarTextMode) avatarTextMode.textContent = 'OW';
      if (userNameMode) userNameMode.textContent = 'Node Owner';
      if (userRoleMode) userRoleMode.textContent = 'Owner Mode';
      if (btnLockMode) {
        btnLockMode.innerHTML = '<i data-lucide="unlock" style="width: 16px; height: 16px;"></i>';
      }
      localStorage.setItem('nexus_mode', 'owner');
      document.querySelectorAll('.owner-only').forEach(el => {
        if (el.tagName === 'BUTTON' || el.classList.contains('nav-item')) {
          el.style.display = 'flex';
        } else {
          el.style.display = 'block';
        }
      });
    } else {
      document.body.classList.remove('mode-owner');
      document.body.classList.add('mode-guest');
      
      if (guestUser) {
        document.body.classList.add('mode-guest-auth');
        if (avatarTextMode) avatarTextMode.textContent = guestUser.substring(0, 2).toUpperCase();
        if (userNameMode) userNameMode.textContent = guestUser;
        if (userRoleMode) userRoleMode.textContent = 'Guest (Logged In)';
        if (btnLockMode) {
          btnLockMode.innerHTML = '<i data-lucide="lock" style="width: 16px; height: 16px;"></i>';
        }
      } else {
        document.body.classList.remove('mode-guest-auth');
        if (avatarTextMode) avatarTextMode.textContent = 'G';
        if (userNameMode) userNameMode.textContent = 'Friend Node';
        if (userRoleMode) userRoleMode.textContent = 'Guest Mode';
        if (btnLockMode) {
          btnLockMode.innerHTML = '<i data-lucide="lock" style="width: 16px; height: 16px;"></i>';
        }
      }
      localStorage.setItem('nexus_mode', 'guest');
      document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');

      // Kick user out of downloader or admin view if they switch to guest mode
      const activeView = document.querySelector('.content-view.active');
      if (activeView && (activeView.id === 'view-downloader' || activeView.id === 'view-admin')) {
        switchView('dashboard');
      }
    }

    // Dynamic lock indicators for downloader tool in Guest mode
    const downloaderBtn = document.querySelector('.nav-item[data-view="downloader"]');
    if (downloaderBtn) {
      const existingLock = downloaderBtn.querySelector('.lock-indicator');
      if (existingLock) existingLock.remove();

      if (mode !== 'owner') {
        const lockIcon = document.createElement('i');
        lockIcon.setAttribute('data-lucide', 'lock');
        lockIcon.classList.add('lock-indicator');
        lockIcon.style.cssText = 'margin-left: auto; width: 14px; height: 14px; opacity: 0.6;';
        downloaderBtn.appendChild(lockIcon);
      }
    }

    const downloaderCard = document.querySelector('.dash-card[data-action="go-to-downloader"]');
    if (downloaderCard) {
      const actionText = downloaderCard.querySelector('.card-action-text');
      if (actionText) {
        if (mode !== 'owner') {
          actionText.innerHTML = 'Locked <i data-lucide="lock" style="width: 14px; height: 14px; margin-left: 4px;"></i>';
          downloaderCard.style.opacity = '0.75';
        } else {
          actionText.innerHTML = 'Launch Tool <i data-lucide="arrow-right"></i>';
          downloaderCard.style.opacity = '1';
        }
      }
    }

    lucide.createIcons();
    if (typeof renderBookmarks === 'function') {
      renderBookmarks();
    }
  }

  // Global Fetch Interceptor to handle Session Expiration
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      if (url && !url.includes('/api/auth/owner') && localStorage.getItem('nexus_mode') === 'owner') {
        localStorage.removeItem('owner_token');
        setAppMode('guest');
        showModalAlert('Your admin session has expired or is invalid. Please log in again.', 'Session Expired', 'error');
      }
    }
    return response;
  };

  // (app mode initialized later in DOMContentLoaded to prevent TDZ error)

  // Toggle Mode Click Listener
  if (modeSwitcherFooter) {
    modeSwitcherFooter.addEventListener('click', async (e) => {
      const currentMode = localStorage.getItem('nexus_mode') || 'guest';
      if (currentMode === 'guest') {
        if (guestUser) {
          const action = await showModalConfirm(`Logged in as Guest: "${guestUser}". Do you want to log out?`, 'Guest Logout');
          if (action) {
            guestUser = null;
            localStorage.removeItem('guest_user');
            setAppMode('guest');
            return;
          }
        }

        const authSuccess = await showOwnerAuthModal();
        if (authSuccess) {
          setAppMode('owner');
        }
      } else {
        localStorage.removeItem('owner_token');
        setAppMode('guest');
      }
    });
  }

  // --- Theme Toggle (Dark/Light Mode) ---
  const themeToggle = document.getElementById('theme-toggle');
  let currentTheme = localStorage.getItem('app-theme') || 'dark';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      themeToggle.innerHTML = '<i data-lucide="moon"></i>';
      themeToggle.title = 'Switch to Dark Mode';
    } else {
      document.body.classList.remove('light-theme');
      themeToggle.innerHTML = '<i data-lucide="sun"></i>';
      themeToggle.title = 'Switch to Light Mode';
    }
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    localStorage.setItem('app-theme', theme);
  }

  applyTheme(currentTheme);

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
  });

  // --- Routing (View Switcher) ---
  const navButtons = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.content-view');

  function switchView(viewId) {
    if (viewId === 'downloader' && localStorage.getItem('nexus_mode') !== 'owner') {
      showModalAlert('The Media Downloader is locked in Guest Mode. Please switch to Owner Mode (bottom left) to use this feature.', 'Feature Locked', 'warning');
      return;
    }
    if (viewId === 'admin') {
      const isOwner = localStorage.getItem('nexus_mode') === 'owner';
      const token = localStorage.getItem('owner_token');
      if (!isOwner || !token) {
        showModalAlert('The Admin Portal is locked. Please switch to Owner Mode (bottom left) to use this feature.', 'Feature Locked', 'warning');
        return;
      }
      
      // Reset active admin tab to overview
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      
      const firstTabBtn = document.querySelector('.admin-tab-btn[data-admin-tab="overview"]');
      if (firstTabBtn) firstTabBtn.classList.add('active');
      const firstTabContent = document.getElementById('admin-tab-overview');
      if (firstTabContent) firstTabContent.classList.add('active');
      
      if (typeof loadAdminTab === 'function') {
        loadAdminTab('overview');
      }
    }

    // Send track view action to server
    const currentMode = localStorage.getItem('nexus_mode') || 'guest';
    const activeUser = currentMode === 'owner' ? 'Owner' : (guestUser || 'Guest');
    fetch('/api/track/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewId, username: activeUser })
    }).catch(e => console.error('Failed to track view:', e));

    views.forEach(view => {
      view.classList.remove('active');
    });
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active');

    navButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      }
    });

    // Save active view in localStorage
    localStorage.setItem('active_view', viewId);

    // Refresh icons just in case
    lucide.createIcons();
  }

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const viewId = button.getAttribute('data-view');
      switchView(viewId);
    });
  });

  // Dashboard quick links (cards & buttons)
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.getAttribute('data-action');
      if (action === 'go-to-downloader') switchView('downloader');
      if (action === 'go-to-linksaver') switchView('linksaver');
      if (action === 'go-to-games') switchView('games');
    });
  });

  // --- Media Downloader Logic ---
  const downloaderUrl = document.getElementById('downloader-url');
  const btnFetchInfo = document.getElementById('btn-fetch-info');
  const downloaderSpinner = document.getElementById('downloader-spinner');
  
  const downloaderMetaCard = document.getElementById('downloader-meta-card');
  const mediaThumb = document.getElementById('media-thumb');
  const mediaDuration = document.getElementById('media-duration');
  const mediaTitle = document.getElementById('media-title');
  const mediaUploader = document.getElementById('media-uploader');
  const mediaFormat = document.getElementById('media-format');
  const btnStartDownload = document.getElementById('btn-start-download');

  const downloaderProgressCard = document.getElementById('downloader-progress-card');
  const downloadStatusMsg = document.getElementById('download-status-msg');
  const downloadPercentageText = document.getElementById('download-percentage-text');
  const downloadProgressBar = document.getElementById('download-progress-bar');
  const downloadSpeed = document.getElementById('download-speed');
  const downloadSize = document.getElementById('download-size');
  const downloadEta = document.getElementById('download-eta');

  const downloaderReadyCard = document.getElementById('downloader-ready-card');
  const downloaderReadyTitle = document.getElementById('downloader-ready-title');
  const btnTriggerSave = document.getElementById('btn-trigger-save');
  const btnDownloadAnother = document.getElementById('btn-download-another');

  // Helper: Format duration (seconds -> MM:SS)
  function formatSeconds(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Fetch Media Details
  async function fetchMediaDetails() {
    const urlVal = downloaderUrl.value.trim();
    if (!urlVal) {
      await showModalAlert('Please paste a valid video link first.', 'Input Required', 'info');
      return;
    }

    // Reset visibility
    downloaderMetaCard.classList.add('hidden');
    downloaderProgressCard.classList.add('hidden');
    downloaderReadyCard.classList.add('hidden');
    downloaderSpinner.classList.remove('hidden');
    btnFetchInfo.disabled = true;

    try {
      const response = await fetch(`/api/info?url=${encodeURIComponent(urlVal)}`);
      const data = await response.json();

      downloaderSpinner.classList.add('hidden');
      btnFetchInfo.disabled = false;

      if (data.error) {
        const message = data.details ? `${data.error}\n\nDetails:\n${data.details}` : data.error;
        await showModalAlert(message, 'Error Fetching Media Info', 'error');
        return;
      }

      // Populate details card
      activeMediaInfo = data;
      mediaThumb.src = data.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500';
      mediaDuration.textContent = formatSeconds(data.duration);
      mediaTitle.textContent = data.title;
      mediaUploader.textContent = data.uploader;

      // Populate format choices
      mediaFormat.innerHTML = '';
      data.formats.forEach(f => {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.label;
        mediaFormat.appendChild(option);
      });

      downloaderMetaCard.classList.remove('hidden');
      lucide.createIcons();
    } catch (e) {
      downloaderSpinner.classList.add('hidden');
      btnFetchInfo.disabled = false;
      await showModalAlert('Network error. Failed to retrieve media information.', 'Network Error', 'error');
    }
  }

  btnFetchInfo.addEventListener('click', fetchMediaDetails);
  downloaderUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchMediaDetails();
  });

  // Start Download trigger
  btnStartDownload.addEventListener('click', () => {
    if (!activeMediaInfo) return;

    const selectedFormat = mediaFormat.value;
    downloaderMetaCard.classList.add('hidden');
    downloaderProgressCard.classList.remove('hidden');

    // Reset progress UI
    downloadProgressBar.style.width = '0%';
    downloadPercentageText.textContent = '0%';
    downloadStatusMsg.textContent = 'Initializing download streams...';
    downloadSpeed.textContent = '0.0 MiB/s';
    downloadSize.textContent = '0.00 MiB';
    downloadEta.textContent = '--:--';

    const isOwner = document.body.classList.contains('mode-owner');
    socket.emit('download-request', {
      url: activeMediaInfo.originalUrl,
      format: selectedFormat,
      title: activeMediaInfo.title,
      username: isOwner ? 'Owner' : (guestUser || 'Guest')
    });
  });

  // Socket Receivers: Download progress update
  socket.on('download-progress', (data) => {
    const { percent, size, speed, eta } = data;
    downloadProgressBar.style.width = `${percent}%`;
    downloadPercentageText.textContent = `${percent}%`;
    downloadSpeed.textContent = speed;
    downloadSize.textContent = size;
    downloadEta.textContent = eta;
  });

  // Socket Receivers: Download status updates
  socket.on('download-status', async (data) => {
    const { status, message, token, title } = data;

    if (status === 'starting' || status === 'downloading' || status === 'merging' || status === 'extracting') {
      downloadStatusMsg.textContent = message;
    } else if (status === 'ready') {
      // Complete! Show ready card
      downloaderProgressCard.classList.add('hidden');
      downloaderReadyCard.classList.remove('hidden');
      downloaderReadyTitle.textContent = `"${title}" has been downloaded.`;
      btnTriggerSave.href = `/api/retrieve/${token}`;
      lucide.createIcons();
    } else if (status === 'error') {
      downloaderProgressCard.classList.add('hidden');
      await showModalAlert(message || 'An error occurred during download execution.', 'Download Error', 'error');
      downloaderMetaCard.classList.remove('hidden');
    }
  });

  // Download another click
  btnDownloadAnother.addEventListener('click', () => {
    downloaderUrl.value = '';
    downloaderReadyCard.classList.add('hidden');
    activeMediaInfo = null;
  });


  // --- Link Saver Logic ---
  const linksaverForm = document.getElementById('linksaver-form');
  const toggleLinkFormBtn = document.getElementById('toggle-link-form');
  const linkUrlInput = document.getElementById('link-url');
  const linkTitleInput = document.getElementById('link-title-input');
  const linkCategorySelect = document.getElementById('link-category');
  const linkIconSelect = document.getElementById('link-icon-select');
  const bookmarksContainer = document.getElementById('bookmarks-container');
  const dashboardRecentLinks = document.getElementById('dashboard-recent-links');
  const linksSearch = document.getElementById('links-search');
  const tabButtons = document.querySelectorAll('.tab-btn');
  let editingLinkId = null;
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  // Toggle collapsible form
  toggleLinkFormBtn.addEventListener('click', () => {
    if (editingLinkId) {
      cancelEditBookmark();
      return;
    }
    
    linksaverForm.classList.toggle('hidden');
    const iconContainer = toggleLinkFormBtn.querySelector('.btn-icon-toggle');
    if (iconContainer) {
      if (linksaverForm.classList.contains('hidden')) {
        iconContainer.innerHTML = '<i data-lucide="chevron-down"></i>';
      } else {
        iconContainer.innerHTML = '<i data-lucide="chevron-up"></i>';
      }
      lucide.createIcons();
    }
  });

  // Start editing a bookmark
  function startEditBookmark(id) {
    const bookmark = savedLinks.find(item => item.id === id);
    if (!bookmark) return;

    editingLinkId = id;

    // Populate inputs
    linkUrlInput.value = bookmark.url;
    linkTitleInput.value = bookmark.title;
    linkCategorySelect.value = bookmark.category;
    if (bookmark.favicon && bookmark.favicon.startsWith('letter:')) {
      linkIconSelect.value = 'letter';
    } else if (bookmark.favicon && bookmark.favicon.startsWith('icon:')) {
      linkIconSelect.value = bookmark.favicon;
    } else {
      linkIconSelect.value = 'auto';
    }

    // Update form header
    const formHeaderTitle = toggleLinkFormBtn.querySelector('h2');
    if (formHeaderTitle) {
      formHeaderTitle.innerHTML = '<i data-lucide="edit-2" class="panel-header-icon"></i> Edit Bookmark';
    }

    // Update submit button text
    const saveBtn = document.getElementById('btn-save-bookmark');
    if (saveBtn) {
      saveBtn.querySelector('span').textContent = 'Update Bookmark';
    }

    // Show cancel button
    if (btnCancelEdit) {
      btnCancelEdit.classList.remove('hidden');
    }

    // Expand form if collapsed
    if (linksaverForm.classList.contains('hidden')) {
      linksaverForm.classList.remove('hidden');
      const iconContainer = toggleLinkFormBtn.querySelector('.btn-icon-toggle');
      if (iconContainer) {
        iconContainer.innerHTML = '<i data-lucide="chevron-up"></i>';
      }
    }
    lucide.createIcons();
  }

  // Cancel editing bookmark
  function cancelEditBookmark() {
    editingLinkId = null;

    // Reset inputs
    linkUrlInput.value = '';
    linkTitleInput.value = '';
    linkCategorySelect.value = 'General';
    linkIconSelect.value = 'auto';

    // Reset form header
    const formHeaderTitle = toggleLinkFormBtn.querySelector('h2');
    if (formHeaderTitle) {
      formHeaderTitle.innerHTML = '<i data-lucide="plus-circle" class="panel-header-icon"></i> Save New Bookmark';
    }

    // Reset submit button text
    const saveBtn = document.getElementById('btn-save-bookmark');
    if (saveBtn) {
      saveBtn.querySelector('span').textContent = 'Save Bookmark';
    }

    // Hide cancel button
    if (btnCancelEdit) {
      btnCancelEdit.classList.add('hidden');
    }

    // Collapse form
    if (!linksaverForm.classList.contains('hidden')) {
      linksaverForm.classList.add('hidden');
      const iconContainer = toggleLinkFormBtn.querySelector('.btn-icon-toggle');
      if (iconContainer) {
        iconContainer.innerHTML = '<i data-lucide="chevron-down"></i>';
      }
    }
    lucide.createIcons();
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', cancelEditBookmark);
  }

  // Get link saver categories color classes
  function getCategoryColorClass(cat) {
    if (cat === 'Movies & Shows') return 'tag-movies';
    if (cat === 'Sports') return 'tag-sports';
    if (cat === 'Anime') return 'tag-anime';
    if (cat === 'Games') return 'tag-games';
    if (cat === 'Development') return 'tag-development';
    return 'tag-general';
  }

  function getMonogramGradient(letter) {
    const charCode = letter ? letter.charCodeAt(0) : 63; // 63 is '?'
    const gradients = [
      'linear-gradient(135deg, #06b6d4, #8b5cf6)', // Cyan to Purple
      'linear-gradient(135deg, #ec4899, #8b5cf6)', // Pink to Purple
      'linear-gradient(135deg, #f97316, #ec4899)', // Orange to Pink
      'linear-gradient(135deg, #10b981, #06b6d4)', // Green to Cyan
      'linear-gradient(135deg, #8b5cf6, #3b82f6)', // Purple to Blue
      'linear-gradient(135deg, #f59e0b, #ef4444)', // Amber to Red
    ];
    return gradients[charCode % gradients.length];
  }

  function getFaviconHtml(favicon, title) {
    if (!favicon) {
      const letter = title ? title.charAt(0).toUpperCase() : '?';
      const bg = getMonogramGradient(letter);
      return `<div class="bookmark-favicon monogram-avatar" style="background: ${bg};">${letter}</div>`;
    }

    if (favicon.startsWith('letter:')) {
      const letter = favicon.split(':')[1] || '?';
      const bg = getMonogramGradient(letter);
      return `<div class="bookmark-favicon monogram-avatar" style="background: ${bg};">${letter}</div>`;
    }

    if (favicon.startsWith('icon:')) {
      const iconName = favicon.split(':')[1] || 'globe';
      let iconClass = 'has-icon';
      if (iconName === 'film') iconClass += ' icon-film';
      if (iconName === 'tv-2') iconClass += ' icon-tv';
      if (iconName === 'gamepad-2') iconClass += ' icon-gamepad';
      if (iconName === 'terminal') iconClass += ' icon-terminal';
      if (iconName === 'book-open') iconClass += ' icon-book';
      if (iconName === 'star') iconClass += ' icon-star';

      return `<div class="bookmark-favicon ${iconClass}"><i data-lucide="${iconName}"></i></div>`;
    }

    // Standard URL favicon - Dynamically restore legacy Google s2 URL format for reliability
    let faviconUrl = favicon;
    if (faviconUrl.includes('icons.duckduckgo.com/ip3/')) {
      try {
        const parts = faviconUrl.split('/');
        const filePart = parts[parts.length - 1];
        const domainParam = filePart.replace('.ico', '');
        faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domainParam}`;
      } catch (e) {}
    }

    const fallbackLetter = title ? title.charAt(0).toUpperCase() : '?';
    const fallbackBg = getMonogramGradient(fallbackLetter);
    return `
      <div class="bookmark-favicon">
        <img src="${faviconUrl}" 
             onload="if (this.naturalWidth <= 16 && this.naturalHeight <= 16) { this.style.display='none'; this.parentNode.querySelector('.monogram-avatar').style.display='flex'; }"
             onerror="this.onerror=null; this.style.display='none'; this.parentNode.querySelector('.monogram-avatar').style.display='flex';" 
             alt="">
        <div class="monogram-avatar" style="display:none; width: 100%; height: 100%; align-items: center; justify-content: center; background: ${fallbackBg};">${fallbackLetter}</div>
      </div>
    `;
  }

  function getDomainFirstLetter(targetUrl) {
    try {
      const hostname = new URL(targetUrl).hostname.replace('www.', '');
      return hostname.charAt(0).toUpperCase();
    } catch (e) {
      return 'L';
    }
  }

  // Render bookmarks grouped by category/genre
  function renderBookmarks() {
    const isOwner = document.body.classList.contains('mode-owner');

    // Ensure bookmarks are sorted by sortOrder (ascending) before rendering
    savedLinks.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    let filtered = savedLinks;

    // Filter by tab category
    if (currentFilter !== 'all') {
      filtered = savedLinks.filter(item => item.category === currentFilter);
    }

    // Filter by search text
    const searchVal = linksSearch.value.trim().toLowerCase();
    if (searchVal) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchVal) || 
        item.url.toLowerCase().includes(searchVal) ||
        item.domain.toLowerCase().includes(searchVal)
      );
    }

    // Clear container
    bookmarksContainer.innerHTML = '';

    if (filtered.length === 0) {
      bookmarksContainer.innerHTML = `
        <div class="empty-state-simple">
          <p>No bookmarks found for this selection.</p>
        </div>
      `;
      return;
    }

    // Group bookmarks by category
    const grouped = {};
    filtered.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    // Default category order to keep the rendering order consistent
    const categoryOrder = ['Movies & Shows', 'Sports', 'Anime', 'Games', 'Development', 'General'];
    
    // Add any dynamically created category that's not in the default list
    const finalCategories = [...categoryOrder];
    Object.keys(grouped).forEach(cat => {
      if (!finalCategories.includes(cat)) {
        finalCategories.push(cat);
      }
    });

    // Render each category section
    finalCategories.forEach(cat => {
      const items = grouped[cat];
      if (!items || items.length === 0) return;

      const section = document.createElement('div');
      section.className = 'genre-section';

      // Define header icons and titles based on the category (genre)
      let iconName = 'bookmark';
      let iconClass = 'genre-icon-general';
      let displayTitle = cat;

      if (cat === 'Movies & Shows') {
        iconName = 'film';
        iconClass = 'genre-icon-movies';
        displayTitle = 'Movies & Shows';
      } else if (cat === 'Sports') {
        iconName = 'tv';
        iconClass = 'genre-icon-sports';
        displayTitle = 'Sports Streaming';
      } else if (cat === 'Anime') {
        iconName = 'tv-2';
        iconClass = 'genre-icon-anime';
        displayTitle = 'Anime';
      } else if (cat === 'Games') {
        iconName = 'gamepad-2';
        iconClass = 'genre-icon-games';
        displayTitle = 'Games';
      } else if (cat === 'Development') {
        iconName = 'terminal';
        iconClass = 'genre-icon-development';
        displayTitle = 'Coding & Tools';
      } else if (cat === 'General') {
        iconName = 'bookmark';
        iconClass = 'genre-icon-general';
        displayTitle = 'General Bookmarks';
      } else {
        iconName = 'link-2';
        iconClass = 'genre-icon-general';
      }

      section.innerHTML = `
        <div class="genre-section-header">
          <div class="genre-title-wrapper">
            <div class="genre-icon ${iconClass}">
              <i data-lucide="${iconName}"></i>
            </div>
            <h3>${displayTitle}</h3>
            <span class="genre-count-badge">${items.length}</span>
          </div>
        </div>
        <div class="bookmarks-grid" data-category="${cat}"></div>
      `;

      const grid = section.querySelector('.bookmarks-grid');

      // Set up Sortable on the grid container for admins/owners
      if (isOwner && typeof Sortable !== 'undefined') {
        new Sortable(grid, {
          group: 'bookmarks-shared-group', // Allows dragging between categories
          animation: 250, // smooth shifting transitions (in milliseconds)
          handle: '.drag-handle', // drag only by handle to prevent click/window.open interference
          ghostClass: 'bookmark-ghost',
          chosenClass: 'bookmark-chosen',
          dragClass: 'bookmark-drag-active',
          fallbackOnBody: true,
          swapThreshold: 0.65,
          // When drop is completed
          onEnd: async function (evt) {
            const itemEl = evt.item;
            const toGrid = evt.to;
            const bookmarkId = itemEl.getAttribute('data-id');
            const newCategory = toGrid.getAttribute('data-category');

            // Find siblings to determine new sortOrder float midpoint
            const prevEl = itemEl.previousElementSibling;
            const nextEl = itemEl.nextElementSibling;

            let newSortOrder = 1000;

            if (prevEl && nextEl) {
              const prevOrder = parseFloat(prevEl.getAttribute('data-sort-order'));
              const nextOrder = parseFloat(nextEl.getAttribute('data-sort-order'));
              newSortOrder = (prevOrder + nextOrder) / 2;
            } else if (nextEl) {
              const nextOrder = parseFloat(nextEl.getAttribute('data-sort-order'));
              newSortOrder = nextOrder - 10;
            } else if (prevEl) {
              const prevOrder = parseFloat(prevEl.getAttribute('data-sort-order'));
              newSortOrder = prevOrder + 10;
            }

            // Update attributes on the element itself
            itemEl.setAttribute('data-sort-order', newSortOrder);

            // Update local array state
            const bookmarkIndex = savedLinks.findIndex(b => b.id === bookmarkId);
            if (bookmarkIndex !== -1) {
              savedLinks[bookmarkIndex].category = newCategory;
              savedLinks[bookmarkIndex].sortOrder = newSortOrder;
            }

            try {
              const response = await fetch(`/api/links/${bookmarkId}/reorder`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'x-owner-token': localStorage.getItem('owner_token') || ''
                },
                body: JSON.stringify({
                  category: newCategory,
                  sortOrder: newSortOrder
                })
              });

              if (!response.ok) {
                throw new Error('Failed to update bookmark order on server');
              }

              // Keep locally-sorted structure in sync and refresh UI to update counts/badges
              savedLinks.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
              renderBookmarks();
            } catch (err) {
              console.error('Failed to save bookmark order:', err);
              // Revert state by fetching fresh from the server
              fetchBookmarks();
            }
          }
        });
      }

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bookmark-card' + (item.hiddenByAdmin ? ' admin-hidden' : '');
        card.setAttribute('data-id', item.id);
        card.setAttribute('data-sort-order', item.sortOrder || '0');
        
        const categoryClass = getCategoryColorClass(item.category);
        const faviconHtml = getFaviconHtml(item.favicon, item.title);
        
        const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');
        const canModify = isOwner || (item.addedBy || 'Owner').toLowerCase() === currentUser.toLowerCase();
        
        card.innerHTML = `
          <div class="bookmark-card-top">
            ${faviconHtml}
            <div class="bookmark-info">
              <h4 class="bookmark-title" title="${item.title}">${item.title}</h4>
              <span class="bookmark-domain">${item.domain || 'External Link'}</span>
              <span class="bookmark-added-by">${item.addedBy || 'Owner'}</span>
              ${item.hiddenByAdmin ? '<span class="bookmark-hidden-badge"><i data-lucide="eye-off" style="width:10px;height:10px;"></i> Hidden</span>' : ''}
            </div>
          </div>
          <div class="bookmark-mid">
            <span class="category-tag ${categoryClass}">${item.category}</span>
            <div class="bookmark-actions">
              ${isOwner ? `
              <div class="btn-bookmark-action drag-handle" title="Drag to Reorder" style="cursor: grab;">
                <i data-lucide="grip-vertical"></i>
              </div>
              ` : ''}
              <button class="btn-bookmark-action btn-copy" data-url="${item.url}" title="Copy Link">
                <i data-lucide="copy"></i>
              </button>
              ${isOwner ? `
              <button class="btn-bookmark-action hide-toggle-btn" data-id="${item.id}" data-hidden="${item.hiddenByAdmin ? 'true' : 'false'}" title="${item.hiddenByAdmin ? 'Unhide from guests' : 'Hide from guests'}">
                <i data-lucide="${item.hiddenByAdmin ? 'eye' : 'eye-off'}"></i>
              </button>
              ` : ''}
              ${canModify ? `
              <button class="btn-bookmark-action edit-btn" data-id="${item.id}" title="Edit Bookmark">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="btn-bookmark-action delete" data-id="${item.id}" title="Delete Bookmark">
                <i data-lucide="trash-2"></i>
              </button>
              ` : ''}
            </div>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-bookmark-action')) {
            return;
          }
          window.open(item.url, '_blank', 'noopener,noreferrer');
        });
        
        grid.appendChild(card);
      });

      bookmarksContainer.appendChild(section);
    });

    // Attach clipboard and delete event listeners
    bookmarksContainer.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const urlToCopy = btn.getAttribute('data-url');
        navigator.clipboard.writeText(urlToCopy).then(() => {
          btn.innerHTML = '<i data-lucide="check"></i>';
          btn.style.color = 'var(--accent-green)';
          lucide.createIcons();
          setTimeout(() => {
            btn.innerHTML = '<i data-lucide="copy"></i>';
            btn.style.color = '';
            lucide.createIcons();
          }, 1500);
        });
      });
    });

    bookmarksContainer.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const linkId = btn.getAttribute('data-id');
        startEditBookmark(linkId);
      });
    });

    bookmarksContainer.querySelectorAll('.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const linkId = btn.getAttribute('data-id');
        deleteBookmark(linkId);
      });
    });

    bookmarksContainer.querySelectorAll('.hide-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const linkId = btn.getAttribute('data-id');
        const isCurrentlyHidden = btn.getAttribute('data-hidden') === 'true';
        toggleBookmarkVisibility(linkId, !isCurrentlyHidden);
      });
    });

    lucide.createIcons();
  }

  // Render recent bookmarks preview on Dashboard
  function renderRecentBookmarks() {
    dashboardRecentLinks.innerHTML = '';
    const isOwner = document.body.classList.contains('mode-owner');
    // Filter out admin-hidden bookmarks for non-owners in dashboard preview
    const visibleLinks = isOwner ? savedLinks : savedLinks.filter(item => !item.hiddenByAdmin);
    const recents = visibleLinks.slice(0, 3);

    if (recents.length === 0) {
      dashboardRecentLinks.innerHTML = `
        <div class="empty-state-simple">
          <p>No bookmarks saved yet.</p>
        </div>
      `;
      return;
    }

    recents.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); border-radius: var(--border-radius-md);';
      
      const categoryClass = getCategoryColorClass(item.category);
      const faviconHtml = getFaviconHtml(item.favicon, item.title);

      itemEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          ${faviconHtml}
          <div style="min-width: 0;">
            <p style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); margin-bottom: 2px;">${item.title}</p>
            <span class="category-tag ${categoryClass}">${item.category}</span>
          </div>
        </div>
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="padding: 6px 12px; font-size: 11px;">
          <span>Visit</span>
          <i data-lucide="external-link" style="width: 11px; height: 11px;"></i>
        </a>
      `;
      
      dashboardRecentLinks.appendChild(itemEl);
    });
    
    lucide.createIcons();
  }

  // Fetch bookmarks
  async function fetchBookmarks() {
    try {
      const headers = {};
      const ownerToken = localStorage.getItem('owner_token');
      if (ownerToken) headers['x-owner-token'] = ownerToken;

      const response = await fetch('/api/links', { headers });
      const data = await response.json();
      savedLinks = data;
      
      // Update Dashboard Link Count
      document.getElementById('stat-links-count').textContent = savedLinks.length;
      
      renderBookmarks();
      renderRecentBookmarks();
    } catch (e) {
      console.error('Failed to load bookmarks', e);
    }
  }

  // Add/Update bookmark
  linksaverForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const urlVal = linkUrlInput.value.trim();
    const titleVal = linkTitleInput.value.trim();
    const catVal = linkCategorySelect.value;
    let iconVal = linkIconSelect.value;
    const saveBtn = document.getElementById('btn-save-bookmark');

    const isOwner = document.body.classList.contains('mode-owner');
    if (!isOwner && !guestUser) {
      const username = await showGuestAuthModal();
      if (!username) {
        return;
      }
      guestUser = username;
      localStorage.setItem('guest_user', username);
      setAppMode('guest');
    }

    if (iconVal === 'letter') {
      const firstChar = titleVal ? titleVal.charAt(0) : getDomainFirstLetter(urlVal);
      iconVal = `letter:${firstChar.toUpperCase()}`;
    }

    saveBtn.disabled = true;
    saveBtn.querySelector('span').textContent = editingLinkId ? 'Updating...' : 'Fetching Details...';

    try {
      const addedBy = isOwner ? 'Owner' : (guestUser || 'Guest');

      let response;
      if (editingLinkId) {
        response = await fetch(`/api/links/${editingLinkId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-name': addedBy,
            'x-owner-token': localStorage.getItem('owner_token') || ''
          },
          body: JSON.stringify({ linkUrl: urlVal, category: catVal, customTitle: titleVal, favicon: iconVal, addedBy })
        });
      } else {
        response = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkUrl: urlVal, category: catVal, customTitle: titleVal, favicon: iconVal, addedBy })
        });
      }

      let newLink;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        newLink = await response.json();
      } else {
        const rawText = await response.text();
        throw new Error(rawText || `HTTP ${response.status}: ${response.statusText}`);
      }

      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = editingLinkId ? 'Update Bookmark' : 'Save Bookmark';

      if (newLink.error) {
        await showModalAlert(newLink.error, 'Error Saving Bookmark', 'error');
        return;
      }

      if (editingLinkId) {
        // Update local list array
        const idx = savedLinks.findIndex(item => item.id === editingLinkId);
        if (idx !== -1) {
          savedLinks[idx] = newLink;
        }
        editingLinkId = null;
        
        // Hide cancel button and restore header
        if (btnCancelEdit) btnCancelEdit.classList.add('hidden');
        const formHeaderTitle = toggleLinkFormBtn.querySelector('h2');
        if (formHeaderTitle) {
          formHeaderTitle.innerHTML = '<i data-lucide="plus-circle" class="panel-header-icon"></i> Save New Bookmark';
        }
      } else {
        savedLinks.unshift(newLink);
      }

      document.getElementById('stat-links-count').textContent = savedLinks.length;
      
      linkUrlInput.value = '';
      linkTitleInput.value = '';
      linksaverForm.classList.add('hidden');
      const iconContainer = toggleLinkFormBtn.querySelector('.btn-icon-toggle');
      if (iconContainer) {
        iconContainer.innerHTML = '<i data-lucide="chevron-down"></i>';
        lucide.createIcons();
      }

      renderBookmarks();
      renderRecentBookmarks();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = editingLinkId ? 'Update Bookmark' : 'Save Bookmark';
      console.error('Save bookmark error:', err);
      await showModalAlert(err.message, 'Error Saving Bookmark', 'error');
    }
  });

  // Delete bookmark
  async function deleteBookmark(id) {
    const isOwner = document.body.classList.contains('mode-owner');
    const confirmed = await showModalConfirm('Are you sure you want to remove this bookmark?', 'Delete Bookmark');
    if (!confirmed) return;

    try {
      const isOwner = document.body.classList.contains('mode-owner');
      const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');
      const response = await fetch(`/api/links/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-user-name': currentUser,
          'x-owner-token': localStorage.getItem('owner_token') || ''
        }
      });
      const res = await response.json();
      
      if (res.message) {
        savedLinks = savedLinks.filter(item => item.id !== id);
        document.getElementById('stat-links-count').textContent = savedLinks.length;
        renderBookmarks();
        renderRecentBookmarks();
      } else if (res.error) {
        await showModalAlert(res.error, 'Delete Error', 'error');
      }
    } catch (e) {
      await showModalAlert('Failed to delete bookmark.', 'Delete Error', 'error');
    }
  }

  // Toggle bookmark visibility (admin hide/unhide)
  async function toggleBookmarkVisibility(id, hide) {
    try {
      const response = await fetch(`/api/links/${id}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': localStorage.getItem('owner_token') || ''
        },
        body: JSON.stringify({ hidden: hide })
      });
      const result = await response.json();

      if (result.error) {
        await showModalAlert(result.error, 'Visibility Error', 'error');
        return;
      }

      // Update local array
      const idx = savedLinks.findIndex(item => item.id === id);
      if (idx !== -1) {
        savedLinks[idx] = result;
      }

      renderBookmarks();
      renderRecentBookmarks();
    } catch (e) {
      console.error('Toggle visibility error:', e);
      await showModalAlert('Failed to update bookmark visibility.', 'Visibility Error', 'error');
    }
  }

  // Category filter tabs action
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderBookmarks();
    });
  });

  // Live search inputs
  linksSearch.addEventListener('input', renderBookmarks);




  // --- Game Zone Logic: Tic-Tac-Toe ---
  const gamesListView = document.getElementById('games-list-view');
  const gameTictactoeView = document.getElementById('game-tictactoe-view');
  const btnBackToArcade = document.getElementById('btn-back-to-arcade');

  const tttBoard = document.getElementById('ttt-board');
  const tttCells = document.querySelectorAll('.ttt-cell');
  const tttTurnEl = document.getElementById('ttt-turn');
  const btnResetGame = document.getElementById('btn-reset-game');
  const btnClearScore = document.getElementById('btn-clear-score');
  
  const scoreXEl = document.getElementById('score-x');
  const scoreOEl = document.getElementById('score-o');
  const scoreOLabel = document.getElementById('score-o-label');
  const scoreTiesEl = document.getElementById('score-ties');

  const modeButtons = document.querySelectorAll('.btn-mode');
  const diffButtons = document.querySelectorAll('.btn-diff');
  const cpuDiffRow = document.getElementById('cpu-diff-row');

  // Tic-Tac-Toe State
  let tttState = ['', '', '', '', '', '', '', '', ''];
  let currentTurn = 'X'; // X starts
  let gameActive = true;
  let gameMode = 'ai'; // 'ai' or 'friend'
  let cpuDifficulty = 'easy'; // 'easy' or 'hard'
  let scores = { X: 0, O: 0, ties: 0 };

  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];

  // Open Game Interface
  document.querySelector('[data-game="tictactoe"]').addEventListener('click', () => {
    gamesListView.classList.add('hidden');
    gameTictactoeView.classList.remove('hidden');
    localStorage.setItem('active_game', 'tictactoe');
    resetGame();
  });

  btnBackToArcade.addEventListener('click', () => {
    gameTictactoeView.classList.add('hidden');
    gamesListView.classList.remove('hidden');
    localStorage.removeItem('active_game');
  });

  // Switch Game Mode
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameMode = btn.getAttribute('data-mode');
      
      if (gameMode === 'ai') {
        cpuDiffRow.classList.remove('hidden');
        scoreOLabel.textContent = 'CPU (O)';
        scoreOLabel.className = 'score-label glow-pink';
      } else {
        cpuDiffRow.classList.add('hidden');
        scoreOLabel.textContent = 'Player (O)';
        scoreOLabel.className = 'score-label glow-pink';
      }
      resetGame();
    });
  });

  // Switch Difficulty
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cpuDifficulty = btn.getAttribute('data-diff');
      resetGame();
    });
  });

  // Make Cell move
  function handleCellClick(e) {
    const clickedCell = e.target;
    const clickedIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (tttState[clickedIndex] !== '' || !gameActive) return;

    makeMove(clickedIndex, currentTurn);
    
    // Check results
    if (checkResults()) return;

    // Switch turns
    switchTurn();

    // AI Move
    if (gameMode === 'ai' && currentTurn === 'O' && gameActive) {
      disableBoard(true);
      setTimeout(() => {
        const aiMoveIndex = getBestMove();
        makeMove(aiMoveIndex, 'O');
        checkResults();
        switchTurn();
        disableBoard(false);
      }, 550);
    }
  }

  function makeMove(index, player) {
    tttState[index] = player;
    const cell = tttCells[index];
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
  }

  function switchTurn() {
    currentTurn = currentTurn === 'X' ? 'O' : 'X';
    tttTurnEl.textContent = currentTurn;
    if (currentTurn === 'X') {
      tttTurnEl.className = 'glow-cyan';
    } else {
      tttTurnEl.className = 'glow-pink';
    }
  }

  function disableBoard(disable) {
    tttCells.forEach(cell => {
      if (disable) {
        cell.style.pointerEvents = 'none';
      } else {
        cell.style.pointerEvents = '';
      }
    });
  }

  function checkResults() {
    let roundWon = false;
    let winningPattern = null;

    for (let i = 0; i < winPatterns.length; i++) {
      const winPattern = winPatterns[i];
      const a = tttState[winPattern[0]];
      const b = tttState[winPattern[1]];
      const c = tttState[winPattern[2]];

      if (a === '' || b === '' || c === '') continue;

      if (a === b && b === c) {
        roundWon = true;
        winningPattern = winPattern;
        break;
      }
    }

    if (roundWon) {
      gameActive = false;
      // Highlight winning cells
      winningPattern.forEach(idx => tttCells[idx].classList.add('winner'));
      
      const winner = tttState[winningPattern[0]];
      scores[winner]++;
      updateScoreboard();
      tttTurnEl.textContent = `${winner} Wins!`;
      tttTurnEl.className = winner === 'X' ? 'glow-cyan' : 'glow-pink';
      return true;
    }

    // Check tie
    const roundDraw = !tttState.includes('');
    if (roundDraw) {
      gameActive = false;
      scores.ties++;
      updateScoreboard();
      tttTurnEl.textContent = "It's a Tie!";
      tttTurnEl.className = '';
      return true;
    }

    return false;
  }

  function updateScoreboard() {
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    scoreTiesEl.textContent = scores.ties;
  }

  function resetGame() {
    tttState = ['', '', '', '', '', '', '', '', ''];
    currentTurn = 'X';
    gameActive = true;
    
    tttTurnEl.textContent = 'X';
    tttTurnEl.className = 'glow-cyan';

    tttCells.forEach(cell => {
      cell.textContent = '';
      cell.className = 'ttt-cell';
      cell.style.pointerEvents = '';
    });
  }

  function clearScores() {
    scores = { X: 0, O: 0, ties: 0 };
    updateScoreboard();
    resetGame();
  }

  btnResetGame.addEventListener('click', resetGame);
  btnClearScore.addEventListener('click', clearScores);
  tttCells.forEach(cell => cell.addEventListener('click', handleCellClick));

  // --- MINIMAX AI Implementation ---
  function getBestMove() {
    if (cpuDifficulty === 'easy') {
      // Random choice
      const available = [];
      tttState.forEach((val, idx) => {
        if (val === '') available.push(idx);
      });
      return available[Math.floor(Math.random() * available.length)];
    }

    // Hard Mode - Minimax with Alpha-Beta Pruning or pure minimax
    let bestScore = -Infinity;
    let move = null;

    for (let i = 0; i < 9; i++) {
      if (tttState[i] === '') {
        tttState[i] = 'O'; // CPU makes test move
        let score = minimax(tttState, 0, false);
        tttState[i] = ''; // undo test move
        
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }

  // Minimax scoring
  const scoresMap = {
    O: 10,  // CPU wants to maximize
    X: -10, // Player wants to minimize
    tie: 0
  };

  function checkWinState(board) {
    for (let i = 0; i < winPatterns.length; i++) {
      const pattern = winPatterns[i];
      if (board[pattern[0]] !== '' &&
          board[pattern[0]] === board[pattern[1]] &&
          board[pattern[1]] === board[pattern[2]]) {
        return board[pattern[0]];
      }
    }
    if (!board.includes('')) return 'tie';
    return null;
  }

  function minimax(board, depth, isMaximizing) {
    let result = checkWinState(board);
    if (result !== null) {
      return scoresMap[result] - (isMaximizing ? depth : -depth); // Prefer faster wins
    }

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
          board[i] = 'O';
          let score = minimax(board, depth + 1, false);
          board[i] = '';
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
          board[i] = 'X';
          let score = minimax(board, depth + 1, true);
          board[i] = '';
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }

  // ==========================================================================
  // Game Zone Logic: Chor Dakat Babu Police (CDBP)
  // ==========================================================================
  const cdbpGameView = document.getElementById('game-cdbp-view');
  const btnCdbpBackToArcade = document.getElementById('btn-cdbp-back-to-arcade');
  
  // Lobby Panels
  const cdbplobbySetup = document.getElementById('cdbp-lobby-setup');
  const cdbplobbyWaiting = document.getElementById('cdbp-lobby-waiting');
  const cdbpActiveGame = document.getElementById('cdbp-active-game');
  
  // Lobby Setup Inputs/Buttons
  const cdbpPlayerNameCreate = document.getElementById('cdbp-player-name-create');
  const cdbpPlayerNameJoin = document.getElementById('cdbp-player-name-join');
  const cdbpRoomCodeInput = document.getElementById('cdbp-room-code-input');
  const btnCdbpCreateRoom = document.getElementById('btn-cdbp-create-room');
  const btnCdbpJoinRoom = document.getElementById('btn-cdbp-join-room');

  // Waiting Room elements
  const cdbpDisplayCode = document.getElementById('cdbp-display-code');
  const cdbpDisplayHost = document.getElementById('cdbp-display-host');
  const cdbpPlayerCount = document.getElementById('cdbp-player-count');
  const cdbpLobbyPlayersContainer = document.getElementById('cdbp-lobby-players-container');
  const btnCdbpCopyCode = document.getElementById('btn-cdbp-copy-code');
  const btnCdbpStartMatch = document.getElementById('btn-cdbp-start-match');
  const cdbpHostWarning = document.getElementById('cdbp-host-warning');
  
  // Extra Roles elements
  const cdbpExtraRolesPanel = document.getElementById('cdbp-extra-roles-panel');
  const btnCdbpRolesInfo = document.getElementById('btn-cdbp-roles-info');
  const cdbpExtraRolesNeededCount = document.getElementById('cdbp-extra-roles-needed-count');
  const cdbpRoleSpy = document.getElementById('cdbp-role-spy');
  const cdbpRoleDetective = document.getElementById('cdbp-role-detective');
  const cdbpRoleJadukar = document.getElementById('cdbp-role-jadukar');
  const cdbpLabelSpy = document.getElementById('cdbp-label-spy');
  const cdbpLabelDetective = document.getElementById('cdbp-label-detective');
  const cdbpLabelJadukar = document.getElementById('cdbp-label-jadukar');

  // Active HUD elements
  const cdbpHudPhase = document.getElementById('cdbp-hud-phase');
  const cdbpHudTimer = document.getElementById('cdbp-hud-timer');
  const cdbpGamePlayersList = document.getElementById('cdbp-game-players-list');
  const cdbpMyRoleCard = document.getElementById('cdbp-my-role-card');
  const cdbpMyRoleName = document.getElementById('cdbp-my-role-name');
  const cdbpMyRoleDesc = document.getElementById('cdbp-my-role-desc');
  const cdbpMyRoleIconBox = document.getElementById('cdbp-my-role-icon-box');

  // Phase containers
  const phaseRoleAssign = document.getElementById('phase-role-assign');
  const phaseJadukarSwap = document.getElementById('phase-jadukar-swap');
  const phaseInfoPhase = document.getElementById('phase-info-phase');
  const phaseDiscussion = document.getElementById('phase-discussion');
  const phasePoliceDecision = document.getElementById('phase-police-decision');
  const phaseReveal = document.getElementById('phase-reveal');

  // Clue details
  const cdbpDetectiveClueBox = document.getElementById('cdbp-detective-clue-box');
  const cdbpDetectiveClueText = document.getElementById('cdbp-detective-clue-text');
  const cdbpSpyInfoBox = document.getElementById('cdbp-spy-info-box');
  const cdbpSpyInfoText = document.getElementById('cdbp-spy-info-text');
  const cdbpGenericInfoBox = document.getElementById('cdbp-generic-info-box');

  // Chat elements
  const cdbpChatLogs = document.getElementById('cdbp-chat-logs');
  const cdbpChatForm = document.getElementById('cdbp-chat-form');
  const cdbpChatInput = document.getElementById('cdbp-chat-input');

  // Jadukar Selectors
  const cdbpJadukarPanel = document.getElementById('cdbp-jadukar-panel');
  const cdbpNonJadukarPanel = document.getElementById('cdbp-non-jadukar-panel');
  const cdbpSwapP1 = document.getElementById('cdbp-swap-p1');
  const cdbpSwapP2 = document.getElementById('cdbp-swap-p2');
  const btnCdbpExecuteSwap = document.getElementById('btn-cdbp-execute-swap');

  // Police Selectors
  const cdbpPolicePanel = document.getElementById('cdbp-police-panel');
  const cdbpNonPolicePanel = document.getElementById('cdbp-non-police-panel');
  const cdbpGuessChor = document.getElementById('cdbp-guess-chor');
  const cdbpGuessDakat = document.getElementById('cdbp-guess-dakat');
  const btnCdbpSubmitGuess = document.getElementById('btn-cdbp-submit-guess');

  // Police Quick Vote Selectors
  const cdbpPoliceQuickVoteBox = document.getElementById('cdbp-police-quick-vote');
  const cdbpQuickGuessChor = document.getElementById('cdbp-quick-guess-chor');
  const cdbpQuickGuessDakat = document.getElementById('cdbp-quick-guess-dakat');
  const btnCdbpQuickSubmitGuess = document.getElementById('btn-cdbp-quick-submit-guess');

  // Reveal UI elements
  const cdbpOutcomeBanner = document.getElementById('cdbp-outcome-banner');
  const cdbpOutcomeTitle = document.getElementById('cdbp-outcome-title');
  const cdbpOutcomeDesc = document.getElementById('cdbp-outcome-desc');
  const cdbpRevealGuessChor = document.getElementById('cdbp-reveal-guess-chor');
  const cdbpRevealGuessDakat = document.getElementById('cdbp-reveal-guess-dakat');
  const cdbpRevealSwapsBox = document.getElementById('cdbp-reveal-swaps-box');
  const cdbpRevealSwapsText = document.getElementById('cdbp-reveal-swaps-text');
  const cdbpRevealRolesList = document.getElementById('cdbp-reveal-roles-list');
  const cdbpRevealScoreboard = document.getElementById('cdbp-reveal-scoreboard');
  const btnCdbpNextRound = document.getElementById('btn-cdbp-next-round');
  const cdbpNextRoundWaitingMsg = document.getElementById('cdbp-next-round-waiting-msg');

  // CDBP Client State
  let cdbpRoomId = null;
  let cdbpMyName = '';
  let cdbpIsHost = false;
  let cdbpPlayersList = [];
  let cdbpMyRole = '';
  let cdbpTargetRole = 'Both';
  let cdbpRoundNum = 1;

  // Reset lobby UI views
  function resetCdbpUI() {
    cdbplobbySetup.classList.remove('hidden');
    cdbplobbyWaiting.classList.add('hidden');
    cdbpActiveGame.classList.add('hidden');
    cdbpRoomId = null;
    cdbpMyName = '';
    cdbpIsHost = false;
    cdbpPlayersList = [];
    cdbpMyRole = '';
    cdbpTargetRole = 'Both';
    cdbpRoundNum = 1;
  }

  // Open Game Menu Routing
  document.querySelector('[data-game="cdbp"]').addEventListener('click', () => {
    gamesListView.classList.add('hidden');
    cdbpGameView.classList.remove('hidden');
    localStorage.setItem('active_game', 'cdbp');
    resetCdbpUI();

    const savedRoomId = localStorage.getItem('cdbp_saved_room_id');
    const savedPlayerName = localStorage.getItem('cdbp_saved_player_name');
    if (savedRoomId && savedPlayerName) {
      document.getElementById('cdbp-rejoin-room-code').textContent = savedRoomId;
      document.getElementById('cdbp-rejoin-player-name').textContent = savedPlayerName;
      document.getElementById('cdbp-rejoin-panel').style.display = 'block';
      document.getElementById('cdbp-lobby-forms').style.display = 'none';
    } else {
      document.getElementById('cdbp-rejoin-panel').style.display = 'none';
      document.getElementById('cdbp-lobby-forms').style.display = 'grid';
    }
  });

  // Resume / New Game for CDBP
  document.getElementById('btn-cdbp-rejoin').addEventListener('click', () => {
    const savedRoomId = localStorage.getItem('cdbp_saved_room_id');
    const savedPlayerName = localStorage.getItem('cdbp_saved_player_name');
    if (savedRoomId && savedPlayerName) {
      socket.emit('cdbp-join', { roomId: savedRoomId, playerName: savedPlayerName }, (response) => {
        if (response && response.success) {
          cdbpMyName = savedPlayerName;
          cdbpRoomId = response.roomId;
          cdbpIsHost = response.roomState.players.find(p => p.name === savedPlayerName)?.isHost || false;

          sessionStorage.setItem('cdbp_room_id', response.roomId);
          sessionStorage.setItem('cdbp_player_name', savedPlayerName);
          sessionStorage.setItem('cdbp_active', 'true');

          localStorage.setItem('cdbp_saved_active', 'true');

          document.getElementById('cdbp-rejoin-panel').style.display = 'none';
          document.getElementById('cdbp-lobby-forms').style.display = 'grid';

          transitionToLobby(response.roomState);
        } else {
          showModalAlert(response?.error || 'Failed to rejoin room', 'Rejoin Error', 'error');
          localStorage.removeItem('cdbp_saved_room_id');
          localStorage.removeItem('cdbp_saved_player_name');
          localStorage.removeItem('cdbp_saved_active');
          document.getElementById('cdbp-rejoin-panel').style.display = 'none';
          document.getElementById('cdbp-lobby-forms').style.display = 'grid';
          resetCdbpUI();
        }
      });
    }
  });

  document.getElementById('btn-cdbp-clear-session').addEventListener('click', () => {
    localStorage.removeItem('cdbp_saved_room_id');
    localStorage.removeItem('cdbp_saved_player_name');
    localStorage.removeItem('cdbp_saved_active');

    sessionStorage.removeItem('cdbp_room_id');
    sessionStorage.removeItem('cdbp_player_name');
    sessionStorage.removeItem('cdbp_active');

    document.getElementById('cdbp-rejoin-panel').style.display = 'none';
    document.getElementById('cdbp-lobby-forms').style.display = 'grid';
    resetCdbpUI();
  });

  btnCdbpBackToArcade.addEventListener('click', () => {
    cdbpGameView.classList.add('hidden');
    gamesListView.classList.remove('hidden');
    localStorage.removeItem('active_game');
    sessionStorage.removeItem('cdbp_room_id');
    sessionStorage.removeItem('cdbp_player_name');
    sessionStorage.removeItem('cdbp_active');
  });

  // Action: Create Room
  btnCdbpCreateRoom.addEventListener('click', async () => {
    const name = cdbpPlayerNameCreate.value.trim();
    if (!name) {
      await showModalAlert('Please enter your name.', 'Input Required', 'info');
      return;
    }

    socket.emit('cdbp-create', { playerName: name }, async (response) => {
      if (response.error) {
        await showModalAlert(response.error, 'Game Error', 'error');
        return;
      }
      cdbpMyName = name;
      cdbpRoomId = response.roomId;
      cdbpIsHost = true;
      sessionStorage.setItem('cdbp_room_id', response.roomId);
      sessionStorage.setItem('cdbp_player_name', name);
      sessionStorage.setItem('cdbp_active', 'true');

      localStorage.setItem('cdbp_saved_room_id', response.roomId);
      localStorage.setItem('cdbp_saved_player_name', name);
      localStorage.setItem('cdbp_saved_active', 'true');

      transitionToLobby(response.roomState);
    });
  });

  // Action: Join Room
  btnCdbpJoinRoom.addEventListener('click', async () => {
    const name = cdbpPlayerNameJoin.value.trim();
    const code = cdbpRoomCodeInput.value.trim().toUpperCase();

    if (!name) {
      await showModalAlert('Please enter your name.', 'Input Required', 'info');
      return;
    }
    if (!code || code.length !== 4) {
      await showModalAlert('Please enter a valid 4-character room code.', 'Input Required', 'info');
      return;
    }

    socket.emit('cdbp-join', { roomId: code, playerName: name }, async (response) => {
      if (response.error) {
        await showModalAlert(response.error, 'Game Error', 'error');
        return;
      }
      cdbpMyName = name;
      cdbpRoomId = response.roomId;
      cdbpIsHost = response.roomState.players.find(p => p.name === name)?.isHost || false;
      sessionStorage.setItem('cdbp_room_id', response.roomId);
      sessionStorage.setItem('cdbp_player_name', name);
      sessionStorage.setItem('cdbp_active', 'true');

      localStorage.setItem('cdbp_saved_room_id', response.roomId);
      localStorage.setItem('cdbp_saved_player_name', name);
      localStorage.setItem('cdbp_saved_active', 'true');

      transitionToLobby(response.roomState);
    });
  });

  // Transition to Waiting Lobby UI
  function transitionToLobby(roomState) {
    cdbplobbySetup.classList.add('hidden');
    cdbplobbyWaiting.classList.remove('hidden');
    cdbpActiveGame.classList.add('hidden');
    
    cdbpDisplayCode.textContent = roomState.roomId;
    updateLobbyPlayersList(roomState.players, roomState.selectedExtraRoles || [], roomState);
  }

  // Copy Room Code
  btnCdbpCopyCode.addEventListener('click', () => {
    if (!cdbpRoomId) return;
    navigator.clipboard.writeText(cdbpRoomId).then(() => {
      btnCdbpCopyCode.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i>';
      btnCdbpCopyCode.style.color = 'var(--accent-green)';
      btnCdbpCopyCode.style.borderColor = 'var(--accent-green)';
      lucide.createIcons();
      setTimeout(() => {
        btnCdbpCopyCode.innerHTML = '<i data-lucide="copy" style="width: 14px; height: 14px;"></i>';
        btnCdbpCopyCode.style.color = '';
        btnCdbpCopyCode.style.borderColor = '';
        lucide.createIcons();
      }, 1500);
    });
  });

  // Action: Host Starts Match
  btnCdbpStartMatch.addEventListener('click', async () => {
    socket.emit('cdbp-start-game', async (response) => {
      if (response.error) {
        await showModalAlert(response.error, 'Game Error', 'error');
      }
    });
  });

  // Emit extra roles selection to server
  function emitExtraRolesUpdate() {
    if (!cdbpIsHost) return;
    const selectedExtraRoles = [];
    if (cdbpRoleSpy.checked) selectedExtraRoles.push('Spy');
    if (cdbpRoleDetective.checked) selectedExtraRoles.push('Detective');
    if (cdbpRoleJadukar.checked) selectedExtraRoles.push('Jadukar');

    socket.emit('cdbp-update-extra-roles', { selectedExtraRoles });
  }

  cdbpRoleSpy.addEventListener('change', emitExtraRolesUpdate);
  cdbpRoleDetective.addEventListener('change', emitExtraRolesUpdate);
  cdbpRoleJadukar.addEventListener('change', emitExtraRolesUpdate);

  btnCdbpRolesInfo.addEventListener('click', async () => {
    const infoText = `
      <div style="text-align: left; display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
        <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
          <strong style="color: var(--accent-pink); font-size: 14px;">🕵️ Spy</strong>
          <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary); line-height: 1.4;">Knows who the Dakat (Robber) is right from the start. Must guide the Police without revealing their own identity, as they want the criminals to win to get points.</p>
        </div>
        <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
          <strong style="color: var(--accent-cyan); font-size: 14px;">🔍 Detective</strong>
          <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary); line-height: 1.4;">Receives clues showing which players are innocent (NOT Chor/Dakat). Gets points if the Police makes the correct guess.</p>
        </div>
        <div>
          <strong style="color: var(--accent-purple); font-size: 14px;">🧙 Jadukar (Wizard)</strong>
          <p style="margin-top: 4px; font-size: 12px; color: var(--text-secondary); line-height: 1.4;">Can swap the roles of any two players at the start of the round, creating chaos! Receives points automatically.</p>
        </div>
      </div>
    `;
    await showModalAlert(infoText, 'Optional Roles Guide', 'info');
  });

  // Action: Execute Jadukar Swap
  btnCdbpExecuteSwap.addEventListener('click', async () => {
    const p1 = cdbpSwapP1.value;
    const p2 = cdbpSwapP2.value;
    if (p1 === p2) {
      await showModalAlert('Please select two different players to swap roles.', 'Invalid Selection', 'error');
      return;
    }

    btnCdbpExecuteSwap.disabled = true;
    socket.emit('cdbp-jadukar-swap', { player1Name: p1, player2Name: p2 }, async (response) => {
      btnCdbpExecuteSwap.disabled = false;
      if (response.error) {
        await showModalAlert(response.error, 'Game Error', 'error');
      }
    });
  });

  // Action: Submit Police Guesses
  btnCdbpSubmitGuess.addEventListener('click', async () => {
    const chor = cdbpGuessChor.value;
    const dakat = cdbpGuessDakat.value;
    if (cdbpTargetRole === 'Both' && chor === dakat) {
      await showModalAlert('Suspects for Chor and Dakat must be different players.', 'Invalid Selection', 'error');
      return;
    }

    btnCdbpSubmitGuess.disabled = true;
    socket.emit('cdbp-police-decision', { chorPlayerName: chor, dakatPlayerName: dakat }, async (response) => {
      btnCdbpSubmitGuess.disabled = false;
      if (response.error) {
        await showModalAlert(response.error, 'Game Error', 'error');
      }
    });
  });

  // Action: Submit Police Quick Guesses (Early)
  btnCdbpQuickSubmitGuess.addEventListener('click', async () => {
    const chor = cdbpQuickGuessChor.value;
    const dakat = cdbpQuickGuessDakat.value;
    if (cdbpTargetRole === 'Both' && chor === dakat) {
      await showModalAlert('Suspects for Chor and Dakat must be different players.', 'Invalid Selection', 'error');
      return;
    }

    btnCdbpQuickSubmitGuess.disabled = true;
    socket.emit('cdbp-police-decision', { chorPlayerName: chor, dakatPlayerName: dakat }, async (response) => {
      btnCdbpQuickSubmitGuess.disabled = false;
      if (response.error) {
        await showModalAlert(response.error, 'Game Error', 'error');
      }
    });
  });

  // Action: Start Next Round (Host)
  btnCdbpNextRound.addEventListener('click', async () => {
    socket.emit('cdbp-next-round', async (response) => {
      if (response.error) {
        await showModalAlert(response.error, 'Game Error', 'error');
      }
    });
  });

  // Chat message submit
  cdbpChatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = cdbpChatInput.value.trim();
    if (!text) return;

    socket.emit('cdbp-chat-message', text);
    cdbpChatInput.value = '';
  });

  // Render Lobby Players Chips list
  function updateLobbyPlayersList(players, selectedExtraRoles = [], roomState = null) {
    cdbpPlayersList = players;
    cdbpDisplayHost.textContent = players.find(p => p.isHost)?.name || 'Unknown';
    cdbpPlayerCount.textContent = players.length;

    // Check if current client is host
    const selfPlayer = players.find(p => p.name === cdbpMyName);
    cdbpIsHost = selfPlayer ? selfPlayer.isHost : false;

    cdbpLobbyPlayersContainer.innerHTML = '';
    players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      
      chip.innerHTML = `
        <div class="player-chip-left">
          <span class="player-status-dot ${p.connected ? 'online' : 'offline'}"></span>
          <span class="player-chip-name">${p.name} ${p.name === cdbpMyName ? '(You)' : ''}</span>
        </div>
        ${p.isHost ? '<span class="host-badge">Host</span>' : ''}
      `;
      
      cdbpLobbyPlayersContainer.appendChild(chip);
    });

    // Update Extra Roles choices UI
    const count = players.length;
    const needed = count - 4;

    if (count >= 4) {
      cdbpExtraRolesPanel.classList.remove('hidden');
      cdbpExtraRolesNeededCount.textContent = `(Select ${needed > 0 ? needed : 0})`;

      // Auto-correct role counts on the host client to avoid invalid start states
      if (cdbpIsHost) {
        let desiredExtraRoles = [...selectedExtraRoles];
        if (needed <= 0) {
          if (desiredExtraRoles.length > 0) {
            desiredExtraRoles = [];
            socket.emit('cdbp-update-extra-roles', { selectedExtraRoles: desiredExtraRoles });
          }
        } else if (needed === 3) {
          if (desiredExtraRoles.length !== 3) {
            desiredExtraRoles = ['Spy', 'Detective', 'Jadukar'];
            socket.emit('cdbp-update-extra-roles', { selectedExtraRoles: desiredExtraRoles });
          }
        } else {
          // needed is 1 or 2
          if (desiredExtraRoles.length !== needed) {
            desiredExtraRoles = ['Spy', 'Detective', 'Jadukar'].slice(0, needed);
            socket.emit('cdbp-update-extra-roles', { selectedExtraRoles: desiredExtraRoles });
          }
        }
      }

      // Check/uncheck role checkboxes based on server state
      cdbpRoleSpy.checked = selectedExtraRoles.includes('Spy');
      cdbpRoleDetective.checked = selectedExtraRoles.includes('Detective');
      cdbpRoleJadukar.checked = selectedExtraRoles.includes('Jadukar');

      // Enable/disable checkboxes based on host permissions and fixed configurations
      const forceDisable = !cdbpIsHost || needed <= 0 || needed === 3;
      if (forceDisable) {
        cdbpRoleSpy.setAttribute('disabled', 'true');
        cdbpRoleDetective.setAttribute('disabled', 'true');
        cdbpRoleJadukar.setAttribute('disabled', 'true');
        cdbpLabelSpy.classList.add('disabled');
        cdbpLabelDetective.classList.add('disabled');
        cdbpLabelJadukar.classList.add('disabled');
      } else {
        cdbpRoleSpy.removeAttribute('disabled');
        cdbpRoleDetective.removeAttribute('disabled');
        cdbpRoleJadukar.removeAttribute('disabled');
        cdbpLabelSpy.classList.remove('disabled');
        cdbpLabelDetective.classList.remove('disabled');
        cdbpLabelJadukar.classList.remove('disabled');
      }
    } else {
      cdbpExtraRolesPanel.classList.add('hidden');
    }

    // Handle Start Match button permissions
    if (cdbpIsHost) {
      btnCdbpStartMatch.classList.remove('hidden');
      const hasCorrectExtraRoles = (selectedExtraRoles.length === needed);
      
      if (players.length >= 4 && players.length <= 7 && hasCorrectExtraRoles) {
        btnCdbpStartMatch.removeAttribute('disabled');
        cdbpHostWarning.textContent = 'All set! Start the match when ready.';
        cdbpHostWarning.style.color = 'var(--accent-green)';
      } else {
        btnCdbpStartMatch.setAttribute('disabled', 'true');
        if (players.length < 4 || players.length > 7) {
          cdbpHostWarning.textContent = 'Lobby needs between 4 and 7 players to start.';
        } else {
          cdbpHostWarning.textContent = `Select exactly ${needed} extra role(s) to start.`;
        }
        cdbpHostWarning.style.color = 'var(--text-muted)';
      }
    } else {
      btnCdbpStartMatch.classList.add('hidden');
      const rolesText = selectedExtraRoles.length > 0 ? `Active: ${selectedExtraRoles.join(', ')}` : 'No active extra roles.';
      cdbpHostWarning.textContent = `Waiting for the host... [${rolesText}]`;
      cdbpHostWarning.style.color = 'var(--text-muted)';
    }

    lucide.createIcons();
  }

  // --- Sockets Listeners ---

  // Socket: Update Room (connected players & statuses)
  socket.on('cdbp-room-updated', (roomState) => {
    if (!cdbpRoomId) return; // Ignore if not in a CDBP session

    cdbpPlayersList = roomState.players;
    cdbpTargetRole = roomState.targetRole || 'Both';
    cdbpRoundNum = roomState.roundNum || 1;

    if (roomState.status === 'LOBBY') {
      transitionToLobby(roomState);
    } else {
      // Game in progress, update active HUD sidebar
      cdbplobbySetup.classList.add('hidden');
      cdbplobbyWaiting.classList.add('hidden');
      cdbpActiveGame.classList.remove('hidden');

      // Update HUD sidebar players status list
      cdbpGamePlayersList.innerHTML = '';
      roomState.players.forEach(p => {
        const row = document.createElement('div');
        row.className = `player-game-row ${p.name === cdbpMyName ? 'self' : ''}`;
        
        let roleBadge = '';
        if (p.role !== 'Hidden') {
          const badgeClass = p.role === 'Babu' ? 'tag-babu' : (p.role === 'Police' ? 'tag-police' : 'tag-hidden-role');
          roleBadge = `<span class="player-game-role-tag ${badgeClass}">${p.role}</span>`;
        } else {
          roleBadge = `<span class="player-game-role-tag tag-hidden-role">Hidden</span>`;
        }

        row.innerHTML = `
          <div class="player-game-row-left">
            <span class="player-status-dot ${p.connected ? 'online' : 'offline'}" style="width:6px; height:6px;"></span>
            <span class="player-game-name" title="${p.name}">${p.name} ${p.name === cdbpMyName ? '(You)' : ''}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="player-game-points">${p.points} pts</span>
            ${roleBadge}
          </div>
        `;
        
        cdbpGamePlayersList.appendChild(row);
      });
    }
    lucide.createIcons();
  });

  // Socket: Phase Changes & Secret Dispatches
  socket.on('cdbp-phase-changed', (phaseData) => {
    const { status, timer, myRole, detectiveClue, spyInfo, reveal, targetRole, roundNum } = phaseData;
    cdbpMyRole = myRole;
    if (targetRole) cdbpTargetRole = targetRole;
    if (roundNum) cdbpRoundNum = roundNum;

    // Update HUD phase indicators
    cdbpHudPhase.textContent = status.replace('_', ' ');
    cdbpHudTimer.textContent = timer < 10 ? `0${timer}` : timer;

    // Hide all phase panels
    phaseRoleAssign.classList.add('hidden');
    phaseJadukarSwap.classList.add('hidden');
    phaseInfoPhase.classList.add('hidden');
    phaseDiscussion.classList.add('hidden');
    phasePoliceDecision.classList.add('hidden');
    phaseReveal.classList.add('hidden');
    cdbpPoliceQuickVoteBox.classList.add('hidden');

    // Populate and show active phase view
    switch (status) {
      case 'ROLE_ASSIGN':
        phaseRoleAssign.classList.remove('hidden');
        break;

      case 'JADUKAR_SWAP':
        phaseJadukarSwap.classList.remove('hidden');
        if (myRole === 'Jadukar') {
          cdbpJadukarPanel.classList.remove('hidden');
          cdbpNonJadukarPanel.classList.add('hidden');
          btnCdbpExecuteSwap.removeAttribute('disabled');
          
          // Populate selectors
          populatePlayerSelectors(cdbpSwapP1, cdbpSwapP2);
        } else {
          cdbpJadukarPanel.classList.add('hidden');
          cdbpNonJadukarPanel.classList.remove('hidden');
        }
        break;

      case 'INFO_PHASE':
        phaseInfoPhase.classList.remove('hidden');
        
        // Hide info boxes initially
        cdbpDetectiveClueBox.classList.add('hidden');
        cdbpSpyInfoBox.classList.add('hidden');
        cdbpGenericInfoBox.classList.add('hidden');

        if (myRole === 'Spy' && spyInfo) {
          cdbpSpyInfoBox.classList.remove('hidden');
          cdbpSpyInfoText.textContent = spyInfo;
        } else if (myRole === 'Detective' && detectiveClue) {
          cdbpDetectiveClueBox.classList.remove('hidden');
          cdbpDetectiveClueText.textContent = detectiveClue;
        } else {
          cdbpGenericInfoBox.classList.remove('hidden');
        }
        break;

      case 'DISCUSSION':
        phaseDiscussion.classList.remove('hidden');
        // Clear chat log if starting fresh discussion
        cdbpChatLogs.innerHTML = '';
        appendSystemMessage('Discussion phase started! Accuse suspects, bluff, and defend your positions.');
        cdbpChatInput.focus();

        if (myRole === 'Police') {
          cdbpPoliceQuickVoteBox.classList.remove('hidden');
          btnCdbpQuickSubmitGuess.removeAttribute('disabled');
          populatePlayerSelectors(cdbpQuickGuessChor, cdbpQuickGuessDakat);

          const chorGroup = document.getElementById('cdbp-quick-guess-chor-group');
          const dakatGroup = document.getElementById('cdbp-quick-guess-dakat-group');
          if (chorGroup && dakatGroup) {
            if (cdbpTargetRole === 'Chor') {
              chorGroup.classList.remove('hidden');
              dakatGroup.classList.add('hidden');
            } else if (cdbpTargetRole === 'Dakat') {
              chorGroup.classList.add('hidden');
              dakatGroup.classList.remove('hidden');
            } else {
              chorGroup.classList.remove('hidden');
              dakatGroup.classList.remove('hidden');
            }
          }
        } else {
          cdbpPoliceQuickVoteBox.classList.add('hidden');
        }
        break;

      case 'POLICE_DECISION':
        phasePoliceDecision.classList.remove('hidden');
        if (myRole === 'Police') {
          cdbpPolicePanel.classList.remove('hidden');
          cdbpNonPolicePanel.classList.add('hidden');
          btnCdbpSubmitGuess.removeAttribute('disabled');

          // Populate Chor/Dakat suspects selector
          populatePlayerSelectors(cdbpGuessChor, cdbpGuessDakat);

          // Update titles & descriptions dynamically
          const panelTitle = document.getElementById('cdbp-police-panel-title');
          const panelDesc = document.getElementById('cdbp-police-panel-desc');
          
          // Show/hide based on targetRole
          const chorGroup = document.getElementById('cdbp-guess-chor-group');
          const dakatGroup = document.getElementById('cdbp-guess-dakat-group');
          
          if (chorGroup && dakatGroup) {
            if (cdbpTargetRole === 'Chor') {
              chorGroup.classList.remove('hidden');
              dakatGroup.classList.add('hidden');
              if (panelTitle) panelTitle.textContent = 'Identify the CHOR';
              if (panelDesc) panelDesc.textContent = 'For a 4-5 player game, this round you only need to identify the Chor (Thief).';
            } else if (cdbpTargetRole === 'Dakat') {
              chorGroup.classList.add('hidden');
              dakatGroup.classList.remove('hidden');
              if (panelTitle) panelTitle.textContent = 'Identify the DAKAT';
              if (panelDesc) panelDesc.textContent = 'For a 4-5 player game, this round you only need to identify the Dakat (Dacoit).';
            } else {
              chorGroup.classList.remove('hidden');
              dakatGroup.classList.remove('hidden');
              if (panelTitle) panelTitle.textContent = 'Select the Suspects';
              if (panelDesc) panelDesc.textContent = 'You must identify BOTH the Chor and the Dakat to win. Examine the discussion evidence carefully.';
            }
          }
        } else {
          cdbpPolicePanel.classList.add('hidden');
          cdbpNonPolicePanel.classList.remove('hidden');

          const deliberatingText = document.getElementById('cdbp-police-deliberating-text');
          if (deliberatingText) {
            if (cdbpTargetRole === 'Chor') {
              deliberatingText.textContent = 'The Police is currently selecting the suspect for Chor. Prepare for the final reveal!';
            } else if (cdbpTargetRole === 'Dakat') {
              deliberatingText.textContent = 'The Police is currently selecting the suspect for Dakat. Prepare for the final reveal!';
            } else {
              deliberatingText.textContent = 'The Police is currently selecting suspects for Chor and Dakat. Prepare for the final reveal!';
            }
          }
        }
        break;

      case 'REVEAL':
      case 'SCORING':
        phaseReveal.classList.remove('hidden');
        if (reveal) {
          renderRevealSummary(reveal);
        }
        break;
    }

    // Render My Role Card details
    updateSecretRoleCard(myRole);
    lucide.createIcons();
  });

  // Socket: Time Updates
  socket.on('cdbp-timer-update', (timeLeft) => {
    cdbpHudTimer.textContent = timeLeft < 10 ? `0${timeLeft}` : timeLeft;
  });

  // Socket: Discussion Messages
  socket.on('cdbp-chat-message', (msg) => {
    const isSelf = msg.sender === cdbpMyName;
    const bubble = document.createElement('div');
    bubble.className = `chat-message ${isSelf ? 'self' : 'other'}`;
    
    bubble.innerHTML = `
      <span class="chat-msg-sender">${msg.sender}</span>
      <p>${msg.text}</p>
    `;

    cdbpChatLogs.appendChild(bubble);
    cdbpChatLogs.scrollTop = cdbpChatLogs.scrollHeight; // Auto scroll
  });

  // Helper: Populate selectors with other player names
  function populatePlayerSelectors(sel1, sel2) {
    sel1.innerHTML = '';
    sel2.innerHTML = '';

    const otherPlayers = cdbpPlayersList.filter(p => p.name !== cdbpMyName);

    otherPlayers.forEach((p, idx) => {
      const opt1 = document.createElement('option');
      opt1.value = p.name;
      opt1.textContent = p.name;
      
      const opt2 = document.createElement('option');
      opt2.value = p.name;
      opt2.textContent = p.name;

      sel1.appendChild(opt1);
      sel2.appendChild(opt2);
    });

    // Offset second selector index so they don't select the same item by default
    if (sel2.options.length > 1) {
      sel2.selectedIndex = 1;
    }
  }

  // Helper: Add status text in chat logs
  function appendSystemMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-message system';
    msg.textContent = text;
    cdbpChatLogs.appendChild(msg);
  }

  // Helper: Render Secret Role Card elements
  const roleDescriptions = {
    Babu: 'You are a gentleman. You are revealed immediately. You receive +1000 points automatically every round!',
    Police: 'You must guess the identity of BOTH the Chor and the Dakat. Work with the Detective, but watch out for the Spy.',
    Chor: 'You are the Thief. Hide among the players, bluff in discussion, and escape the Police guesses to win points.',
    Dakat: 'You are the Dacoit. A high-value criminal. Bluff aggressively and avoid the Police. Wins +700 points if you survive.',
    Spy: 'You secretly know who the Dakat is. Mislead discussion using persuasion, but do not blow your cover. Wins points if criminals escape.',
    Detective: 'You receive a private clue about innocence at the start of the round. Guide the Police without making it obvious.',
    Jadukar: 'You are the Magician. You secretly swap the roles of two players at start, causing chaotic scoring outcomes.'
  };

  const roleIcons = {
    Babu: 'user',
    Police: 'shield',
    Chor: 'spy', // fallback
    Dakat: 'skull',
    Spy: 'eye-off',
    Detective: 'search',
    Jadukar: 'wand'
  };

  function updateSecretRoleCard(role) {
    cdbpMyRoleCard.className = `secret-role-card role-${role.toLowerCase()}`;
    cdbpMyRoleName.textContent = role;
    cdbpMyRoleDesc.textContent = roleDescriptions[role] || '';

    // Swap icons dynamically
    cdbpMyRoleIconBox.innerHTML = '';
    let iconName = roleIcons[role] || 'user';
    if (role === 'Chor') iconName = 'user-round-search';
    if (role === 'Spy') iconName = 'eye-off';
    
    const iconEl = document.createElement('i');
    iconEl.setAttribute('data-lucide', iconName);
    cdbpMyRoleIconBox.appendChild(iconEl);

    lucide.createIcons();
  }

  // Helper: Render Reveal & Scoreboard Summary
  function renderRevealSummary(revealData) {
    const { guesses, swapLogs, actualRoles, targetRole } = revealData;
    const currentTargetRole = targetRole || cdbpTargetRole || 'Both';

    // Check if guess is correct
    const actualChor = actualRoles.find(r => r.role === 'Chor');
    const actualDakat = actualRoles.find(r => r.role === 'Dakat');

    const correctChor = guesses.chor === actualChor?.name;
    const correctDakat = guesses.dakat === actualDakat?.name;
    
    let isSuccess = false;
    if (currentTargetRole === 'Chor') {
      isSuccess = correctChor;
    } else if (currentTargetRole === 'Dakat') {
      isSuccess = correctDakat;
    } else {
      isSuccess = correctChor && correctDakat;
    }

    // 1. Setup outcome banner
    cdbpOutcomeBanner.className = `outcome-banner ${isSuccess ? 'success' : 'fail'}`;
    cdbpOutcomeTitle.textContent = isSuccess ? 'POLICE VICTORY' : 'CRIMINALS ESCAPED';
    cdbpOutcomeDesc.textContent = isSuccess 
      ? (currentTargetRole === 'Chor' ? 'The Police successfully arrested the Chor!' : (currentTargetRole === 'Dakat' ? 'The Police successfully arrested the Dakat!' : 'The Police successfully arrested both the Chor and the Dakat!'))
      : (currentTargetRole === 'Chor' ? 'The Chor successfully bluffed and evaded arrest!' : (currentTargetRole === 'Dakat' ? 'The Dakat successfully bluffed and evaded arrest!' : 'The criminals successfully bluffed and evaded arrest!'));

    // 2. Populate guesses
    cdbpRevealGuessChor.textContent = guesses.chor || 'None';
    cdbpRevealGuessChor.className = correctChor ? 'glow-cyan' : 'glow-pink';
    cdbpRevealGuessDakat.textContent = guesses.dakat || 'None';
    cdbpRevealGuessDakat.className = correctDakat ? 'glow-cyan' : 'glow-pink';

    const revealChorRow = document.getElementById('cdbp-reveal-guess-chor-row');
    const revealDakatRow = document.getElementById('cdbp-reveal-guess-dakat-row');
    const revealDivider = document.getElementById('cdbp-reveal-guess-divider');

    if (revealChorRow && revealDakatRow && revealDivider) {
      if (currentTargetRole === 'Chor') {
        revealChorRow.classList.remove('hidden');
        revealDakatRow.classList.add('hidden');
        revealDivider.classList.add('hidden');
      } else if (currentTargetRole === 'Dakat') {
        revealChorRow.classList.add('hidden');
        revealDakatRow.classList.remove('hidden');
        revealDivider.classList.add('hidden');
      } else {
        revealChorRow.classList.remove('hidden');
        revealDakatRow.classList.remove('hidden');
        revealDivider.classList.remove('hidden');
      }
    }

    // 3. Populate swaps
    if (swapLogs && swapLogs.length > 0) {
      cdbpRevealSwapsBox.classList.remove('hidden');
      cdbpRevealSwapsText.innerHTML = swapLogs.map(log => 
        `Jadukar swapped <span class="glow-purple">${log.p1}</span> and <span class="glow-purple">${log.p2}</span>.`
      ).join('<br>');
    } else {
      cdbpRevealSwapsBox.classList.add('hidden');
    }

    // 4. Render actual role chart
    cdbpRevealRolesList.innerHTML = '';
    actualRoles.forEach(r => {
      const row = document.createElement('div');
      row.className = 'reveal-role-row';

      const wasSwapped = r.role !== r.initialRole;
      const initialTag = wasSwapped ? `<span class="initial-role-text">${r.initialRole}</span>` : '';
      
      const badgeClass = r.role === 'Babu' ? 'tag-babu' : (r.role === 'Police' ? 'tag-police' : 'tag-hidden-role');

      row.innerHTML = `
        <span class="reveal-role-row-left">${r.name}</span>
        <div class="reveal-role-row-right">
          ${initialTag}
          <span class="player-game-role-tag ${badgeClass}">${r.role}</span>
        </div>
      `;
      cdbpRevealRolesList.appendChild(row);
    });

    // 5. Render scoreboard points
    cdbpRevealScoreboard.innerHTML = '';
    // Sort players list by points desc
    const sortedPlayers = [...cdbpPlayersList].sort((a, b) => b.points - a.points);
    sortedPlayers.forEach(p => {
      const row = document.createElement('div');
      row.className = 'score-grid-row';
      row.innerHTML = `
        <span class="score-grid-name">${p.name}</span>
        <span class="score-grid-val">${p.points} pts</span>
      `;
      cdbpRevealScoreboard.appendChild(row);
    });

    // 6. Host actions next round
    const selfPlayer = cdbpPlayersList.find(p => p.name === cdbpMyName);
    const selfIsHost = selfPlayer ? selfPlayer.isHost : false;

    if (selfIsHost) {
      btnCdbpNextRound.classList.remove('hidden');
      btnCdbpNextRound.style.display = 'inline-flex';
      cdbpNextRoundWaitingMsg.classList.add('hidden');
    } else {
      btnCdbpNextRound.classList.add('hidden');
      btnCdbpNextRound.style.display = 'none';
      cdbpNextRoundWaitingMsg.classList.remove('hidden');
    }

    lucide.createIcons();
  }




  // ==========================================================================
  // Game Zone Logic: Who's the Worst? (WTW)
  // ==========================================================================

  const wtwGameView       = document.getElementById('game-wtw-view');
  const btnWtwBack        = document.getElementById('btn-wtw-back-to-arcade');

  // Screens
  const wtwLobbySetup     = document.getElementById('wtw-lobby-setup');
  const wtwLobbyWaiting   = document.getElementById('wtw-lobby-waiting');
  const wtwQuestionPhase  = document.getElementById('wtw-question-phase');
  const wtwVotingPhase    = document.getElementById('wtw-voting-phase');
  const wtwQuestionResults= document.getElementById('wtw-question-results');
  const wtwFinalScores    = document.getElementById('wtw-final-scores');
  const wtwAllScreens     = [wtwLobbySetup, wtwLobbyWaiting, wtwQuestionPhase, wtwVotingPhase, wtwQuestionResults, wtwFinalScores];

  // Lobby setup inputs
  const wtwNameCreate     = document.getElementById('wtw-name-create');
  const wtwNameJoin       = document.getElementById('wtw-name-join');
  const wtwRoomCodeInput  = document.getElementById('wtw-room-code-input');
  const btnWtwCreateRoom  = document.getElementById('btn-wtw-create-room');
  const btnWtwJoinRoom    = document.getElementById('btn-wtw-join-room');

  // Waiting room
  const wtwDisplayCode      = document.getElementById('wtw-display-code');
  const wtwPlayerCount      = document.getElementById('wtw-player-count');
  const wtwLobbyPlayersList = document.getElementById('wtw-lobby-players-list');
  const btnWtwCopyCode      = document.getElementById('btn-wtw-copy-code');
  const wtwHostWarning      = document.getElementById('wtw-host-warning');
  const wtwSettingsControls = document.getElementById('wtw-settings-controls');
  const wtwSettingsReadonly = document.getElementById('wtw-settings-readonly');
  const btnWtwStartGame     = document.getElementById('btn-wtw-start-game');
  const wtwWaitingForHost   = document.getElementById('wtw-waiting-for-host-msg');

  // Question phase
  const wtwQTimer           = document.getElementById('wtw-q-timer');
  const wtwQInputsContainer = document.getElementById('wtw-question-inputs-container');
  const wtwQSubmittedCount  = document.getElementById('wtw-q-submitted-count');
  const btnWtwSubmitQs      = document.getElementById('btn-wtw-submit-questions');
  const wtwQPlayersStatus   = document.getElementById('wtw-q-players-status');

  // Voting phase
  const wtwVTimer           = document.getElementById('wtw-v-timer');
  const wtwVoteQProgress    = document.getElementById('wtw-vote-q-progress');
  const wtwQuestionNumber   = document.getElementById('wtw-question-number');
  const wtwQuestionText     = document.getElementById('wtw-question-text');
  const wtwVoteButtons      = document.getElementById('wtw-vote-buttons');
  const wtwLiveResults      = document.getElementById('wtw-live-results');
  const wtwLiveBars         = document.getElementById('wtw-live-bars');
  const btnWtwSkipVoting    = document.getElementById('btn-wtw-skip-voting');

  // Question results
  const wtwRTimer           = document.getElementById('wtw-r-timer');
  const wtwResultQuestionText = document.getElementById('wtw-result-question-text');
  const wtwResultBars       = document.getElementById('wtw-result-bars');

  // Final scores
  const wtwFinalLeaderboard = document.getElementById('wtw-final-leaderboard');
  const btnWtwPlayAgain     = document.getElementById('btn-wtw-play-again');
  const wtwPlayAgainWait    = document.getElementById('wtw-play-again-wait');

  // ── WTW Client State ────────────────────────────────────────────────────────
  let wtwRoomId       = null;
  let wtwMyName       = '';
  let wtwMyId         = socket.id;
  let wtwIsHost       = false;
  let wtwRoomState    = null;
  let wtwHasVoted     = false;
  let wtwVotedForId   = null;
  let wtwSubmittedQs  = 0; // how many questions this client has submitted this round

  // ── Helper: deterministic avatar gradient generator ─────────────────────
  function wtwGetAvatarStyle(name) {
    const gradients = [
      'linear-gradient(135deg, #f97316, #ea580c)', // orange
      'linear-gradient(135deg, #3b82f6, #1d4ed8)', // blue
      'linear-gradient(135deg, #10b981, #047857)', // green
      'linear-gradient(135deg, #8b5cf6, #6d28d9)', // purple
      'linear-gradient(135deg, #ec4899, #be185d)', // pink
      'linear-gradient(135deg, #06b6d4, #0891b2)', // cyan
      'linear-gradient(135deg, #f59e0b, #b45309)', // amber
      'linear-gradient(135deg, #f43f5e, #be123c)', // rose
      'linear-gradient(135deg, #14b8a6, #0f766e)'  // teal
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    const gradient = gradients[sum % gradients.length];
    return `background: ${gradient}; border: 1px solid rgba(255,255,255,0.15); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2);`;
  }

  // ── Helper: show one screen ──────────────────────────────────────────────
  function wtwShowScreen(screen) {
    wtwAllScreens.forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
  }

  // ── Helper: render vote percentage bars ─────────────────────────────────
  function wtwRenderBars(container, players, voteCounts) {
    if (!voteCounts) { container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No votes yet.</p>'; return; }
    const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
    container.innerHTML = '';
    
    // Sort by count desc
    const sorted = [...players].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));
    
    // Determine the max votes to highlight the "worst"
    const maxVotes = sorted.length > 0 ? (voteCounts[sorted[0].id] || 0) : 0;

    sorted.forEach(p => {
      const count = voteCounts[p.id] || 0;
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const isMax = count > 0 && count === maxVotes;
      const row = document.createElement('div');
      row.className = 'wtw-bar-row' + (isMax ? ' worst-highlight' : '');
      row.innerHTML = `
        <span class="wtw-bar-name" title="${p.name}">${p.name}</span>
        <div class="wtw-bar-track"><div class="wtw-bar-fill" style="width:0%"></div></div>
        <span class="wtw-bar-pct">${pct}%<span class="wtw-bar-count">(${count})</span></span>
      `;
      container.appendChild(row);
      // Animate after paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const fill = row.querySelector('.wtw-bar-fill');
          if (fill) fill.style.width = pct + '%';
        });
      });
    });
  }

  // ── Helper: render waiting lobby player list ─────────────────────────────
  function wtwRenderLobbyPlayers(players) {
    wtwLobbyPlayersList.innerHTML = '';
    players.forEach(p => {
      const row = document.createElement('div');
      row.className = 'wtw-player-lobby-row' + (p.connected ? '' : ' disconnected');
      row.innerHTML = `
        <div class="wtw-avatar" style="${wtwGetAvatarStyle(p.name)}">${p.name.substring(0, 2).toUpperCase()}</div>
        <span>${p.name}</span>
        ${p.isHost ? '<span class="wtw-host-badge">HOST</span>' : ''}
      `;
      wtwLobbyPlayersList.appendChild(row);
    });
  }

  // ── Helper: render question phase submission chips ───────────────────────
  function wtwRenderQPlayerStatus(players) {
    wtwQPlayersStatus.innerHTML = '';
    players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'wtw-status-chip' + (p.hasSubmittedQuestion ? ' done' : '');
      chip.innerHTML = `
        <i data-lucide="${p.hasSubmittedQuestion ? 'check' : 'clock'}"></i>
        <span>${p.name}</span>
      `;
      wtwQPlayersStatus.appendChild(chip);
    });
    lucide.createIcons();
  }

  // ── Helper: render vote buttons ─────────────────────────────────────────
  function wtwRenderVoteButtons(players) {
    wtwVoteButtons.innerHTML = '';
    players.forEach(p => {
      if (p.id === socket.id) return; // no self-voting
      const btn = document.createElement('button');
      btn.className = 'wtw-vote-btn' + (wtwVotedForId === p.id ? ' voted' : '');
      btn.dataset.pid = p.id;
      btn.disabled = wtwHasVoted;
      btn.innerHTML = `
        <div class="wtw-vote-btn-avatar" style="${wtwGetAvatarStyle(p.name)}">${p.name.substring(0, 2).toUpperCase()}</div>
        <span>${p.name}</span>
      `;
      btn.addEventListener('click', () => {
        if (wtwHasVoted) return;
        socket.emit('wtw-submit-vote', { voteeId: p.id }, (res) => {
          if (res && res.error) {
            showModalAlert(res.error, 'Vote Error', 'error');
          } else {
            wtwHasVoted = true;
            wtwVotedForId = p.id;
            wtwRenderVoteButtons(wtwRoomState ? wtwRoomState.players : []);
          }
        });
      });
      wtwVoteButtons.appendChild(btn);
    });
  }

  // ── Helper: render final verdict (question cards) ───────────────────────
  function wtwRenderLeaderboard(players) {
    wtwFinalLeaderboard.innerHTML = '';
    
    if (!wtwRoomState || !wtwRoomState.questions || wtwRoomState.questions.length === 0) {
      wtwFinalLeaderboard.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No questions played.</p>';
      return;
    }
    
    wtwRoomState.questions.forEach((q, qIdx) => {
      const card = document.createElement('div');
      card.className = 'wtw-verdict-card';
      
      // Find the most voted player(s) for this question
      let worstPlayers = [];
      let maxVotes = 0;
      
      if (q.voteCounts) {
        Object.entries(q.voteCounts).forEach(([pid, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            const player = players.find(p => p.id === pid);
            if (player) {
              worstPlayers = [player];
            }
          } else if (count === maxVotes && count > 0) {
            const player = players.find(p => p.id === pid);
            if (player) worstPlayers.push(player);
          }
        });
      }
      
      let answerHtml = '';
      if (maxVotes === 0 || worstPlayers.length === 0) {
        answerHtml = `
          <div class="wtw-verdict-answer-row no-votes">
            <span class="wtw-verdict-worst-label no-votes">No Votes</span>
            <span class="wtw-verdict-worst-name" style="margin-left: 8px; color: var(--text-muted); font-size:13px;">Nobody voted in this round.</span>
          </div>
        `;
      } else {
        const worstNames = worstPlayers.map(p => p.name).join(' & ');
        const firstPlayer = worstPlayers[0];
        
        answerHtml = `
          <div class="wtw-verdict-answer-row">
            <span class="wtw-verdict-worst-label">Worst</span>
            <div class="wtw-avatar" style="width:24px; height:24px; font-size:9px; margin-left: 8px; margin-right: 6px; ${wtwGetAvatarStyle(firstPlayer.name)}">${firstPlayer.name.substring(0, 2).toUpperCase()}</div>
            <span class="wtw-verdict-worst-name">${worstNames}</span>
            <span class="wtw-verdict-worst-votes">${maxVotes} vote${maxVotes !== 1 ? 's' : ''}</span>
          </div>
        `;
      }
      
      card.innerHTML = `
        <div class="wtw-verdict-q-num">Question ${qIdx + 1}</div>
        <div class="wtw-verdict-q-text">${q.text}</div>
        ${answerHtml}
      `;
      
      wtwFinalLeaderboard.appendChild(card);
    });
  }

  // ── Helper: update settings button active states ─────────────────────────
  function wtwSyncSettingsUI(settings) {
    document.querySelectorAll('#wtw-settings-controls .btn-setting').forEach(btn => {
      const key = btn.dataset.setting;
      const val = btn.dataset.value;
      const cur = settings[key];
      const matches = String(cur) === String(val);
      btn.classList.toggle('active', matches);
    });
  }

  // ── Phase transition handler ─────────────────────────────────────────────
  function wtwHandlePhaseChange(data) {
    const status = data.status;

    if (status === 'QUESTION_PHASE') {
      // Build question inputs dynamically
      wtwSubmittedQs = 0;
      wtwQInputsContainer.innerHTML = '';
      const qpp = wtwRoomState ? wtwRoomState.settings.questionsPerPlayer : 1;
      for (let i = 0; i < qpp; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'wtw-q-input-wrap';
        wrap.innerHTML = `
          <span class="wtw-q-input-label">Question ${qpp > 1 ? i + 1 : ''}</span>
          <input type="text" class="wtw-q-input" data-qi="${i}" placeholder="e.g. Who is most likely to forget someone's birthday?" maxlength="200" autocomplete="off" />
        `;
        wtwQInputsContainer.appendChild(wrap);
      }
      btnWtwSubmitQs.disabled = false;
      btnWtwSubmitQs.querySelector('span').textContent = 'Submit';
      wtwQSubmittedCount.textContent = '';
      wtwShowScreen(wtwQuestionPhase);
    }

    else if (status === 'VOTING_PHASE') {
      wtwHasVoted = false;
      wtwVotedForId = null;
      wtwShowScreen(wtwVotingPhase);

      const qIdx = data.currentQuestionIndex || 0;
      const total = wtwRoomState ? wtwRoomState.questions.length : 1;
      wtwVoteQProgress.textContent = `Question ${qIdx + 1} of ${total}`;
      wtwQuestionNumber.textContent = `Q${qIdx + 1}`;

      if (data.currentQuestion) {
        wtwQuestionText.textContent = data.currentQuestion.text;
      } else if (wtwRoomState && wtwRoomState.questions[qIdx]) {
        wtwQuestionText.textContent = wtwRoomState.questions[qIdx].text;
      }

      // Live results bar
      const showLive = wtwRoomState && wtwRoomState.settings.showRealTimeResults;
      if (showLive) {
        wtwLiveResults.classList.remove('hidden');
        wtwLiveBars.innerHTML = '';
      } else {
        wtwLiveResults.classList.add('hidden');
      }

      // Vote buttons
      if (wtwRoomState) wtwRenderVoteButtons(wtwRoomState.players);

      // Host skip button
      btnWtwSkipVoting.style.display = wtwIsHost ? 'inline-flex' : 'none';
    }

    else if (status === 'QUESTION_RESULTS') {
      wtwShowScreen(wtwQuestionResults);
      const qIdx = data.currentQuestionIndex != null ? data.currentQuestionIndex : (wtwRoomState ? wtwRoomState.currentQuestionIndex : 0);
      if (wtwRoomState && wtwRoomState.questions[qIdx]) {
        wtwResultQuestionText.textContent = wtwRoomState.questions[qIdx].text;
        wtwRenderBars(wtwResultBars, wtwRoomState.players, wtwRoomState.questions[qIdx].voteCounts);
      }
    }

    else if (status === 'FINAL_SCORES') {
      wtwShowScreen(wtwFinalScores);
      if (wtwRoomState) wtwRenderLeaderboard(wtwRoomState.players);
      wtwLoadHistory();
      if (wtwIsHost) {
        btnWtwPlayAgain.style.display = 'inline-flex';
        wtwPlayAgainWait.style.display = 'none';
      } else {
        btnWtwPlayAgain.style.display = 'none';
        wtwPlayAgainWait.style.display = 'block';
      }
    }
  }

  // ── Timer helper ─────────────────────────────────────────────────────────
  function wtwSetTimer(el, val) {
    el.textContent = val;
    el.classList.toggle('urgent', val <= 5 && val > 0);
  }

  // ── Reset to lobby setup ─────────────────────────────────────────────────
  function wtwResetUI() {
    wtwRoomId     = null;
    wtwMyName     = '';
    wtwIsHost     = false;
    wtwRoomState  = null;
    wtwHasVoted   = false;
    wtwVotedForId = null;
    wtwSubmittedQs= 0;
    sessionStorage.removeItem('wtw_room_id');
    sessionStorage.removeItem('wtw_player_name');
    sessionStorage.removeItem('wtw_active');
    wtwShowScreen(wtwLobbySetup);
  }

  // ── Game History Logic ───────────────────────────────────────────────────
  const wtwHistoryList = document.getElementById('wtw-history-list');
  const btnWtwRefreshHistory = document.getElementById('btn-wtw-refresh-history');
  const wtwHistoryModal = document.getElementById('wtw-history-modal');
  const btnWtwCloseModal = document.getElementById('btn-wtw-close-modal');
  const wtwModalTitle = document.getElementById('wtw-modal-title');
  const wtwModalSubtitle = document.getElementById('wtw-modal-subtitle');
  const wtwModalScoreboard = document.getElementById('wtw-modal-scoreboard');
  const wtwModalQuestions = document.getElementById('wtw-modal-questions');

  async function wtwLoadHistory() {
    if (!wtwHistoryList) return;
    wtwHistoryList.innerHTML = '<div class="wtw-history-empty">Loading history...</div>';
    try {
      const res = await fetch('/api/wtw/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      
      if (!data || data.length === 0) {
        wtwHistoryList.innerHTML = '<div class="wtw-history-empty">No games recorded yet. Play a game to see it here!</div>';
        return;
      }
      
      wtwHistoryList.innerHTML = '';
      data.forEach(game => {
        const dateStr = new Date(game.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const card = document.createElement('div');
        card.className = 'wtw-history-card';
        card.innerHTML = `
          <div class="wtw-hc-meta">
            <span class="wtw-hc-room">Room ${game.roomCode}</span>
            <span class="wtw-hc-date">${dateStr}</span>
          </div>
          <div class="wtw-hc-stats">
            <span><i data-lucide="users" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i>${game.playerCount} Players</span>
            <span><i data-lucide="crown" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle; color: gold;"></i>Winner: ${game.winnerName} (${game.winnerScore} pts)</span>
          </div>
        `;
        card.addEventListener('click', () => wtwShowGameDetails(game.id));
        wtwHistoryList.appendChild(card);
      });
      lucide.createIcons();
    } catch (err) {
      console.error('Error loading WTW history:', err);
      wtwHistoryList.innerHTML = '<div class="wtw-history-empty error">Failed to load history. Please ensure Supabase tables are created.</div>';
    }
  }

  async function wtwShowGameDetails(gameId) {
    try {
      const res = await fetch(`/api/wtw/history/${gameId}`);
      if (!res.ok) throw new Error('Failed to fetch game details');
      const game = await res.json();
      
      const dateStr = new Date(game.created_at).toLocaleString();
      wtwModalTitle.textContent = `Room ${game.room_code} Details`;
      wtwModalSubtitle.textContent = `Played on ${dateStr}`;
      
      // Render scoreboard
      wtwModalScoreboard.innerHTML = '';
      if (game.wtw_players && game.wtw_players.length > 0) {
        game.wtw_players.forEach((p, idx) => {
          const row = document.createElement('div');
          row.className = 'wtw-modal-player-row';
          row.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;';
          row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; width: 24px; color: ${idx === 0 ? 'gold' : 'white'};">#${idx + 1}</span>
              <span>${p.name}</span>
            </div>
            <span style="font-weight: bold; color: var(--wtw-orange);">${p.score} pts</span>
          `;
          wtwModalScoreboard.appendChild(row);
        });
      } else {
        wtwModalScoreboard.innerHTML = '<div style="opacity: 0.6; font-style: italic;">No players recorded</div>';
      }
      
      // Render questions & votes
      wtwModalQuestions.innerHTML = '';
      if (game.wtw_questions && game.wtw_questions.length > 0) {
        game.wtw_questions.forEach((q, idx) => {
          const qBox = document.createElement('div');
          qBox.className = 'wtw-modal-q-box';
          qBox.style.cssText = 'background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;';
          
          let votesHtml = '';
          if (q.wtw_votes && q.wtw_votes.length > 0) {
            votesHtml = q.wtw_votes.map(v => `
              <div class="wtw-modal-vote-row" style="display: flex; align-items: center; gap: 8px; font-size: 0.9em; opacity: 0.9; margin-top: 4px;">
                <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${v.voter_name}</span>
                <span style="font-size: 0.8em; opacity: 0.5;">voted for</span>
                <span style="background: var(--wtw-orange-dim); color: var(--wtw-orange); padding: 2px 6px; border-radius: 4px; font-weight: bold;">${v.votee_name}</span>
              </div>
            `).join('');
          } else {
            votesHtml = '<div style="font-size: 0.9em; opacity: 0.5; font-style: italic; margin-top: 4px;">No votes recorded</div>';
          }
          
          qBox.innerHTML = `
            <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
              <span>Q${idx + 1}: "${q.text}"</span>
              <span style="font-size: 0.75em; opacity: 0.6; font-weight: normal; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; white-space: nowrap;">
                By: ${q.author_name || 'System'}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${votesHtml}
            </div>
          `;
          wtwModalQuestions.appendChild(qBox);
        });
      } else {
        wtwModalQuestions.innerHTML = '<div style="opacity: 0.6; font-style: italic;">No questions recorded</div>';
      }
      
      wtwHistoryModal.classList.remove('hidden');
      lucide.createIcons();
    } catch (err) {
      console.error('Error loading game details:', err);
      showModalAlert('Failed to load game details.', 'Error', 'error');
    }
  }

  // Bind History Listeners
  if (btnWtwRefreshHistory) {
    btnWtwRefreshHistory.addEventListener('click', (e) => {
      e.stopPropagation();
      wtwLoadHistory();
    });
  }
  if (btnWtwCloseModal) {
    btnWtwCloseModal.addEventListener('click', () => {
      wtwHistoryModal.classList.add('hidden');
    });
  }
  if (wtwHistoryModal) {
    wtwHistoryModal.addEventListener('click', (e) => {
      if (e.target === wtwHistoryModal) {
        wtwHistoryModal.classList.add('hidden');
      }
    });
  }

  // ── Open game ────────────────────────────────────────────────────────────
  document.querySelector('[data-game="wtw"]').addEventListener('click', () => {
    gamesListView.classList.add('hidden');
    wtwGameView.classList.remove('hidden');
    localStorage.setItem('active_game', 'wtw');
    wtwResetUI();

    const savedRoomId = localStorage.getItem('wtw_saved_room_id');
    const savedPlayerName = localStorage.getItem('wtw_saved_player_name');
    if (savedRoomId && savedPlayerName) {
      document.getElementById('wtw-rejoin-room-code').textContent = savedRoomId;
      document.getElementById('wtw-rejoin-player-name').textContent = savedPlayerName;
      document.getElementById('wtw-rejoin-panel').style.display = 'block';
      document.getElementById('wtw-lobby-forms').style.display = 'none';
    } else {
      document.getElementById('wtw-rejoin-panel').style.display = 'none';
      document.getElementById('wtw-lobby-forms').style.display = 'grid';
    }
    wtwLoadHistory();
    lucide.createIcons();
  });

  // Resume / New Game for WTW
  document.getElementById('btn-wtw-rejoin').addEventListener('click', () => {
    const savedRoomId = localStorage.getItem('wtw_saved_room_id');
    const savedPlayerName = localStorage.getItem('wtw_saved_player_name');
    if (savedRoomId && savedPlayerName) {
      socket.emit('wtw-join', { roomId: savedRoomId, playerName: savedPlayerName }, (res) => {
        if (res && !res.error) {
          wtwMyName = savedPlayerName;
          wtwRoomId = savedRoomId;
          wtwIsHost = (res.roomState.hostId === socket.id);
          wtwMyId = socket.id;

          sessionStorage.setItem('wtw_room_id', savedRoomId);
          sessionStorage.setItem('wtw_player_name', savedPlayerName);
          sessionStorage.setItem('wtw_active', 'true');

          localStorage.setItem('wtw_saved_active', 'true');

          document.getElementById('wtw-rejoin-panel').style.display = 'none';
          document.getElementById('wtw-lobby-forms').style.display = 'grid';

          wtwRouteState(res.roomState);
        } else {
          showModalAlert(res?.error || 'Failed to rejoin room', 'Rejoin Error', 'error');
          localStorage.removeItem('wtw_saved_room_id');
          localStorage.removeItem('wtw_saved_player_name');
          localStorage.removeItem('wtw_saved_active');
          document.getElementById('wtw-rejoin-panel').style.display = 'none';
          document.getElementById('wtw-lobby-forms').style.display = 'grid';
          wtwResetUI();
        }
      });
    }
  });

  document.getElementById('btn-wtw-clear-session').addEventListener('click', () => {
    localStorage.removeItem('wtw_saved_room_id');
    localStorage.removeItem('wtw_saved_player_name');
    localStorage.removeItem('wtw_saved_active');

    sessionStorage.removeItem('wtw_room_id');
    sessionStorage.removeItem('wtw_player_name');
    sessionStorage.removeItem('wtw_active');

    document.getElementById('wtw-rejoin-panel').style.display = 'none';
    document.getElementById('wtw-lobby-forms').style.display = 'grid';
    wtwResetUI();
  });

  btnWtwBack.addEventListener('click', () => {
    wtwGameView.classList.add('hidden');
    gamesListView.classList.remove('hidden');
    localStorage.removeItem('active_game');
    wtwResetUI();
  });

  // ── Create Room ──────────────────────────────────────────────────────────
  btnWtwCreateRoom.addEventListener('click', async () => {
    const name = wtwNameCreate.value.trim();
    if (!name) { await showModalAlert('Please enter your name.', 'Name Required', 'warning'); return; }

    btnWtwCreateRoom.disabled = true;
    btnWtwCreateRoom.querySelector('span').textContent = 'Creating...';

    socket.emit('wtw-create', { playerName: name }, (res) => {
      btnWtwCreateRoom.disabled = false;
      btnWtwCreateRoom.querySelector('span').textContent = 'Create Room';

      if (res.error) { showModalAlert(res.error, 'Error', 'error'); return; }

      wtwRoomId  = res.roomId;
      wtwMyName  = name;
      wtwIsHost  = true;
      wtwMyId    = socket.id;
      wtwRoomState = res.roomState;

      // Save to sessionStorage
      sessionStorage.setItem('wtw_room_id', res.roomId);
      sessionStorage.setItem('wtw_player_name', name);
      sessionStorage.setItem('wtw_active', 'true');

      // Save to localStorage
      localStorage.setItem('wtw_saved_room_id', res.roomId);
      localStorage.setItem('wtw_saved_player_name', name);
      localStorage.setItem('wtw_saved_active', 'true');

      wtwRouteState(res.roomState);
    });
  });

  // ── Join Room ────────────────────────────────────────────────────────────
  btnWtwJoinRoom.addEventListener('click', async () => {
    const name = wtwNameJoin.value.trim();
    const code = wtwRoomCodeInput.value.trim().toUpperCase();
    if (!name) { await showModalAlert('Please enter your name.', 'Name Required', 'warning'); return; }
    if (!code || code.length !== 4) { await showModalAlert('Please enter a valid 4-letter room code.', 'Code Required', 'warning'); return; }

    btnWtwJoinRoom.disabled = true;
    btnWtwJoinRoom.querySelector('span').textContent = 'Joining...';

    socket.emit('wtw-join', { roomId: code, playerName: name }, (res) => {
      btnWtwJoinRoom.disabled = false;
      btnWtwJoinRoom.querySelector('span').textContent = 'Join Room';

      if (res.error) { showModalAlert(res.error, 'Error', 'error'); return; }

      wtwRoomId  = code;
      wtwMyName  = name;
      wtwIsHost  = false;
      wtwMyId    = socket.id;
      wtwRoomState = res.roomState;

      // Save to sessionStorage
      sessionStorage.setItem('wtw_room_id', code);
      sessionStorage.setItem('wtw_player_name', name);
      sessionStorage.setItem('wtw_active', 'true');

      // Save to localStorage
      localStorage.setItem('wtw_saved_room_id', code);
      localStorage.setItem('wtw_saved_player_name', name);
      localStorage.setItem('wtw_saved_active', 'true');

      wtwRouteState(res.roomState);
    });
  });

  // ── Copy room code ───────────────────────────────────────────────────────
  btnWtwCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(wtwRoomId || '').then(() => {
      btnWtwCopyCode.innerHTML = '<i data-lucide="check"></i>';
      lucide.createIcons();
      setTimeout(() => {
        btnWtwCopyCode.innerHTML = '<i data-lucide="copy"></i>';
        lucide.createIcons();
      }, 1500);
    });
  });

  // ── Settings buttons (host only) ─────────────────────────────────────────
  document.querySelectorAll('#wtw-settings-controls .btn-setting').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!wtwIsHost) return;
      const setting = btn.dataset.setting;
      let val = btn.dataset.value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else val = Number(val);

      socket.emit('wtw-update-settings', { [setting]: val }, () => {});
    });
  });

  // ── Start Game (host) ────────────────────────────────────────────────────
  btnWtwStartGame.addEventListener('click', () => {
    socket.emit('wtw-start-game', null, (res) => {
      if (res && res.error) showModalAlert(res.error, 'Cannot Start', 'error');
    });
  });

  // ── Submit Questions ─────────────────────────────────────────────────────
  btnWtwSubmitQs.addEventListener('click', async () => {
    const inputs = wtwQInputsContainer.querySelectorAll('.wtw-q-input:not(.submitted)');
    const questions = [...inputs].map(i => i.value.trim()).filter(q => q.length > 0);

    if (questions.length === 0) {
      await showModalAlert('Please write at least one question before submitting.', 'Empty Question', 'warning');
      return;
    }

    btnWtwSubmitQs.disabled = true;
    btnWtwSubmitQs.querySelector('span').textContent = 'Submitting...';

    // Submit questions one by one
    let allOk = true;
    for (const q of questions) {
      await new Promise((resolve) => {
        socket.emit('wtw-submit-question', { questionText: q }, (res) => {
          if (res && res.error) { showModalAlert(res.error, 'Submit Error', 'error'); allOk = false; }
          resolve();
        });
      });
      if (!allOk) break;
    }

    if (allOk) {
      // Mark inputs as submitted
      inputs.forEach(input => { input.classList.add('submitted'); });
      btnWtwSubmitQs.querySelector('span').textContent = 'Submitted ✓';
      wtwQSubmittedCount.textContent = `Your questions submitted!`;
    } else {
      btnWtwSubmitQs.disabled = false;
      btnWtwSubmitQs.querySelector('span').textContent = 'Submit';
    }
  });

  // ── Skip Voting (host) ───────────────────────────────────────────────────
  btnWtwSkipVoting.addEventListener('click', () => {
    socket.emit('wtw-skip-voting', null, (res) => {
      if (res && res.error) showModalAlert(res.error, 'Cannot Skip', 'error');
    });
  });

  // ── Play Again (host) ────────────────────────────────────────────────────
  btnWtwPlayAgain.addEventListener('click', () => {
    socket.emit('wtw-next-round', null, (res) => {
      if (res && res.error) showModalAlert(res.error, 'Cannot restart', 'error');
    });
  });

  // ── Transition to Waiting Room ───────────────────────────────────────────
  function wtwTransitionToWaiting(state) {
    wtwRoomState = state;
    wtwDisplayCode.textContent = state.roomId;
    wtwShowScreen(wtwLobbyWaiting);
    wtwUpdateWaitingUI(state);
    lucide.createIcons();
  }

  function wtwRouteState(state) {
    wtwRoomState = state;
    wtwDisplayCode.textContent = state.roomId;

    if (state.status === 'LOBBY') {
      wtwShowScreen(wtwLobbyWaiting);
      wtwUpdateWaitingUI(state);
    } else {
      wtwHandlePhaseChange(state);

      if (state.status === 'QUESTION_PHASE') {
        wtwRenderQPlayerStatus(state.players);
        wtwQSubmittedCount.textContent = `${state.submittedQuestionsCount} / ${state.players.filter(p=>p.connected).length} submitted`;
      } else if (state.status === 'VOTING_PHASE') {
        if (state.settings.showRealTimeResults) {
          const q = state.questions[state.currentQuestionIndex];
          if (q && q.voteCounts) wtwRenderBars(wtwLiveBars, state.players, q.voteCounts);
        }
        wtwRenderVoteButtons(state.players);
      } else if (state.status === 'QUESTION_RESULTS') {
        const q = state.questions[state.currentQuestionIndex];
        if (q && q.voteCounts) wtwRenderBars(wtwResultBars, state.players, q.voteCounts);
      } else if (state.status === 'FINAL_SCORES') {
        wtwRenderLeaderboard(state.players);
      }
    }
    lucide.createIcons();
  }

  function wtwUpdateWaitingUI(state) {
    const connected = state.players.filter(p => p.connected);
    wtwPlayerCount.textContent = `${connected.length} / 12`;
    wtwRenderLobbyPlayers(state.players);

    // Host vs guest UI
    if (wtwIsHost) {
      wtwSettingsControls.classList.remove('hidden');
      wtwSettingsReadonly.classList.add('hidden');
      btnWtwStartGame.style.display = 'block';
      wtwWaitingForHost.style.display = 'none';
      const canStart = connected.length >= 3;
      btnWtwStartGame.disabled = !canStart;
      wtwHostWarning.classList.toggle('hidden', canStart);
    } else {
      wtwSettingsControls.classList.add('hidden');
      wtwSettingsReadonly.classList.remove('hidden');
      btnWtwStartGame.style.display = 'none';
      wtwWaitingForHost.style.display = 'block';
    }

    wtwSyncSettingsUI(state.settings);
  }

  // ── Socket: Room Updated ─────────────────────────────────────────────────
  socket.on('wtw-room-updated', (state) => {
    wtwRoomState = state;
    // Sync host status (in case of host transfer)
    wtwIsHost = (state.hostId === socket.id);

    if (state.status === 'LOBBY') {
      wtwUpdateWaitingUI(state);
    } else if (state.status === 'QUESTION_PHASE') {
      // Update submission chips
      wtwRenderQPlayerStatus(state.players);
      wtwQSubmittedCount.textContent = `${state.submittedQuestionsCount} / ${state.players.filter(p=>p.connected).length} submitted`;
    } else if (state.status === 'VOTING_PHASE') {
      // Update live bars if visible
      if (wtwRoomState && wtwRoomState.settings.showRealTimeResults) {
        const q = state.questions[state.currentQuestionIndex];
        if (q && q.voteCounts) wtwRenderBars(wtwLiveBars, state.players, q.voteCounts);
      }
      // Re-render vote buttons to reflect any changes (e.g. reconnect)
      wtwRenderVoteButtons(state.players);
    } else if (state.status === 'QUESTION_RESULTS') {
      // Bars might be updated here
      const q = state.questions[state.currentQuestionIndex];
      if (q && q.voteCounts) wtwRenderBars(wtwResultBars, state.players, q.voteCounts);
    } else if (state.status === 'FINAL_SCORES') {
      wtwRenderLeaderboard(state.players);
    }
    lucide.createIcons();
  });

  // ── Socket: Phase Changed ────────────────────────────────────────────────
  socket.on('wtw-phase-changed', (data) => {
    wtwHandlePhaseChange(data);
    lucide.createIcons();
  });

  // ── Socket: Timer Update ─────────────────────────────────────────────────
  socket.on('wtw-timer-update', (timeLeft) => {
    const status = wtwRoomState ? wtwRoomState.status : '';
    let total = 60;
    let bar = null;

    if (status === 'QUESTION_PHASE') {
      wtwSetTimer(wtwQTimer, timeLeft);
      total = wtwRoomState ? wtwRoomState.settings.questionTime : 60;
      bar = document.getElementById('wtw-q-timer-bar');
    } else if (status === 'VOTING_PHASE') {
      wtwSetTimer(wtwVTimer, timeLeft);
      total = wtwRoomState ? wtwRoomState.settings.voteTime : 15;
      bar = document.getElementById('wtw-v-timer-bar');
    } else if (status === 'QUESTION_RESULTS') {
      wtwSetTimer(wtwRTimer, timeLeft);
      total = 8;
      bar = document.getElementById('wtw-r-timer-bar');
    }

    if (bar) {
      const pct = (timeLeft / total) * 100;
      bar.style.width = `${pct}%`;
      bar.classList.toggle('urgent', timeLeft <= 5);
    }
  });

  // ── Socket: Live Vote Update ─────────────────────────────────────────────
  socket.on('wtw-vote-update', (data) => {
    if (!wtwRoomState) return;
    if (wtwRoomState.settings.showRealTimeResults) {
      wtwRenderBars(wtwLiveBars, wtwRoomState.players, data.voteCounts);
    }
  });

  // ==========================================================================
  // VIEW & SESSION RESTORATION ON PAGE LOAD
  // ==========================================================================

  // 1. Restore Mode on page load
  const initialMode = localStorage.getItem('nexus_mode') || 'guest';
  setAppMode(initialMode);

  // 2. Initial load of bookmarks
  fetchBookmarks();

  // 3. Restore active view
  const savedView = localStorage.getItem('active_view') || 'dashboard';
  // Avoid switching to downloader if guest is active
  if (savedView === 'downloader' && initialMode !== 'owner') {
    switchView('dashboard');
  } else {
    switchView(savedView);
  }

  // 4. Restore active game sub-view inside Games list if active view is games
  if (savedView === 'games') {
    const savedGame = localStorage.getItem('active_game');
    if (savedGame === 'tictactoe') {
      gamesListView.classList.add('hidden');
      gameTictactoeView.classList.remove('hidden');
    } else if (savedGame === 'cdbp') {
      gamesListView.classList.add('hidden');
      cdbpGameView.classList.remove('hidden');
    } else if (savedGame === 'wtw') {
      gamesListView.classList.add('hidden');
      wtwGameView.classList.remove('hidden');
    } else if (savedGame === 'nhie') {
      gamesListView.classList.add('hidden');
      document.getElementById('game-nhie-view').classList.remove('hidden');
    }
  }

  // 5. Auto-reconnect session recovery on page load (Chor Police)
  const savedRoomId = sessionStorage.getItem('cdbp_room_id');
  const savedPlayerName = sessionStorage.getItem('cdbp_player_name');
  const cdbpActive = sessionStorage.getItem('cdbp_active');

  if (savedRoomId && savedPlayerName && cdbpActive === 'true') {
    socket.emit('cdbp-join', { roomId: savedRoomId, playerName: savedPlayerName }, (response) => {
      if (response && response.success) {
        cdbpMyName = savedPlayerName;
        cdbpRoomId = response.roomId;
        cdbpIsHost = response.roomState.players.find(p => p.name === savedPlayerName)?.isHost || false;

        // Restore view to games tab and cdbp screen
        switchView('games');
        localStorage.setItem('active_game', 'cdbp');
        gamesListView.classList.add('hidden');
        cdbpGameView.classList.remove('hidden');

        transitionToLobby(response.roomState);
      } else {
        sessionStorage.removeItem('cdbp_room_id');
        sessionStorage.removeItem('cdbp_player_name');
        sessionStorage.removeItem('cdbp_active');
      }
    });
  }

  // 6. Auto-reconnect session recovery on page load (Who's the Worst)
  const savedWtwRoomId = sessionStorage.getItem('wtw_room_id');
  const savedWtwPlayerName = sessionStorage.getItem('wtw_player_name');
  const wtwActive = sessionStorage.getItem('wtw_active');

  if (savedWtwRoomId && savedWtwPlayerName && wtwActive === 'true') {
    socket.emit('wtw-join', { roomId: savedWtwRoomId, playerName: savedWtwPlayerName }, (res) => {
      if (res && !res.error) {
        wtwMyName = savedWtwPlayerName;
        wtwRoomId = savedWtwRoomId;
        wtwIsHost = (res.roomState.hostId === socket.id);
        wtwMyId = socket.id;

        // Restore view to games tab and wtw screen
        switchView('games');
        localStorage.setItem('active_game', 'wtw');
        gamesListView.classList.add('hidden');
        wtwGameView.classList.remove('hidden');

        wtwRouteState(res.roomState);
      } else {
        sessionStorage.removeItem('wtw_room_id');
        sessionStorage.removeItem('wtw_player_name');
        sessionStorage.removeItem('wtw_active');
      }
    });
  }

  // ==========================================================================
  // Game Zone Logic: Never Have I Ever (NHIE)
  // ==========================================================================

  const nhieGameView       = document.getElementById('game-nhie-view');
  const btnNhieBack        = document.getElementById('btn-nhie-back-to-arcade');

  const nhieLobbySetup     = document.getElementById('nhie-lobby-setup');
  const nhieLobbyWaiting   = document.getElementById('nhie-lobby-waiting');
  const nhieStatementPhase = document.getElementById('nhie-statement-phase');
  const nhieAnsweringPhase = document.getElementById('nhie-answering-phase');
  const nhieStatementResults= document.getElementById('nhie-statement-results');
  const nhieFinalScores    = document.getElementById('nhie-final-scores');
  const nhieAllScreens     = [nhieLobbySetup, nhieLobbyWaiting, nhieStatementPhase, nhieAnsweringPhase, nhieStatementResults, nhieFinalScores];

  const nhieNameCreate     = document.getElementById('nhie-name-create');
  const nhieNameJoin       = document.getElementById('nhie-name-join');
  const nhieRoomCodeInput  = document.getElementById('nhie-room-code-input');
  const btnNhieCreateRoom  = document.getElementById('btn-nhie-create-room');
  const btnNhieJoinRoom    = document.getElementById('btn-nhie-join-room');

  const nhieDisplayCode      = document.getElementById('nhie-display-code');
  const nhiePlayerCount      = document.getElementById('nhie-player-count');
  const nhieLobbyPlayersList = document.getElementById('nhie-lobby-players-list');
  const btnNhieCopyCode      = document.getElementById('btn-nhie-copy-code');
  const nhieHostWarning      = document.getElementById('nhie-host-warning');
  const nhieSettingsControls = document.getElementById('nhie-settings-controls');
  const nhieSettingsReadonly = document.getElementById('nhie-settings-readonly');
  const btnNhieStartGame     = document.getElementById('btn-nhie-start-game');
  const nhieWaitingForHost   = document.getElementById('nhie-waiting-for-host-msg');

  // Select Fields
  const nhieSelectScoreMode     = document.getElementById('nhie-select-score-mode');
  const nhieSelectLives         = document.getElementById('nhie-select-lives');
  const nhieSelectStatementTime = document.getElementById('nhie-select-statement-time');
  const nhieSelectAnswerTime    = document.getElementById('nhie-select-answer-time');
  const nhieSelectSystemPrompts = document.getElementById('nhie-select-system-prompts');
  const nhieSelectStatementsPerPlayer = document.getElementById('nhie-select-statements-per-player');

  const nhieLivesField          = document.getElementById('nhie-lives-field');
  const nhieCustomPerPlayerField= document.getElementById('nhie-custom-per-player-field');

  // Timers
  const nhieSTimer           = document.getElementById('nhie-s-timer');
  const nhieSTimerBar        = document.getElementById('nhie-s-timer-bar');
  const nhieATimer           = document.getElementById('nhie-a-timer');
  const nhieATimerBar        = document.getElementById('nhie-a-timer-bar');
  const nhieRTimer           = document.getElementById('nhie-r-timer');
  const nhieRTimerBar        = document.getElementById('nhie-r-timer-bar');

  // Phase Input
  const nhieStatementInputsContainer = document.getElementById('nhie-statement-inputs-container');
  const nhieSSubmittedCount  = document.getElementById('nhie-s-submitted-count');
  const btnNhieSubmitStatements = document.getElementById('btn-nhie-submit-statements');
  const nhieSPlayersStatus   = document.getElementById('nhie-s-players-status');

  // Phase Answer
  const nhieStatementNumber   = document.getElementById('nhie-statement-number');
  const nhieStatementText     = document.getElementById('nhie-statement-text');
  const nhieStatementAuthor   = document.getElementById('nhie-statement-author');
  const nhieAnswerButtons      = document.getElementById('nhie-answer-buttons');
  const nhieAnsweredWaiting    = document.getElementById('nhie-answered-waiting');
  const nhieAnsweredProgress   = document.getElementById('nhie-answered-progress');
  const nhieAnsweringPlayersChips = document.getElementById('nhie-answering-players-chips');
  const btnNhieSkipAnswering   = document.getElementById('btn-nhie-skip-answering');

  // Phase Results
  const nhieResultStatementText = document.getElementById('nhie-result-statement-text');
  const nhieResultAuthor       = document.getElementById('nhie-result-author');
  const nhieResultsAdmittedList= document.getElementById('nhie-results-admitted-list');
  const nhieResultsInnocentList= document.getElementById('nhie-results-innocent-list');
  const nhieResultScoresList   = document.getElementById('nhie-result-scores-list');

  // Phase Final
  const nhieFinalLeaderboard   = document.getElementById('nhie-final-leaderboard');
  const nhieWinnerAnnouncement = document.getElementById('nhie-winner-announcement');
  const btnNhiePlayAgain       = document.getElementById('btn-nhie-play-again');
  const nhiePlayAgainWait      = document.getElementById('nhie-play-again-wait');

  let nhieRoomId       = null;
  let nhieMyName       = '';
  let nhieMyId         = socket.id;
  let nhieIsHost       = false;
  let nhieRoomState    = null;
  let nhieSubmittedStatements = 0;
  let nhieTimerInterval = null;

  function nhieShowScreen(screen) {
    nhieAllScreens.forEach(s => {
      s.classList.add('hidden');
      s.style.display = '';
    });
    screen.classList.remove('hidden');
    
    // Smooth scroll page to top on phase transition
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nhieResetUI() {
    nhieRoomId = null;
    nhieMyName = '';
    nhieIsHost = false;
    nhieRoomState = null;
    nhieSubmittedStatements = 0;
    if (nhieTimerInterval) clearInterval(nhieTimerInterval);

    nhieNameCreate.value = '';
    nhieNameJoin.value = '';
    nhieRoomCodeInput.value = '';
    nhieDisplayCode.textContent = '----';
    nhiePlayerCount.textContent = '0 / 12';
    nhieLobbyPlayersList.innerHTML = '';
    
    btnNhieCreateRoom.disabled = false;
    btnNhieCreateRoom.querySelector('span').textContent = 'Create Room';
    btnNhieJoinRoom.disabled = false;
    btnNhieJoinRoom.querySelector('span').textContent = 'Join Room';

    nhieShowScreen(nhieLobbySetup);
    nhieLoadHistory();
  }

  // Deterministic avatar gradient
  function nhieGetAvatarStyle(name) {
    const gradients = [
      'linear-gradient(135deg, #f43f5e, #be123c)', // rose
      'linear-gradient(135deg, #3b82f6, #1d4ed8)', // blue
      'linear-gradient(135deg, #10b981, #047857)', // green
      'linear-gradient(135deg, #8b5cf6, #6d28d9)', // purple
      'linear-gradient(135deg, #ec4899, #be185d)', // pink
      'linear-gradient(135deg, #06b6d4, #0891b2)', // cyan
      'linear-gradient(135deg, #f59e0b, #b45309)', // amber
      'linear-gradient(135deg, #f97316, #ea580c)', // orange
      'linear-gradient(135deg, #14b8a6, #0f766e)'  // teal
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    const idx = sum % gradients.length;
    return `background: ${gradients[idx]}; border: 1px solid rgba(255,255,255,0.25); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.3);`;
  }

  function nhieRenderLobbyPlayers(players) {
    nhieLobbyPlayersList.innerHTML = '';
    players.forEach(p => {
      const row = document.createElement('div');
      row.className = 'nhie-player-lobby-row' + (p.connected ? '' : ' disconnected');
      row.innerHTML = `
        <div class="nhie-avatar" style="${nhieGetAvatarStyle(p.name)}">${p.name.substring(0, 2).toUpperCase()}</div>
        <span style="font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size:14px; flex-grow:1;">${p.name} ${p.id === socket.id ? '(You)' : ''}</span>
        ${p.isHost ? '<span class="nhie-host-badge">HOST</span>' : ''}
        ${!p.connected ? '<span style="font-size: 10px; opacity:0.6;">(Offline)</span>' : ''}
      `;
      nhieLobbyPlayersList.appendChild(row);
    });
  }

  function nhieRenderPlayersStatus(players) {
    nhieSPlayersStatus.innerHTML = '';
    players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'nhie-status-chip' + (p.hasSubmittedStatement ? ' done' : '');
      chip.innerHTML = `
        <span>${p.name}</span>
        <span>${p.hasSubmittedStatement ? '✅ Ready' : '✍️ Writing...'}</span>
      `;
      nhieSPlayersStatus.appendChild(chip);
    });
  }

  function nhieRenderAnsweringChips(players) {
    nhieAnsweringPlayersChips.innerHTML = '';
    players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'nhie-player-chip' + (p.hasAnswered ? ' done' : '');
      chip.textContent = p.name;
      nhieAnsweringPlayersChips.appendChild(chip);
    });
  }

  // ── Local Timer Countdown fallback ───────────────────────────────────────
  function nhieStartLocalCountdown(duration, barElement, textElement) {
    if (nhieTimerInterval) clearInterval(nhieTimerInterval);
    let left = duration;
    if (textElement) textElement.textContent = left;
    if (barElement) barElement.style.width = '100%';

    nhieTimerInterval = setInterval(() => {
      left--;
      if (left < 0) left = 0;
      if (textElement) textElement.textContent = left;
      if (barElement) {
        const pct = (left / duration) * 100;
        barElement.style.width = `${pct}%`;
      }
      if (left <= 0) {
        clearInterval(nhieTimerInterval);
      }
    }, 1000);
  }

  // ── Emit settings updates to server ──────────────────────────────────────
  function nhieSendSettingsUpdate(triggeringEl) {
    if (!nhieIsHost) return;
    
    let customCount = parseInt(nhieSelectStatementsPerPlayer.value);
    let systemCount = parseInt(nhieSelectSystemPrompts.value);
    
    // Prevent configuring 0 total statements
    if (customCount === 0 && systemCount === 0) {
      if (triggeringEl === nhieSelectStatementsPerPlayer) {
        systemCount = 10;
        nhieSelectSystemPrompts.value = "10";
      } else {
        customCount = 2;
        nhieSelectStatementsPerPlayer.value = "2";
      }
    }

    const settings = {
      scoreMode: nhieSelectScoreMode.value,
      startingLives: parseInt(nhieSelectLives.value),
      statementTime: parseInt(nhieSelectStatementTime.value),
      answerTime: parseInt(nhieSelectAnswerTime.value),
      statementsPerPlayer: customCount,
      systemStatementsCount: systemCount,
    };
    socket.emit('nhie-update-settings', settings);
  }

  // Settings fields visibility toggle
  function nhieSyncSettingsVisibility(settings) {
    if (settings.scoreMode === 'SURVIVAL') {
      nhieLivesField.classList.remove('hidden');
    } else {
      nhieLivesField.classList.add('hidden');
    }
  }

  // Listeners for setting adjustments (Host only)
  [nhieSelectScoreMode, nhieSelectLives, nhieSelectStatementTime, nhieSelectAnswerTime, nhieSelectSystemPrompts, nhieSelectStatementsPerPlayer].forEach(el => {
    el.addEventListener('change', () => {
      nhieSendSettingsUpdate(el);
    });
  });

  // ── Open game ────────────────────────────────────────────────────────────
  document.querySelector('[data-game="nhie"]').addEventListener('click', () => {
    gamesListView.classList.add('hidden');
    nhieGameView.classList.remove('hidden');
    localStorage.setItem('active_game', 'nhie');
    nhieResetUI();

    const savedRoomId = localStorage.getItem('nhie_saved_room_id');
    const savedPlayerName = localStorage.getItem('nhie_saved_player_name');
    if (savedRoomId && savedPlayerName) {
      document.getElementById('nhie-rejoin-room-code').textContent = savedRoomId;
      document.getElementById('nhie-rejoin-player-name').textContent = savedPlayerName;
      document.getElementById('nhie-rejoin-panel').style.display = 'block';
      document.getElementById('nhie-lobby-forms').style.display = 'none';
    } else {
      document.getElementById('nhie-rejoin-panel').style.display = 'none';
      document.getElementById('nhie-lobby-forms').style.display = 'grid';
    }
    nhieLoadHistory();
    lucide.createIcons();
  });

  // Resume / New Game for NHIE
  document.getElementById('btn-nhie-rejoin').addEventListener('click', () => {
    const savedRoomId = localStorage.getItem('nhie_saved_room_id');
    const savedPlayerName = localStorage.getItem('nhie_saved_player_name');
    if (savedRoomId && savedPlayerName) {
      socket.emit('nhie-join', { roomId: savedRoomId, playerName: savedPlayerName }, (res) => {
        if (res && !res.error) {
          nhieMyName = savedPlayerName;
          nhieRoomId = savedRoomId;
          nhieIsHost = (res.roomState.hostId === socket.id);
          nhieMyId = socket.id;

          sessionStorage.setItem('nhie_room_id', savedRoomId);
          sessionStorage.setItem('nhie_player_name', savedPlayerName);
          sessionStorage.setItem('nhie_active', 'true');

          localStorage.setItem('nhie_saved_active', 'true');

          document.getElementById('nhie-rejoin-panel').style.display = 'none';
          document.getElementById('nhie-lobby-forms').style.display = 'grid';

          nhieRouteState(res.roomState);
        } else {
          showModalAlert(res?.error || 'Failed to rejoin room', 'Rejoin Error', 'error');
          localStorage.removeItem('nhie_saved_room_id');
          localStorage.removeItem('nhie_saved_player_name');
          localStorage.removeItem('nhie_saved_active');
          document.getElementById('nhie-rejoin-panel').style.display = 'none';
          document.getElementById('nhie-lobby-forms').style.display = 'grid';
          nhieResetUI();
        }
      });
    }
  });

  document.getElementById('btn-nhie-clear-session').addEventListener('click', () => {
    localStorage.removeItem('nhie_saved_room_id');
    localStorage.removeItem('nhie_saved_player_name');
    localStorage.removeItem('nhie_saved_active');

    sessionStorage.removeItem('nhie_room_id');
    sessionStorage.removeItem('nhie_player_name');
    sessionStorage.removeItem('nhie_active');

    document.getElementById('nhie-rejoin-panel').style.display = 'none';
    document.getElementById('nhie-lobby-forms').style.display = 'grid';
    nhieResetUI();
  });

  btnNhieBack.addEventListener('click', () => {
    nhieGameView.classList.add('hidden');
    gamesListView.classList.remove('hidden');
    localStorage.removeItem('active_game');
    nhieResetUI();
  });

  // ── Create Room ──────────────────────────────────────────────────────────
  btnNhieCreateRoom.addEventListener('click', async () => {
    const name = nhieNameCreate.value.trim();
    if (!name) { await showModalAlert('Please enter your name.', 'Name Required', 'warning'); return; }

    btnNhieCreateRoom.disabled = true;
    btnNhieCreateRoom.querySelector('span').textContent = 'Creating...';

    socket.emit('nhie-create', { playerName: name }, (res) => {
      btnNhieCreateRoom.disabled = false;
      btnNhieCreateRoom.querySelector('span').textContent = 'Create Room';

      if (res.error) {
        showModalAlert(res.error, 'Error', 'danger');
        return;
      }

      nhieRoomId = res.roomId;
      nhieMyName = name;
      nhieIsHost = true;
      nhieMyId = socket.id;

      sessionStorage.setItem('nhie_room_id', nhieRoomId);
      sessionStorage.setItem('nhie_player_name', nhieMyName);
      sessionStorage.setItem('nhie_active', 'true');

      // Save to localStorage
      localStorage.setItem('nhie_saved_room_id', nhieRoomId);
      localStorage.setItem('nhie_saved_player_name', nhieMyName);
      localStorage.setItem('nhie_saved_active', 'true');

      nhieRouteState(res.roomState);
    });
  });

  // ── Join Room ────────────────────────────────────────────────────────────
  btnNhieJoinRoom.addEventListener('click', async () => {
    const name = nhieNameJoin.value.trim();
    const code = nhieRoomCodeInput.value.trim().toUpperCase();

    if (!name) { await showModalAlert('Please enter your name.', 'Name Required', 'warning'); return; }
    if (!code || code.length !== 4) { await showModalAlert('Please enter a 4-letter room code.', 'Code Required', 'warning'); return; }

    btnNhieJoinRoom.disabled = true;
    btnNhieJoinRoom.querySelector('span').textContent = 'Joining...';

    socket.emit('nhie-join', { roomId: code, playerName: name }, (res) => {
      btnNhieJoinRoom.disabled = false;
      btnNhieJoinRoom.querySelector('span').textContent = 'Join Room';

      if (res.error) {
        showModalAlert(res.error, 'Error', 'danger');
        return;
      }

      nhieRoomId = code;
      nhieMyName = name;
      nhieIsHost = (res.roomState.hostId === socket.id);
      nhieMyId = socket.id;

      sessionStorage.setItem('nhie_room_id', nhieRoomId);
      sessionStorage.setItem('nhie_player_name', nhieMyName);
      sessionStorage.setItem('nhie_active', 'true');

      // Save to localStorage
      localStorage.setItem('nhie_saved_room_id', code);
      localStorage.setItem('nhie_saved_player_name', nhieMyName);
      localStorage.setItem('nhie_saved_active', 'true');

      nhieRouteState(res.roomState);
    });
  });

  // ── Copy Room Code ────────────────────────────────────────────────────────
  btnNhieCopyCode.addEventListener('click', () => {
    if (!nhieRoomId) return;
    navigator.clipboard.writeText(nhieRoomId).then(() => {
      const originalText = btnNhieCopyCode.innerHTML;
      btnNhieCopyCode.innerHTML = '<i data-lucide="check" style="color:var(--nhie-emerald);"></i>';
      lucide.createIcons();
      setTimeout(() => {
        btnNhieCopyCode.innerHTML = originalText;
        lucide.createIcons();
      }, 1500);
    });
  });

  // ── Start Game (Host only) ────────────────────────────────────────────────
  btnNhieStartGame.addEventListener('click', () => {
    if (!nhieIsHost) return;
    socket.emit('nhie-start-game', {}, (res) => {
      if (res && res.error) {
        showModalAlert(res.error, 'Error starting match', 'danger');
      }
    });
  });

  // ── Submit custom statements ──────────────────────────────────────────────
  btnNhieSubmitStatements.addEventListener('click', () => {
    const inputs = nhieStatementInputsContainer.querySelectorAll('input');
    
    // Check if any statements are empty first to avoid partial submissions
    for (let i = 0; i < inputs.length; i++) {
      if (!inputs[i].value.trim()) {
        showModalAlert('Statements cannot be empty!', 'Required Field', 'warning');
        return;
      }
    }

    btnNhieSubmitStatements.disabled = true;
    btnNhieSubmitStatements.textContent = 'Submitting...';
    let index = 0;

    function submitNext() {
      if (index >= inputs.length) {
        btnNhieSubmitStatements.disabled = true;
        btnNhieSubmitStatements.textContent = 'Submitted!';
        return;
      }
      const val = inputs[index].value.trim();

      socket.emit('nhie-submit-statement', { statementText: val }, (res) => {
        if (res.error) {
          showModalAlert(res.error, 'Error submitting statement', 'danger');
          btnNhieSubmitStatements.disabled = false;
          btnNhieSubmitStatements.textContent = 'Submit Statements';
          return;
        }
        index++;
        nhieSubmittedStatements = res.submitted;
        nhieSSubmittedCount.textContent = `Submitted: ${nhieSubmittedStatements} / ${res.total}`;
        submitNext();
      });
    }

    submitNext();
  });

  // ── Submit Answer ─────────────────────────────────────────────────────────
  document.querySelectorAll('#nhie-answer-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      const ans = btn.getAttribute('data-answer');
      const hasDone = (ans === 'have');

      // Hide answer choices immediately to block double click/submissions
      nhieAnswerButtons.classList.add('hidden');
      nhieAnsweredWaiting.classList.remove('hidden');

      socket.emit('nhie-submit-answer', { hasDone }, (res) => {
        if (res.error) {
          // Re-enable/re-show buttons in case of error so they can try again
          nhieAnswerButtons.classList.remove('hidden');
          nhieAnsweredWaiting.classList.add('hidden');
          showModalAlert(res.error, 'Error submitting answer', 'danger');
          return;
        }
      });
    });
  });

  // ── Skip Answering (Host only) ────────────────────────────────────────────
  btnNhieSkipAnswering.addEventListener('click', () => {
    if (!nhieIsHost) return;
    socket.emit('nhie-skip-answering');
  });

  // ── Play Again / Next Round ───────────────────────────────────────────────
  btnNhiePlayAgain.addEventListener('click', () => {
    if (!nhieIsHost) return;
    socket.emit('nhie-next-round');
  });


  // ── STATE ROUTING MACHINE ──────────────────────────────────────────────────
  function nhieRouteState(state) {
    nhieRoomState = state;
    nhieIsHost = (state.hostId === socket.id);
    nhieMyId = socket.id;

    // Check Lobby settings
    nhieSyncSettingsVisibility(state.settings);

    // Sync settings UI controls
    if (nhieIsHost) {
      nhieSettingsControls.classList.remove('hidden');
      nhieSettingsReadonly.classList.add('hidden');
      
      nhieSelectScoreMode.value = state.settings.scoreMode;
      nhieSelectLives.value = state.settings.startingLives;
      nhieSelectStatementTime.value = state.settings.statementTime;
      nhieSelectAnswerTime.value = state.settings.answerTime;
      nhieSelectSystemPrompts.value = state.settings.systemStatementsCount;
      nhieSelectStatementsPerPlayer.value = state.settings.statementsPerPlayer;
    } else {
      nhieSettingsControls.classList.add('hidden');
      nhieSettingsReadonly.classList.remove('hidden');
      
      let srcText = '';
      if (state.settings.statementsPerPlayer > 0 && state.settings.systemStatementsCount > 0) {
        srcText = `Mixed (${state.settings.statementsPerPlayer} custom/player, ${state.settings.systemStatementsCount} system)`;
      } else if (state.settings.statementsPerPlayer > 0) {
        srcText = `Custom only (${state.settings.statementsPerPlayer}/player)`;
      } else {
        srcText = `System only (${state.settings.systemStatementsCount} prompts)`;
      }
      
      const scoreModeText = state.settings.scoreMode === 'SURVIVAL' ? `Survival Mode (${state.settings.startingLives} lives)` : 'Points Mode';

      nhieSettingsReadonly.innerHTML = `
        <div><strong>Score Mode:</strong> ${scoreModeText}</div>
        <div><strong>Statements Source:</strong> ${srcText}</div>
        <div><strong>Statement Time:</strong> ${state.settings.statementTime}s</div>
        <div><strong>Answering Time:</strong> ${state.settings.answerTime}s</div>
      `;
    }

    // ── LOBBY ──
    if (state.status === 'LOBBY') {
      nhieShowScreen(nhieLobbyWaiting);
      nhieDisplayCode.textContent = state.roomId;
      nhiePlayerCount.textContent = `${state.players.length} / 12`;
      nhieRenderLobbyPlayers(state.players);

      const activeCount = state.players.filter(p => p.connected).length;

      if (nhieIsHost) {
        btnNhieStartGame.style.display = 'inline-flex';
        nhieWaitingForHost.style.display = 'none';
        
        if (activeCount >= 2) {
          btnNhieStartGame.disabled = false;
          nhieHostWarning.classList.add('hidden');
        } else {
          btnNhieStartGame.disabled = true;
          nhieHostWarning.classList.remove('hidden');
        }
      } else {
        btnNhieStartGame.style.display = 'none';
        nhieWaitingForHost.style.display = 'block';
        nhieHostWarning.classList.add('hidden');
      }
    }

    // ── STATEMENT INPUT PHASE ──
    else if (state.status === 'STATEMENT_PHASE') {
      nhieShowScreen(nhieStatementPhase);
      nhieRenderPlayersStatus(state.players);

      // Setup input text boxes
      const existingInputs = nhieStatementInputsContainer.querySelectorAll('input').length;
      if (existingInputs !== state.settings.statementsPerPlayer) {
        nhieStatementInputsContainer.innerHTML = '';
        for (let i = 0; i < state.settings.statementsPerPlayer; i++) {
          const wrapper = document.createElement('div');
          wrapper.style.display = 'flex';
          wrapper.style.alignItems = 'center';
          wrapper.style.gap = '8px';

          const span = document.createElement('span');
          span.textContent = `${i + 1}.`;
          span.style.fontFamily = 'Space Grotesk', 'sans-serif';
          span.style.fontWeight = 'bold';

          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'input-field';
          input.placeholder = 'Never have I ever...';
          input.maxLength = 150;

          wrapper.appendChild(span);
          wrapper.appendChild(input);
          nhieStatementInputsContainer.appendChild(wrapper);
        }
        
        btnNhieSubmitStatements.disabled = false;
        btnNhieSubmitStatements.textContent = 'Submit Statements';
        nhieSubmittedStatements = 0;
        nhieSSubmittedCount.textContent = `Submitted: 0 / ${state.settings.statementsPerPlayer}`;
      }

      // Check if self is already ready
      const self = state.players.find(p => p.id === socket.id);
      if (self && self.hasSubmittedStatement) {
        btnNhieSubmitStatements.disabled = true;
        btnNhieSubmitStatements.textContent = 'Submitted!';
      }

      nhieStartLocalCountdown(state.timer, nhieSTimerBar, nhieSTimer);
    }

    // ── ANSWERING PHASE ──
    else if (state.status === 'ANSWERING_PHASE') {
      nhieShowScreen(nhieAnsweringPhase);
      nhieRenderAnsweringChips(state.players);

      const currentQ = state.statements[state.currentStatementIndex];
      nhieStatementText.textContent = currentQ ? `"${currentQ.text}"` : '';
      nhieStatementNumber.textContent = `Statement ${state.currentStatementIndex + 1} of ${state.statements.length}`;

      if (currentQ && currentQ.authorName) {
        nhieStatementAuthor.textContent = `Submitted by: ${currentQ.authorName}`;
      } else {
        nhieStatementAuthor.textContent = '';
      }

      // Sync tally progress
      nhieAnsweredProgress.textContent = `${state.answeredCount} / ${state.players.filter(p => p.connected).length} Answered`;

      // Check if self has answered
      const self = state.players.find(p => p.id === socket.id);
      if (self && self.hasAnswered) {
        nhieAnswerButtons.classList.add('hidden');
        nhieAnsweredWaiting.classList.remove('hidden');
      } else {
        nhieAnswerButtons.classList.remove('hidden');
        nhieAnsweredWaiting.classList.add('hidden');
      }

      // Skip button
      if (nhieIsHost) {
        btnNhieSkipAnswering.style.display = 'inline-block';
      } else {
        btnNhieSkipAnswering.style.display = 'none';
      }

      nhieStartLocalCountdown(state.timer, nhieATimerBar, nhieATimer);
    }

    // ── STATEMENT RESULTS ──
    else if (state.status === 'STATEMENT_RESULTS') {
      nhieShowScreen(nhieStatementResults);

      const currentQ = state.statements[state.currentStatementIndex];
      nhieResultStatementText.textContent = currentQ ? `"${currentQ.text}"` : '';
      if (currentQ && currentQ.authorName) {
        nhieResultAuthor.textContent = `Submitted by: ${currentQ.authorName}`;
      } else {
        nhieResultAuthor.textContent = '';
      }

      // Render Admitted vs Innocent lists
      nhieResultsAdmittedList.innerHTML = '';
      nhieResultsInnocentList.innerHTML = '';

      let haveCount = 0;
      let neverCount = 0;

      if (currentQ && currentQ.answers) {
        state.players.forEach(p => {
          const hasDone = currentQ.answers[p.id];
          const row = document.createElement('div');
          row.className = 'nhie-results-player-row';
          
          if (hasDone === true) {
            haveCount++;
            row.innerHTML = `
              <div class="nhie-avatar-mini" style="${nhieGetAvatarStyle(p.name)}">${p.name.substring(0,2).toUpperCase()}</div>
              <span>${p.name} ${p.id === socket.id ? '(You)' : ''}</span>
            `;
            nhieResultsAdmittedList.appendChild(row);
          } else {
            neverCount++;
            row.innerHTML = `
              <div class="nhie-avatar-mini" style="${nhieGetAvatarStyle(p.name)}">${p.name.substring(0,2).toUpperCase()}</div>
              <span>${p.name} ${p.id === socket.id ? '(You)' : ''}</span>
            `;
            nhieResultsInnocentList.appendChild(row);
          }
        });
      }

      if (haveCount === 0) {
        nhieResultsAdmittedList.innerHTML = '<div style="text-align:center; padding:12px; font-size:12px; opacity:0.5;">Nobody admitted!</div>';
      }
      if (neverCount === 0) {
        nhieResultsInnocentList.innerHTML = '<div style="text-align:center; padding:12px; font-size:12px; opacity:0.5;">Everyone has done it!</div>';
      }

      // Render updated scoreboard list
      nhieResultScoresList.innerHTML = '';
      state.players.forEach(p => {
        const row = document.createElement('div');
        row.className = 'nhie-results-score-row';
        
        let scorePill = '';
        if (state.settings.scoreMode === 'SURVIVAL') {
          if (p.score <= 0) {
            scorePill = '<span class="nhie-score-pill dead">💀 ELIMINATED</span>';
          } else {
            scorePill = `<span class="nhie-score-pill survival">❤️ ${p.score} Lives</span>`;
          }
        } else {
          scorePill = `<span class="nhie-score-pill points">🍷 ${p.score} Pts</span>`;
        }

        // Show indicator if player admitted on this statement
        const didAdmit = currentQ?.answers[p.id] === true;
        const diffText = didAdmit ? 
          (state.settings.scoreMode === 'SURVIVAL' ? '<span style="color:var(--color-danger); margin-left:6px;">-1❤️</span>' : '<span style="color:var(--nhie-emerald); margin-left:6px;">+1 Pt</span>') : '';

        row.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; min-width: 0; flex-shrink: 1;">
            <div class="nhie-avatar-mini" style="flex-shrink:0; ${nhieGetAvatarStyle(p.name)}">${p.name.substring(0,2).toUpperCase()}</div>
            <span style="font-weight:600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.name}</span>
            <span style="flex-shrink: 0; white-space: nowrap;">${diffText}</span>
          </div>
          <div style="flex-shrink: 0; margin-left: 8px;">${scorePill}</div>
        `;
        nhieResultScoresList.appendChild(row);
      });

      nhieStartLocalCountdown(state.timer, nhieRTimerBar, nhieRTimer);
    }

    // ── FINAL SCORES ──
    else if (state.status === 'FINAL_SCORES') {
      nhieShowScreen(nhieFinalScores);
      
      // Determine ranking
      const ranked = [...state.players].sort((a, b) => b.score - a.score);

      // Winner text
      if (ranked.length > 0) {
        if (state.settings.scoreMode === 'SURVIVAL') {
          // Survivors are those with score > 0.
          const survivors = ranked.filter(p => p.score > 0);
          if (survivors.length > 0) {
            const listStr = survivors.map(s => s.name).join(', ');
            nhieWinnerAnnouncement.innerHTML = `Survival Champions: <span style="color:var(--nhie-rose);">${listStr}</span>`;
          } else {
            // Find who survived longest (highest remaining score)
            const highestScore = ranked[0].score;
            const topSurvivors = ranked.filter(p => p.score === highestScore);
            const listStr = topSurvivors.map(s => s.name).join(', ');
            nhieWinnerAnnouncement.innerHTML = `Top Survivors: <span style="color:var(--nhie-rose);">${listStr}</span>`;
          }
        } else {
          // Points mode: Highest score wins
          const topScore = ranked[0].score;
          const winners = ranked.filter(p => p.score === topScore);
          const listStr = winners.map(w => w.name).join(', ');
          nhieWinnerAnnouncement.innerHTML = `Most Adventurous: <span style="color:var(--nhie-rose);">${listStr}</span> (${topScore} pts)`;
        }
      }

      // Render Leaderboard Grid
      nhieFinalLeaderboard.innerHTML = '';
      ranked.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = 'nhie-final-leaderboard-row' + (idx === 0 ? ' winner' : '');
        
        let scoreDisplay = '';
        if (state.settings.scoreMode === 'SURVIVAL') {
          scoreDisplay = p.score <= 0 ? '💀 ELIMINATED' : `❤️ ${p.score} Lives Left`;
        } else {
          scoreDisplay = `🍷 ${p.score} Points`;
        }

        row.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-family:'Orbitron',sans-serif; font-weight:bold; font-size:16px; width:24px; opacity:0.8;">#${idx+1}</span>
            <div class="nhie-avatar" style="${nhieGetAvatarStyle(p.name)}">${p.name.substring(0,2).toUpperCase()}</div>
            <span style="font-weight:600; font-family:'Space Grotesk',sans-serif;">${p.name} ${p.id === socket.id ? '(You)' : ''}</span>
          </div>
          <span style="font-family:'Orbitron',sans-serif; font-weight:700;">${scoreDisplay}</span>
        `;
        nhieFinalLeaderboard.appendChild(row);
      });

      // Show reset controls
      if (nhieIsHost) {
        btnNhiePlayAgain.style.display = 'inline-flex';
        nhiePlayAgainWait.style.display = 'none';
      } else {
        btnNhiePlayAgain.style.display = 'none';
        nhiePlayAgainWait.style.display = 'block';
      }
    }

    lucide.createIcons();
  }

  // ── Sockets Events handlers ────────────────────────────────────────────────

  socket.on('nhie-room-updated', (state) => {
    nhieRouteState(state);
  });

  socket.on('nhie-phase-changed', (data) => {
    if (!nhieRoomState) return;
    nhieRoomState.status = data.status;
    nhieRoomState.timer = data.timer;
    
    if (data.currentQuestionIndex !== undefined) nhieRoomState.currentStatementIndex = data.currentQuestionIndex;
    if (data.currentQuestion !== undefined) {
      if (!nhieRoomState.statements) nhieRoomState.statements = [];
      nhieRoomState.statements[data.currentQuestionIndex] = data.currentQuestion;
    }

    nhieRouteState(nhieRoomState);
  });

  socket.on('nhie-timer-update', (timeLeft) => {
    if (!nhieRoomState) return;
    nhieRoomState.timer = timeLeft;

    // Update active timers
    if (nhieRoomState.status === 'STATEMENT_PHASE') {
      nhieSTimer.textContent = timeLeft;
    } else if (nhieRoomState.status === 'ANSWERING_PHASE') {
      nhieATimer.textContent = timeLeft;
    } else if (nhieRoomState.status === 'STATEMENT_RESULTS') {
      nhieRTimer.textContent = timeLeft;
    }
  });


  // ── Game History Modal & List Details ────────────────────────────────────
  const nhieHistoryList = document.getElementById('nhie-history-list');
  const btnNhieRefreshHistory = document.getElementById('btn-nhie-refresh-history');
  const nhieHistoryModal = document.getElementById('nhie-history-modal');
  const btnNhieCloseModal = document.getElementById('btn-nhie-close-modal');
  const nhieModalTitle = document.getElementById('nhie-modal-title');
  const nhieModalSubtitle = document.getElementById('nhie-modal-subtitle');
  const nhieModalScoreboard = document.getElementById('nhie-modal-scoreboard');
  const nhieModalStatements = document.getElementById('nhie-modal-statements');

  async function nhieLoadHistory() {
    if (!nhieHistoryList) return;
    nhieHistoryList.innerHTML = '<div class="nhie-history-empty">Loading history...</div>';
    try {
      const res = await fetch('/api/nhie/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      
      if (!data || data.length === 0) {
        nhieHistoryList.innerHTML = '<div class="nhie-history-empty">No games recorded yet. Play a game to see it here!</div>';
        return;
      }
      
      nhieHistoryList.innerHTML = '';
      data.forEach(game => {
        const dateStr = new Date(game.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const card = document.createElement('div');
        card.className = 'nhie-history-card';
        card.innerHTML = `
          <div class="nhie-hc-meta">
            <span class="nhie-hc-room">Room ${game.roomCode}</span>
            <span class="nhie-hc-date">${dateStr}</span>
          </div>
          <div class="nhie-hc-stats">
            <span><i data-lucide="users" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i>${game.playerCount} Players</span>
            <span><i data-lucide="crown" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle; color: gold;"></i>Winner: ${game.winnerName} (${game.winnerScore} pts)</span>
          </div>
        `;
        card.addEventListener('click', () => nhieShowGameDetails(game.id));
        nhieHistoryList.appendChild(card);
      });
      lucide.createIcons();
    } catch (err) {
      console.error('Error loading NHIE history:', err);
      nhieHistoryList.innerHTML = '<div class="nhie-history-empty error">Failed to load history. Please ensure Supabase tables are created.</div>';
    }
  }

  async function nhieShowGameDetails(gameId) {
    if (!nhieHistoryModal) return;
    try {
      const res = await fetch(`/api/nhie/history/${gameId}`);
      if (!res.ok) throw new Error('Failed to fetch game details');
      const game = await res.json();

      const dateStr = new Date(game.created_at).toLocaleString();
      nhieModalTitle.textContent = `Room ${game.room_code}`;
      nhieModalSubtitle.textContent = `Played on ${dateStr}`;

      // 1. Render scoreboard
      nhieModalScoreboard.innerHTML = '';
      game.nhie_players.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = 'nhie-modal-scoreboard-row';
        row.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-family:'Orbitron',sans-serif; font-weight:bold; font-size:12px; width:16px;">#${idx+1}</span>
            <div class="nhie-avatar-mini" style="width:20px; height:20px; font-size:8px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; ${nhieGetAvatarStyle(p.name)}">${p.name.substring(0,2).toUpperCase()}</div>
            <span style="font-weight:600;">${p.name}</span>
          </div>
          <span style="font-family:'Orbitron',sans-serif; font-weight:700;">Score/Lives: ${p.score}</span>
        `;
        nhieModalScoreboard.appendChild(row);
      });

      // 2. Render statements & answers breakdown
      nhieModalStatements.innerHTML = '';
      if (game.nhie_statements && game.nhie_statements.length > 0) {
        game.nhie_statements.forEach((s, idx) => {
          const card = document.createElement('div');
          card.className = 'nhie-modal-statement-card';
          
          let badgesHTML = '';
          if (s.nhie_answers && s.nhie_answers.length > 0) {
            s.nhie_answers.forEach(ans => {
              const typeClass = ans.has_done ? 'have' : 'never';
              const typeText = ans.has_done ? '🍷 I HAVE' : '😇 NEVER';
              badgesHTML += `
                <span class="nhie-modal-answer-badge ${typeClass}">
                  <strong>${ans.player_name}:</strong> ${typeText}
                </span>
              `;
            });
          } else {
            badgesHTML = '<span style="font-size:11px; opacity:0.5;">No response logs.</span>';
          }

          card.innerHTML = `
            <div class="nhie-modal-statement-header">${idx+1}. "${s.text}" <span style="font-size:0.8em; opacity:0.6; font-weight:normal;">(Author: ${s.author_name || 'System'})</span></div>
            <div class="nhie-modal-statement-answers">${badgesHTML}</div>
          `;
          nhieModalStatements.appendChild(card);
        });
      } else {
        nhieModalStatements.innerHTML = '<div style="font-size:13px; opacity:0.6; text-align:center; padding:12px;">No statements logged.</div>';
      }

      nhieHistoryModal.classList.remove('hidden');
    } catch (err) {
      console.error('Error displaying NHIE game details:', err);
      showModalAlert('Could not fetch details for this game.', 'Error', 'danger');
    }
  }

  if (btnNhieRefreshHistory) {
    btnNhieRefreshHistory.addEventListener('click', nhieLoadHistory);
  }
  if (btnNhieCloseModal) {
    btnNhieCloseModal.addEventListener('click', () => {
      nhieHistoryModal.classList.add('hidden');
    });
  }

  // Close history modal on backdrop click
  if (nhieHistoryModal) {
    nhieHistoryModal.addEventListener('click', (e) => {
      if (e.target === nhieHistoryModal) {
        nhieHistoryModal.classList.add('hidden');
      }
    });
  }


  // ── Auto-reconnect session recovery on page load (Never Have I Ever) ────
  const savedNhieRoomId = sessionStorage.getItem('nhie_room_id');
  const savedNhiePlayerName = sessionStorage.getItem('nhie_player_name');
  const nhieActive = sessionStorage.getItem('nhie_active');

  if (savedNhieRoomId && savedNhiePlayerName && nhieActive === 'true') {
    socket.emit('nhie-join', { roomId: savedNhieRoomId, playerName: savedNhiePlayerName }, (res) => {
      if (res && !res.error) {
        nhieMyName = savedNhiePlayerName;
        nhieRoomId = savedNhieRoomId;
        nhieIsHost = (res.roomState.hostId === socket.id);
        nhieMyId = socket.id;

        // Restore view to games tab and nhie screen
        switchView('games');
        localStorage.setItem('active_game', 'nhie');
        gamesListView.classList.add('hidden');
        nhieGameView.classList.remove('hidden');

        nhieRouteState(res.roomState);
      } else {
        sessionStorage.removeItem('nhie_room_id');
        sessionStorage.removeItem('nhie_player_name');
        sessionStorage.removeItem('nhie_active');
      }
    });
  }

  // ==========================================================================
  // Admin & Owner Portal Logic
  // ==========================================================================
  
  let adminUsers = [];
  let adminBookmarks = [];

  // Admin tabs switching
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-admin-tab');
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetContent = document.getElementById(`admin-tab-${tabName}`);
      if (targetContent) targetContent.classList.add('active');
      
      loadAdminTab(tabName);
    });
  });

  window.loadAdminTab = async function(tabName) {
    const token = localStorage.getItem('owner_token');
    if (!token) return;

    if (tabName === 'overview') {
      await loadAdminOverview(token);
    } else if (tabName === 'users') {
      await loadAdminUsers(token);
    } else if (tabName === 'bookmarks') {
      await loadAdminBookmarks(token);
    } else if (tabName === 'analytics') {
      await loadAdminAnalytics(token);
    }
  };

  async function loadAdminOverview(token) {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'x-owner-token': token }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      
      // Update stats cards
      document.getElementById('admin-stat-users').textContent = data.stats.users;
      document.getElementById('admin-stat-bookmarks').textContent = data.stats.bookmarks;
      document.getElementById('admin-stat-downloads').textContent = data.stats.activeDownloads;
      
      // Format uptime
      const hrs = Math.floor(data.uptime / 3600);
      const mins = Math.floor((data.uptime % 3600) / 60);
      const secs = Math.floor(data.uptime % 60);
      document.getElementById('admin-stat-uptime').textContent = `${hrs}h ${mins}m ${secs}s`;

      // Update spec details
      document.getElementById('admin-spec-os').textContent = data.system.platform;
      document.getElementById('admin-spec-arch').textContent = data.system.arch;
      document.getElementById('admin-spec-cpus').textContent = `${data.system.cpus} Cores`;
      document.getElementById('admin-spec-mem').textContent = `${(data.system.freeMem / 1024 / 1024 / 1024).toFixed(2)} GB / ${(data.system.totalMem / 1024 / 1024 / 1024).toFixed(2)} GB Free`;
      document.getElementById('admin-spec-node-mem').textContent = `${(data.memory.rss / 1024 / 1024).toFixed(1)} MB`;
    } catch (err) {
      console.error('Stats loading error:', err);
    }
  }

  async function loadAdminUsers(token) {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'x-owner-token': token }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      adminUsers = await response.json();
      renderAdminUsers(adminUsers);
    } catch (err) {
      console.error('Users loading error:', err);
    }
  }

  function renderAdminUsers(users) {
    const listBody = document.getElementById('admin-users-list');
    listBody.innerHTML = '';
    if (!users || users.length === 0) {
      listBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">No guest user accounts found.</td></tr>';
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
      
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${u.username}</td>
        <td>${regDate}</td>
        <td style="text-align: right;">
          <div class="admin-actions">
            <button class="btn-admin-action reset-pw" title="Reset Password">
              <i data-lucide="key-round"></i>
            </button>
            <button class="btn-admin-action delete" title="Delete User">
              <i data-lucide="user-minus"></i>
            </button>
          </div>
        </td>
      `;
      
      // Reset Password Handler
      tr.querySelector('.reset-pw').addEventListener('click', async () => {
        const username = u.username;
        const newPassword = prompt(`Enter new password for guest user "${username}":`);
        if (newPassword === null) return;
        if (newPassword.trim().length < 4) {
          await showModalAlert('Password must be at least 4 characters long.', 'Invalid Password', 'error');
          return;
        }
        
        try {
          const res = await fetch(`/api/admin/users/${username}/reset-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-owner-token': localStorage.getItem('owner_token')
            },
            body: JSON.stringify({ newPassword: newPassword.trim() })
          });
          const result = await res.json();
          if (res.ok) {
            await showModalAlert(result.message, 'Password Reset Success', 'success');
          } else {
            await showModalAlert(result.error, 'Reset Failed', 'error');
          }
        } catch (e) {
          await showModalAlert('Failed to reset password.', 'Error', 'error');
        }
      });

      // Delete User Handler
      tr.querySelector('.delete').addEventListener('click', async () => {
        const username = u.username;
        const confirmed = await showModalConfirm(`Are you sure you want to permanently delete the guest account "${username}"? All their session access will be revoked.`, 'Delete Guest Account');
        if (!confirmed) return;

        try {
          const res = await fetch(`/api/admin/users/${username}`, {
            method: 'DELETE',
            headers: {
              'x-owner-token': localStorage.getItem('owner_token')
            }
          });
          const result = await res.json();
          if (res.ok) {
            await showModalAlert(result.message, 'User Deleted', 'success');
            loadAdminUsers(localStorage.getItem('owner_token'));
          } else {
            await showModalAlert(result.error, 'Delete Failed', 'error');
          }
        } catch (e) {
          await showModalAlert('Failed to delete account.', 'Error', 'error');
        }
      });

      listBody.appendChild(tr);
    });

    lucide.createIcons();
  }

  // Filter users search
  document.getElementById('admin-users-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = adminUsers.filter(u => u.username.toLowerCase().includes(query));
    renderAdminUsers(filtered);
  });

  async function loadAdminBookmarks(token) {
    try {
      const response = await fetch('/api/links');
      if (!response.ok) throw new Error('Failed to fetch bookmarks');
      adminBookmarks = await response.json();
      renderAdminBookmarks(adminBookmarks);
    } catch (err) {
      console.error('Bookmarks loading error:', err);
    }
  }

  function renderAdminBookmarks(bookmarks) {
    const listBody = document.getElementById('admin-bookmarks-list');
    listBody.innerHTML = '';
    if (!bookmarks || bookmarks.length === 0) {
      listBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No bookmarks found.</td></tr>';
      return;
    }

    bookmarks.forEach(bm => {
      const tr = document.createElement('tr');
      
      let iconHtml = `<div class="admin-favicon"><i data-lucide="globe" style="width:14px; height:14px; color:var(--text-muted)"></i></div>`;
      if (bm.favicon) {
        if (bm.favicon.startsWith('letter:')) {
          const letter = bm.favicon.split(':')[1];
          iconHtml = `<div class="admin-favicon" style="font-weight:700; color:var(--accent-purple); font-size:12px;">${letter}</div>`;
        } else if (bm.favicon.startsWith('icon:')) {
          const icon = bm.favicon.split(':')[1];
          iconHtml = `<div class="admin-favicon"><i data-lucide="${icon}" style="width:14px; height:14px; color:var(--accent-cyan)"></i></div>`;
        } else {
          iconHtml = `<div class="admin-favicon"><img src="${bm.favicon}" onerror="this.src='blend_icon.png'"></div>`;
        }
      }

      tr.innerHTML = `
        <td style="width: 50px;">${iconHtml}</td>
        <td>
          <span class="admin-table-title">${bm.title}</span>
          <span class="admin-table-url" title="${bm.url}">${bm.url}</span>
        </td>
        <td><span class="category-tag ${getCategoryColorClass(bm.category)}" style="font-size: 11px; padding: 2px 6px;">${bm.category}</span></td>
        <td style="font-weight: 500;">${bm.addedBy || 'Owner'}</td>
        <td style="text-align: right;">
          <div class="admin-actions">
            <button class="btn-admin-action edit-btn" title="Edit Bookmark">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="btn-admin-action delete" title="Delete Bookmark">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;

      // Edit Bookmark Hook
      tr.querySelector('.edit-btn').addEventListener('click', () => {
        editingLinkId = bm.id;
        linkUrlInput.value = bm.url;
        linkTitleInput.value = bm.title;
        linkCategorySelect.value = bm.category;
        
        let selectVal = 'auto';
        if (bm.favicon && bm.favicon.startsWith('letter:')) {
          selectVal = 'letter';
        } else if (bm.favicon && bm.favicon.startsWith('icon:')) {
          selectVal = bm.favicon;
        }
        linkIconSelect.value = selectVal;

        switchView('linksaver');
        const form = document.getElementById('linksaver-form');
        form.classList.remove('hidden');
        const submitBtnSpan = document.getElementById('btn-save-bookmark').querySelector('span');
        if (submitBtnSpan) submitBtnSpan.textContent = 'Update Bookmark';
      });

      // Delete Bookmark Hook
      tr.querySelector('.delete').addEventListener('click', async () => {
        const confirmed = await showModalConfirm('Are you sure you want to delete this bookmark?', 'Delete Bookmark');
        if (!confirmed) return;

        try {
          const response = await fetch(`/api/links/${bm.id}`, {
            method: 'DELETE',
            headers: {
              'x-user-name': 'Owner',
              'x-owner-token': localStorage.getItem('owner_token')
            }
          });
          const result = await response.json();
          if (response.ok && result.message) {
            await showModalAlert(result.message, 'Bookmark Deleted', 'success');
            loadAdminBookmarks(localStorage.getItem('owner_token'));
          } else {
            await showModalAlert(result.error || 'Failed to delete bookmark.', 'Delete Error', 'error');
          }
        } catch (e) {
          console.error(e);
          await showModalAlert('Network error occurred.', 'Error', 'error');
        }
      });

      listBody.appendChild(tr);
    });

    lucide.createIcons();
  }

  // Filter bookmarks search
  document.getElementById('admin-bookmarks-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = adminBookmarks.filter(bm => 
      bm.title.toLowerCase().includes(query) ||
      bm.url.toLowerCase().includes(query) ||
      (bm.addedBy || 'owner').toLowerCase().includes(query)
    );
    renderAdminBookmarks(filtered);
  });

  // Change owner password handler
  document.getElementById('owner-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('owner-current-password').value;
    const newPassword = document.getElementById('owner-new-password').value;
    const confirmPassword = document.getElementById('owner-confirm-password').value;

    if (newPassword !== confirmPassword) {
      await showModalAlert('New passwords do not match!', 'Validation Error', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': localStorage.getItem('owner_token')
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const result = await res.json();
      if (res.ok) {
        await showModalAlert(result.message, 'Password Changed', 'success');
        document.getElementById('owner-password-form').reset();
      } else {
        await showModalAlert(result.error, 'Update Failed', 'error');
      }
    } catch (e) {
      await showModalAlert('Connection error updating password.', 'Error', 'error');
    }
  });

  // Clean Temp Operations Handler
  document.getElementById('btn-admin-clean-temp').addEventListener('click', async () => {
    const confirmed = await showModalConfirm('Are you sure you want to purge all downloaded files in the temporary folder?', 'Purge Temp Files');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/clean-temp', {
        method: 'POST',
        headers: { 'x-owner-token': localStorage.getItem('owner_token') }
      });
      const result = await res.json();
      if (res.ok) {
        await showModalAlert(result.message, 'Cleanup Complete', 'success');
      } else {
        await showModalAlert(result.error, 'Cleanup Failed', 'error');
      }
    } catch (e) {
      await showModalAlert('Connection error cleaning files.', 'Error', 'error');
    }
  });

  // Export DB backup handler
  document.getElementById('btn-admin-export').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/export', {
        headers: { 'x-owner-token': localStorage.getItem('owner_token') }
      });
      if (!res.ok) throw new Error('Backup failed');
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `touchme_portal_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      await showModalAlert('Failed to export backup.', 'Export Error', 'error');
    }
  });

  // ==========================================================================
  // Analytics & Activity Log Dashboard Controller
  // ==========================================================================
  
  let adminActivityLogs = [];

  async function loadAdminAnalytics(token) {
    try {
      const response = await fetch('/api/admin/analytics', {
        headers: { 'x-owner-token': token }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      
      const counts = data.counts || {};
      adminActivityLogs = data.logs || [];
      
      // Calculate total views
      const totalViews = Object.values(counts).reduce((a, b) => a + b, 0);
      document.getElementById('analytics-total-views').textContent = totalViews;

      // Render section progress bars
      const sectionContainer = document.getElementById('analytics-sections-container');
      sectionContainer.innerHTML = '';

      const sectionMetadata = [
        { id: 'dashboard', name: 'Dashboard', class: 'dashboard' },
        { id: 'downloader', name: 'Media Downloader', class: 'downloader' },
        { id: 'linksaver', name: 'Link Saver', class: 'linksaver' },
        { id: 'games', name: 'Arcade Zone', class: 'games' },
        { id: 'admin', name: 'Admin Portal', class: 'admin' }
      ];

      sectionMetadata.forEach(sec => {
        const count = counts[sec.id] || 0;
        const percentage = totalViews > 0 ? ((count / totalViews) * 100).toFixed(1) : '0.0';
        
        const row = document.createElement('div');
        row.className = 'analytics-section-row';
        row.innerHTML = `
          <div class="analytics-label-row">
            <span class="analytics-section-title">${sec.name}</span>
            <span class="analytics-section-percentage">${count} views (${percentage}%)</span>
          </div>
          <div class="analytics-bar-bg">
            <div class="analytics-bar-fill ${sec.class}" style="width: ${percentage}%"></div>
          </div>
        `;
        sectionContainer.appendChild(row);
      });

      // Render activity feed logs
      renderAdminAuditLog(adminActivityLogs);
    } catch (err) {
      console.error('Analytics loading error:', err);
    }
  }

  function renderAdminAuditLog(logs) {
    const feed = document.getElementById('admin-audit-log');
    feed.innerHTML = '';
    if (!logs || logs.length === 0) {
      feed.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">No activity logs available.</div>';
      return;
    }

    logs.forEach(log => {
      const row = document.createElement('div');
      row.className = 'audit-row';
      
      const timeStr = new Date(log.timestamp).toLocaleString();
      let roleClass = 'role-guest';
      if (log.username.toLowerCase() === 'owner') {
        roleClass = 'role-owner';
      } else if (log.username.toLowerCase() !== 'guest') {
        roleClass = 'role-guest-auth';
      }

      row.innerHTML = `
        <span class="audit-time">${timeStr}</span>
        <span class="audit-user ${roleClass}">${log.username}</span>
        <span class="audit-action">${log.action}</span>
        <span class="audit-ip">${log.ip}</span>
      `;
      feed.appendChild(row);
    });
  }

  // Filter activity search
  document.getElementById('admin-activity-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = adminActivityLogs.filter(log => 
      log.username.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.ip.toLowerCase().includes(query)
    );
    renderAdminAuditLog(filtered);
  });

});

