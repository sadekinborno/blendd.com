/* ==========================================================================
   blend.com | Frontend Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- Initialize Lucide Icons ---
  lucide.createIcons();

  // --- Sidebar Collapse functionality ---
  const sidebar = document.querySelector('.sidebar');
  const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
  
  if (btnSidebarToggle && sidebar) {
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
      sidebar.classList.add('collapsed');
      const icon = btnSidebarToggle.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', 'chevron-right');
      }
      lucide.createIcons();
    }

    btnSidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const nowCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebar-collapsed', nowCollapsed);
      
      const icon = btnSidebarToggle.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', nowCollapsed ? 'chevron-right' : 'chevron-left');
        lucide.createIcons();
      }
    });
  }

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

  function showModalPrompt(message, title = 'Input Required', defaultValue = '') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';

      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim">
          <div class="modal-header">
            <i data-lucide="edit-3" class="modal-icon confirm"></i>
            <h3>${title}</h3>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: 10px;">
            <p>${message}</p>
            <input type="text" class="modal-input" value="${defaultValue}" style="width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; outline: none; font-size: 14px;" />
          </div>
          <div class="modal-footer" style="gap: 12px; margin-top: 16px;">
            <button class="btn-secondary btn-modal-cancel">Cancel</button>
            <button class="btn-primary btn-modal-submit">Submit</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      lucide.createIcons();

      const modalInput = overlay.querySelector('.modal-input');
      modalInput.focus();
      modalInput.select();

      const btnCancel = overlay.querySelector('.btn-modal-cancel');
      const btnSubmit = overlay.querySelector('.btn-modal-submit');

      const closeWithVal = (val) => {
        overlay.classList.remove('active');
        const modal = overlay.querySelector('.custom-modal');
        if (modal) {
          modal.classList.remove('popup-anim');
          modal.classList.add('popout-anim');
        }
        setTimeout(() => {
          overlay.remove();
          resolve(val);
        }, 150);
      };

      btnCancel.addEventListener('click', () => closeWithVal(null));
      btnSubmit.addEventListener('click', () => closeWithVal(modalInput.value));
      modalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          closeWithVal(modalInput.value);
        } else if (e.key === 'Escape') {
          closeWithVal(null);
        }
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeWithVal(null);
      });
    });
  }

  // Helper: Open Unified account auth modal (Guest Login/Signup & Owner Login)
  function showGlobalAuthModal(defaultTab = 'guest') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';

      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim" style="max-width: 390px; width: 100%;">
          <div class="modal-header">
            <i data-lucide="shield-check" class="modal-icon info" style="color: var(--accent-cyan);"></i>
            <h3 id="global-auth-title">Account Portal</h3>
          </div>
          <div class="modal-body">
            <!-- Tabs -->
            <div class="auth-portal-tabs">
              <button type="button" class="auth-portal-tab-btn ${defaultTab === 'guest' ? 'active' : ''}" id="tab-btn-guest">
                <i data-lucide="user" style="width: 14px; height: 14px;"></i> Guest Access
              </button>
              <button type="button" class="auth-portal-tab-btn ${defaultTab === 'owner' ? 'active' : ''}" id="tab-btn-owner">
                <i data-lucide="shield" style="width: 14px; height: 14px;"></i> Owner Console
              </button>
            </div>

            <!-- Guest Account Panel -->
            <div id="panel-guest" class="auth-panel-content" style="display: ${defaultTab === 'guest' ? 'block' : 'none'};">
              <!-- Subtabs (Login / Signup) -->
              <div id="guest-credentials-area">
                <div class="auth-tab-rail" style="margin-bottom: 16px;">
                  <div class="auth-tab-indicator" id="guest-subtab-indicator"></div>
                  <button type="button" class="auth-tab-btn active" id="btn-guest-subtab-login" style="padding: 6px 0;">Log In</button>
                  <button type="button" class="auth-tab-btn" id="btn-guest-subtab-signup" style="padding: 6px 0;">Sign Up</button>
                </div>

                <form id="form-guest-auth" style="display: flex; flex-direction: column; gap: 14px;">
                  <div class="auth-field-group">
                    <i data-lucide="user" class="auth-field-icon"></i>
                    <input type="text" id="guest-username" required placeholder="Username" autocomplete="username">
                  </div>
                  <div class="auth-field-group">
                    <i data-lucide="lock" class="auth-field-icon"></i>
                    <input type="password" id="guest-password" required placeholder="Password" autocomplete="current-password">
                    <button type="button" class="auth-pw-toggle" id="toggle-guest-pw" tabindex="-1"><i data-lucide="eye"></i></button>
                  </div>
                  <!-- Signup-only: confirm password + strength -->
                  <div id="signup-extra-fields" style="display:none; flex-direction:column; gap:10px;">
                    <div class="auth-field-group">
                      <i data-lucide="shield-check" class="auth-field-icon"></i>
                      <input type="password" id="guest-confirm-password" placeholder="Confirm password" autocomplete="new-password">
                      <button type="button" class="auth-pw-toggle" id="toggle-guest-confirm-pw" tabindex="-1"><i data-lucide="eye"></i></button>
                    </div>
                    <span id="guest-confirm-match" class="auth-signup-confirm-msg" style="display:none;"></span>
                    <div class="pw-strength-bar-bg">
                      <div id="guest-pw-strength-fill" class="strength-bar-fill" style="width:0%;"></div>
                    </div>
                    <span id="guest-pw-strength-label" style="font-size:11px;color:var(--text-muted);"></span>
                  </div>
                  <div id="guest-auth-error" class="auth-error-msg" style="display:none; color: var(--accent-pink); font-size: 12px; margin-top: 2px;"></div>
                  
                  <button type="submit" class="auth-submit-btn" id="btn-guest-auth-submit" style="margin-top: 4px; padding: 10px;">
                    <span id="guest-submit-text">Log In</span>
                    <i data-lucide="arrow-right" class="auth-submit-icon"></i>
                  </button>
                  <button type="button" class="auth-forgot-link" id="btn-guest-forgot" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 12px; margin-top: 6px; text-align: center; font-family: inherit;">
                    Forgot password?
                  </button>
                </form>
              </div>

              <!-- Guest Reset Form (hidden by default) -->
              <div id="panel-guest-reset" style="display: none; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <button type="button" id="btn-guest-reset-back" style="background: none; border: none; color: var(--accent-cyan); cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px; padding: 0; font-family: inherit;">
                    <i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i> Back to Login
                  </button>
                  <h4 style="margin: 0; font-size: 14px; color: var(--text-primary);">Reset Password</h4>
                </div>
                <form id="form-guest-reset" style="display: flex; flex-direction: column; gap: 14px;">
                  <div class="auth-field-group">
                    <i data-lucide="user" class="auth-field-icon"></i>
                    <input type="text" id="reset-username" required placeholder="Your username" autocomplete="username">
                  </div>
                  <div class="auth-field-group">
                    <i data-lucide="key" class="auth-field-icon"></i>
                    <input type="text" id="reset-code" required placeholder="Recovery code (e.g. BORNO-XXXX-XXXX)" style="text-transform: uppercase;">
                  </div>
                  <div class="auth-field-group">
                    <i data-lucide="lock" class="auth-field-icon"></i>
                    <input type="password" id="reset-newpw" required placeholder="New password" autocomplete="new-password">
                  </div>
                  <div class="auth-field-group">
                    <i data-lucide="shield-check" class="auth-field-icon"></i>
                    <input type="password" id="reset-confirmpw" required placeholder="Confirm new password" autocomplete="new-password">
                  </div>
                  <div id="guest-reset-error" class="auth-error-msg" style="display:none; color: var(--accent-pink); font-size: 12px; margin-top: 2px;"></div>
                  
                  <button type="submit" class="auth-submit-btn" style="margin-top: 4px; padding: 10px;">
                    <span>Reset Password</span>
                    <i data-lucide="check" class="auth-submit-icon"></i>
                  </button>
                </form>
              </div>
            </div>

            <!-- Owner Console Panel -->
            <div id="panel-owner" class="auth-panel-content" style="display: ${defaultTab === 'owner' ? 'block' : 'none'};">
              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 14px;">
                Enter admin credentials to authorize Owner Mode.
              </p>
              <form id="form-owner-auth" style="display: flex; flex-direction: column; gap: 14px;">
                <div class="auth-field-group">
                  <i data-lucide="user" class="auth-field-icon"></i>
                  <input type="text" id="owner-username" required placeholder="Admin Username" autocomplete="username">
                </div>
                <div class="auth-field-group">
                  <i data-lucide="lock" class="auth-field-icon"></i>
                  <input type="password" id="owner-password" required placeholder="Password" autocomplete="current-password">
                </div>
                <div id="owner-auth-error" class="auth-error-msg" style="display:none; color: var(--accent-pink); font-size: 12px; margin-top: 2px;"></div>
                
                <button type="submit" class="auth-submit-btn" style="margin-top: 4px; padding: 10px;">
                  <span>Authenticate Owner</span>
                  <i data-lucide="shield-check" class="auth-submit-icon"></i>
                </button>
              </form>
            </div>
          </div>
          <div class="modal-footer" style="padding-top: 8px;">
            <button class="btn-secondary btn-modal-close" style="width: 100%; padding: 10px;">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      lucide.createIcons();

      const btnClose = overlay.querySelector('.btn-modal-close');
      const tabBtnGuest = overlay.querySelector('#tab-btn-guest');
      const tabBtnOwner = overlay.querySelector('#tab-btn-owner');
      const panelGuest = overlay.querySelector('#panel-guest');
      const panelOwner = overlay.querySelector('#panel-owner');

      const btnGuestSubtabLogin = overlay.querySelector('#btn-guest-subtab-login');
      const btnGuestSubtabSignup = overlay.querySelector('#btn-guest-subtab-signup');
      const guestSubtabIndicator = overlay.querySelector('#guest-subtab-indicator');
      const guestSubmitText = overlay.querySelector('#guest-submit-text');
      const guestUsernameInput = overlay.querySelector('#guest-username');
      const guestPasswordInput = overlay.querySelector('#guest-password');
      const signupExtraFields = overlay.querySelector('#signup-extra-fields');
      const guestConfirmPasswordInput = overlay.querySelector('#guest-confirm-password');
      const guestConfirmMatch = overlay.querySelector('#guest-confirm-match');
      const guestPwStrengthFill = overlay.querySelector('#guest-pw-strength-fill');
      const guestPwStrengthLabel = overlay.querySelector('#guest-pw-strength-label');

      const guestCredentialsArea = overlay.querySelector('#guest-credentials-area');
      const panelGuestReset = overlay.querySelector('#panel-guest-reset');
      const btnGuestForgot = overlay.querySelector('#btn-guest-forgot');
      const btnGuestResetBack = overlay.querySelector('#btn-guest-reset-back');

      let currentPortalTab = defaultTab;
      let currentGuestTab = 'login'; // login or signup

      // Password strength helper
      function getPasswordStrength(pw) {
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return score;
      }

      function updateStrengthBar(pw, fill, label) {
        const score = getPasswordStrength(pw);
        const widths = ['0%', '20%', '40%', '65%', '85%', '100%'];
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4'];
        const labels = ['', 'Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
        fill.style.width = pw.length > 0 ? widths[score] : '0%';
        fill.style.background = colors[score];
        label.textContent = pw.length > 0 ? labels[score] : '';
        label.style.color = colors[score];
      }

      // Pw toggle helper
      function wireToggle(btn, input) {
        if (!btn || !input) return;
        btn.addEventListener('click', () => {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
          lucide.createIcons();
        });
      }

      wireToggle(overlay.querySelector('#toggle-guest-pw'), guestPasswordInput);
      wireToggle(overlay.querySelector('#toggle-guest-confirm-pw'), guestConfirmPasswordInput);

      // Listen to password input for strength
      if (guestPasswordInput && guestPwStrengthFill) {
        guestPasswordInput.addEventListener('input', () => {
          if (currentGuestTab === 'signup') {
            updateStrengthBar(guestPasswordInput.value, guestPwStrengthFill, guestPwStrengthLabel);
          }
        });
      }

      // Confirm password validation
      if (guestConfirmPasswordInput) {
        guestConfirmPasswordInput.addEventListener('input', () => {
          const match = guestPasswordInput.value === guestConfirmPasswordInput.value;
          guestConfirmMatch.style.display = guestConfirmPasswordInput.value.length > 0 ? 'block' : 'none';
          guestConfirmMatch.textContent = match ? '✓ Passwords match' : '✗ Passwords do not match';
          guestConfirmMatch.style.color = match ? '#10b981' : '#ef4444';
        });
      }

      guestUsernameInput.focus();

      // Close modal logic
      const closeModal = (successValue) => {
        overlay.classList.remove('active');
        const modal = overlay.querySelector('.custom-modal');
        if (modal) {
          modal.classList.remove('popup-anim');
          modal.classList.add('popout-anim');
        }
        setTimeout(() => {
          overlay.remove();
          resolve(successValue);
        }, 150);
      };

      btnClose.addEventListener('click', () => closeModal(null));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(null);
      });

      // Switch Main Portal Tabs (Guest vs Owner)
      tabBtnGuest.addEventListener('click', () => {
        currentPortalTab = 'guest';
        tabBtnGuest.classList.add('active');
        tabBtnOwner.classList.remove('active');
        panelGuest.style.display = 'block';
        panelOwner.style.display = 'none';
        guestUsernameInput.focus();
      });

      tabBtnOwner.addEventListener('click', () => {
        currentPortalTab = 'owner';
        tabBtnOwner.classList.add('active');
        tabBtnGuest.classList.remove('active');
        panelOwner.style.display = 'block';
        panelGuest.style.display = 'none';
        overlay.querySelector('#owner-username').focus();
      });

      // Guest Sub-tabs Login/Signup
      btnGuestSubtabLogin.addEventListener('click', () => {
        currentGuestTab = 'login';
        btnGuestSubtabLogin.classList.add('active');
        btnGuestSubtabSignup.classList.remove('active');
        guestSubtabIndicator.classList.remove('right');
        guestSubmitText.textContent = 'Log In';
        overlay.querySelector('#guest-auth-error').style.display = 'none';
        if (signupExtraFields) signupExtraFields.style.display = 'none';
        guestPasswordInput.autocomplete = 'current-password';
      });

      btnGuestSubtabSignup.addEventListener('click', () => {
        currentGuestTab = 'signup';
        btnGuestSubtabSignup.classList.add('active');
        btnGuestSubtabLogin.classList.remove('active');
        guestSubtabIndicator.classList.add('right');
        guestSubmitText.textContent = 'Sign Up';
        overlay.querySelector('#guest-auth-error').style.display = 'none';
        if (signupExtraFields) signupExtraFields.style.display = 'flex';
        guestPasswordInput.autocomplete = 'new-password';
      });

      // Guest Forgot password panel toggle
      btnGuestForgot.addEventListener('click', () => {
        guestCredentialsArea.style.display = 'none';
        panelGuestReset.style.display = 'flex';
        overlay.querySelector('#reset-username').focus();
      });

      btnGuestResetBack.addEventListener('click', () => {
        panelGuestReset.style.display = 'none';
        guestCredentialsArea.style.display = 'block';
        guestUsernameInput.focus();
      });

      // Form Guest Submission
      const formGuestAuth = overlay.querySelector('#form-guest-auth');
      formGuestAuth.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = overlay.querySelector('#guest-auth-error');
        errEl.style.display = 'none';

        const uVal = guestUsernameInput.value.trim();
        const pVal = overlay.querySelector('#guest-password').value;
        const submitBtn = overlay.querySelector('#btn-guest-auth-submit');
        submitBtn.disabled = true;

        const endpoint = currentGuestTab === 'login' ? '/api/auth/login' : '/api/auth/signup';

        // Confirm password check for signup
        if (currentGuestTab === 'signup') {
          const confirmVal = guestConfirmPasswordInput ? guestConfirmPasswordInput.value : '';
          if (pVal !== confirmVal) {
            errEl.textContent = 'Passwords do not match. Please re-enter.';
            errEl.style.display = 'block';
            submitBtn.disabled = false;
            return;
          }
        }

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uVal, password: pVal })
          });

          const data = await res.json();
          if (res.ok) {
            guestUser = data.username;
            localStorage.setItem('guest_user', data.username);
            setAppMode('guest');

            // Fetch user profile access status immediately on login
            await fetchUserProfile();

            closeModal(data.username);

            if (currentGuestTab === 'signup' && data.recoveryCode) {
              showRecoveryCodeModal(data.recoveryCode, false);
            }
          } else {
            submitBtn.disabled = false;
            errEl.textContent = data.error || 'Authentication failed.';
            errEl.style.display = 'block';
          }
        } catch (err) {
          submitBtn.disabled = false;
          errEl.textContent = 'Network error. Please try again.';
          errEl.style.display = 'block';
        }
      });

      // Form Guest Reset Submission
      const formGuestReset = overlay.querySelector('#form-guest-reset');
      formGuestReset.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = overlay.querySelector('#guest-reset-error');
        errEl.style.display = 'none';

        const uVal = overlay.querySelector('#reset-username').value.trim();
        const cVal = overlay.querySelector('#reset-code').value.trim().toUpperCase();
        const newPwVal = overlay.querySelector('#reset-newpw').value;
        const confirmPwVal = overlay.querySelector('#reset-confirmpw').value;

        if (newPwVal !== confirmPwVal) {
          errEl.textContent = 'Passwords do not match.';
          errEl.style.display = 'block';
          return;
        }

        const submitBtn = formGuestReset.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uVal, recoveryCode: cVal, newPassword: newPwVal })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            formGuestReset.reset();
            panelGuestReset.style.display = 'none';
            guestCredentialsArea.style.display = 'block';
            closeModal(null);
            showRecoveryCodeModal(data.newRecoveryCode, true);
          } else {
            submitBtn.disabled = false;
            errEl.textContent = data.error || 'Reset failed.';
            errEl.style.display = 'block';
          }
        } catch (err) {
          submitBtn.disabled = false;
          errEl.textContent = 'Network error. Please try again.';
          errEl.style.display = 'block';
        }
      });

      // Form Owner Submission
      const formOwnerAuth = overlay.querySelector('#form-owner-auth');
      formOwnerAuth.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = overlay.querySelector('#owner-auth-error');
        errEl.style.display = 'none';

        const uVal = overlay.querySelector('#owner-username').value.trim();
        const pVal = overlay.querySelector('#owner-password').value;
        const submitBtn = formOwnerAuth.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
          const res = await fetch('/api/auth/owner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uVal, password: pVal })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            localStorage.setItem('owner_token', data.token);
            setAppMode('owner');
            closeModal('owner');
          } else {
            submitBtn.disabled = false;
            errEl.textContent = data.error || 'Authentication failed.';
            errEl.style.display = 'block';
          }
        } catch (err) {
          submitBtn.disabled = false;
          errEl.textContent = 'Network error. Please try again.';
          errEl.style.display = 'block';
        }
      });
    });
  }

  // Helper: Open Profile and Access status modal
  function showProfileModal() {
    return new Promise(async (resolve) => {
      const isOwner = localStorage.getItem('nexus_mode') === 'owner';
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';
      
      let modalBodyHtml = '';
      
      if (isOwner) {
        modalBodyHtml = `
          <div class="profile-modal-details">
            <div class="profile-item">
              <span class="profile-label">Username</span>
              <span class="profile-value">Borno (Admin)</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Role</span>
              <span class="profile-value" style="color: var(--accent-cyan); display: flex; align-items: center; gap: 4px;">
                <i data-lucide="crown" style="width: 14px; height: 14px;"></i> Node Owner
              </span>
            </div>
            
            <div class="profile-access-card" style="border-color: rgba(6, 182, 212, 0.2);">
              <div class="access-badge approved" style="margin-bottom: 8px;">
                <i data-lucide="shield" style="width: 12px; height: 12px;"></i> Full Admin Mode
              </div>
              <p class="profile-access-desc">
                You have full administrative access to all tools, user management, and bookmarks.
              </p>
            </div>
          </div>
        `;
      } else {
        let badgeClass = 'none';
        let badgeText = 'No Access';
        let badgeIcon = 'lock';
        let statusDescription = 'You currently do not have access to Brian AI.';
        let showRequestButton = true;
        let isPending = false;
        
        if (guestUserBrianAccess === 'approved') {
          badgeClass = 'approved';
          badgeText = 'Bro Mode Active';
          badgeIcon = 'check-circle';
          statusDescription = 'Access approved! You can now chat with Brian and share memories.';
          showRequestButton = false;
        } else if (guestUserBrianAccess === 'pending') {
          badgeClass = 'pending';
          badgeText = 'Request Pending';
          badgeIcon = 'clock';
          statusDescription = 'Your access request has been submitted and is awaiting administrator approval.';
          showRequestButton = false;
          isPending = true;
        } else if (guestUserBrianAccess === 'rejected') {
          badgeClass = 'rejected';
          badgeText = 'Access Rejected';
          badgeIcon = 'x-circle';
          statusDescription = 'Your access request was not approved. You can request again if this was an error.';
          showRequestButton = true;
        }
        
        modalBodyHtml = `
          <div class="profile-modal-details">
            <div class="profile-item">
              <span class="profile-label">Username</span>
              <span class="profile-value">${guestUser}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Role</span>
              <span class="profile-value">Guest Node</span>
            </div>
            
            <div class="profile-access-card">
              <div class="access-badge ${badgeClass}" style="margin-bottom: 8px;">
                <i data-lucide="${badgeIcon}" style="width: 12px; height: 12px;"></i> ${badgeText}
              </div>
              <p class="profile-access-desc">
                ${statusDescription}
              </p>
              ${showRequestButton ? `
                <button type="button" class="btn-glow" id="btn-request-brian-access" style="width: 100%; justify-content: center; gap: 8px; margin-top: 4px;">
                  <i data-lucide="key"></i> Request Brian AI Access
                </button>
              ` : ''}
              ${isPending ? `
                <div style="font-size: 11px; color: var(--accent-cyan); display: flex; align-items: center; gap: 4px; margin-top: 4px; justify-content: center;">
                  <span class="pulse-dot"></span> Waiting for Borno to approve
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
      
      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim" style="max-width: 380px; width: 100%;">
          <div class="modal-header">
            <i data-lucide="user-cog" class="modal-icon info"></i>
            <h3>Account Settings</h3>
          </div>
          <div class="modal-body">
            ${modalBodyHtml}
          </div>
          <div class="modal-footer" style="flex-direction: column; gap: 10px; padding-top: 12px;">
            <button class="btn-identity-logout" id="btn-profile-logout" style="width: 100%;">
              <i data-lucide="log-out" style="width: 14px; height: 14px;"></i> Log Out Account
            </button>
            <button class="btn-secondary btn-modal-close" style="width: 100%; padding: 10px;">Close</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      lucide.createIcons();
      
      const btnClose = overlay.querySelector('.btn-modal-close');
      const btnLogout = overlay.querySelector('#btn-profile-logout');
      const btnRequest = overlay.querySelector('#btn-request-brian-access');
      
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
      
      btnClose.addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
      
      btnLogout.addEventListener('click', async () => {
        const confirmLogout = await showModalConfirm('Are you sure you want to log out of your session?', 'Confirm Log Out');
        if (!confirmLogout) return;
        
        if (isOwner) {
          localStorage.removeItem('owner_token');
        } else {
          guestUser = null;
          localStorage.removeItem('guest_user');
        }
        localStorage.removeItem('guest_user'); // force clear
        guestUserBrianAccess = 'none';
        
        setAppMode('guest');
        closeModal();
        
        showModalAlert('You have successfully logged out.', 'Logged Out', 'success');
      });
      
      if (btnRequest) {
        btnRequest.addEventListener('click', async () => {
          btnRequest.disabled = true;
          btnRequest.textContent = 'Submitting Request...';
          
          try {
            const res = await fetch('/api/auth/request-access', {
              method: 'POST',
              headers: { 'x-user-name': guestUser }
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
              guestUserBrianAccess = 'pending';
              closeModal();
              showModalAlert('Your request for Brian AI access has been submitted successfully.', 'Request Submitted', 'success');
              await fetchUserProfile();
              setAppMode('guest');
            } else {
              btnRequest.disabled = false;
              btnRequest.innerHTML = '<i data-lucide="key"></i> Request Brian AI Access';
              lucide.createIcons();
              showModalAlert(data.error || 'Failed to submit request.', 'Request Error', 'error');
            }
          } catch (err) {
            btnRequest.disabled = false;
            btnRequest.innerHTML = '<i data-lucide="key"></i> Request Brian AI Access';
            lucide.createIcons();
            showModalAlert('Network error. Please try again.', 'Request Error', 'error');
          }
        });
      }
    });
  }

  // --- State Variables ---
  let savedLinks = [];
  let currentFilter = 'all';
  let bookmarkExpandedStates = {};
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
  const modeSwitcherFooter = document.getElementById('sidebar-account-btn');
  const avatarTextMode = document.getElementById('avatar-text-mode');
  const userNameMode = document.getElementById('user-name-mode');
  const userRoleMode = document.getElementById('user-role-mode');
  const btnLockMode = document.getElementById('btn-lock-mode');

  // Brian AI elements initialized early to prevent TDZ errors
  let brianAuthLandingView = document.getElementById('brian-auth-landing-view');
  let brianChatWrapperPanel = document.getElementById('brian-chat-wrapper-panel');
  let brianSessionsList = document.getElementById('brian-sessions-list');
  // Identity display is now a <div>, not an <input> — read-only, locked to authenticated user
  let brianIdentityName = document.getElementById('brian-identity-name');

  let guestUser = localStorage.getItem('guest_user') || null;
  let guestUserBrianAccess = 'none';

  async function fetchUserProfile() {
    if (!guestUser) {
      guestUserBrianAccess = 'none';
      updateBrianNavigation();
      return;
    }

    try {
      const res = await fetch('/api/auth/profile', {
        headers: { 'x-user-name': guestUser }
      });
      if (res.ok) {
        const data = await res.json();
        guestUserBrianAccess = data.brian_access || 'none';
      } else if (res.status === 404 || res.status === 401) {
        guestUser = null;
        guestUserBrianAccess = 'none';
        localStorage.removeItem('guest_user');
        setAppMode('guest');
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }

    updateBrianNavigation();
  }

  async function populateAdminChatFilter() {
    const isOwner = localStorage.getItem('nexus_mode') === 'owner';
    const filterSelect = document.getElementById('brian-admin-chat-filter');
    if (!isOwner || !filterSelect) return;

    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'x-owner-token': localStorage.getItem('owner_token') }
      });
      if (response.ok) {
        const users = await response.json();
        const currentValue = filterSelect.value || 'all';
        
        // Reset to default options first
        filterSelect.innerHTML = `
          <option value="all">Show All Chats</option>
          <option value="owner">Show My Chats Only</option>
        `;
        
        users.forEach(u => {
          if (u.username.toLowerCase() !== 'owner') {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.textContent = `Chats by ${u.username}`;
            filterSelect.appendChild(opt);
          }
        });

        // Restore value if it still exists
        const optionExists = Array.from(filterSelect.options).some(opt => opt.value === currentValue);
        if (optionExists) {
          filterSelect.value = currentValue;
        } else {
          filterSelect.value = 'all';
        }
      }
    } catch (e) {
      console.error('Failed to populate chat filter:', e);
    }
  }

  function updateBrianNavigation() {
    const brianBtn = document.querySelector('.nav-item[data-view="brian"]');
    const mbnBrianBtn = document.getElementById('mbn-brian');
    const isOwner = localStorage.getItem('nexus_mode') === 'owner';
    const hasAccess = isOwner || (guestUser && guestUserBrianAccess === 'approved');

    if (brianBtn) {
      if (hasAccess) {
        brianBtn.style.display = 'flex';
      } else {
        brianBtn.style.display = 'none';
        // If active view is brian and we don't have access, redirect to dashboard
        const activeView = document.querySelector('.content-view.active');
        if (activeView && activeView.id === 'view-brian') {
          switchView('dashboard');
        }
      }
    }

    // Sync mobile bottom nav Brian button visibility
    if (mbnBrianBtn) {
      mbnBrianBtn.style.display = hasAccess ? 'flex' : 'none';
    }
    
    // Sync Brian UI auth states (will hide/show the wrapper panels)
    if (typeof checkBrianAuth === 'function') {
      checkBrianAuth();
    }

    if (isOwner) {
      populateAdminChatFilter();
    }
  }

  function setAppMode(mode) {
    const mbnAvatarText = document.getElementById('mbn-avatar-text');
    const mbnModeLabel = document.getElementById('mbn-mode-label');

    if (mode === 'owner') {
      document.body.classList.remove('mode-guest', 'mode-guest-auth');
      document.body.classList.add('mode-owner');
      if (avatarTextMode) avatarTextMode.textContent = 'OW';
      if (userNameMode) userNameMode.textContent = 'Node Owner';
      if (userRoleMode) userRoleMode.textContent = 'Owner Mode';
      if (btnLockMode) {
        btnLockMode.innerHTML = '<i data-lucide="unlock" style="width: 16px; height: 16px;"></i>';
      }
      if (mbnAvatarText) mbnAvatarText.textContent = 'OW';
      if (mbnModeLabel) mbnModeLabel.textContent = 'Owner';
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
        if (mbnAvatarText) mbnAvatarText.textContent = guestUser.substring(0, 2).toUpperCase();
        if (userRoleMode) {
          if (guestUserBrianAccess === 'approved') {
            userRoleMode.textContent = 'Bro Mode';
            if (mbnModeLabel) mbnModeLabel.textContent = 'Bro';
          } else if (guestUserBrianAccess === 'pending') {
            userRoleMode.textContent = 'Guest (Pending)';
            if (mbnModeLabel) mbnModeLabel.textContent = 'Guest';
          } else {
            userRoleMode.textContent = 'Guest Mode';
            if (mbnModeLabel) mbnModeLabel.textContent = 'Guest';
          }
        }
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
        if (mbnAvatarText) mbnAvatarText.textContent = 'G';
        if (mbnModeLabel) mbnModeLabel.textContent = 'Guest';
      }
      localStorage.setItem('nexus_mode', 'guest');
      document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');

      // Kick user out of downloader or admin view if they switch to guest mode
      const activeView = document.querySelector('.content-view.active');
      if (activeView && (activeView.id === 'view-downloader' || activeView.id === 'view-admin')) {
        switchView('dashboard');
      }
    }

    // Dynamic lock indicators for downloader tool in Guest mode inside the Vault
    const appLockBadges = document.querySelectorAll('.app-lock-badge');
    appLockBadges.forEach(badge => {
      if (mode !== 'owner') {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });

    const vaultCard = document.getElementById('dash-card-vault');
    if (vaultCard) {
      const actionText = vaultCard.querySelector('.card-action-text');
      if (actionText) {
        actionText.innerHTML = 'Open Vault <i data-lucide="arrow-right"></i>';
        vaultCard.style.opacity = '1';
      }
    }

    lucide.createIcons();
    if (typeof renderBookmarks === 'function') {
      renderBookmarks();
    }
    if (typeof currentBookmarkMode !== 'undefined' && typeof updateBookmarkModeUI === 'function') {
      updateBookmarkModeUI(currentBookmarkMode);
    }
    
    // Sync Brian AI navigation and state
    if (typeof updateBrianNavigation === 'function') {
      updateBrianNavigation();
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

  // Toggle Mode Click Listener (Sidebar account button)
  if (modeSwitcherFooter) {
    modeSwitcherFooter.addEventListener('click', async (e) => {
      switchView('account');
    });
  }

  // Toggle Mode Click Listener (Mobile Bottom Nav Account Button)
  const mbnAccountBtn = document.getElementById('mbn-account-btn');
  if (mbnAccountBtn) {
    mbnAccountBtn.addEventListener('click', async (e) => {
      switchView('account');
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
    if (viewId === 'brian') {
      const isOwner = localStorage.getItem('nexus_mode') === 'owner';
      const hasAccess = isOwner || (guestUser && guestUserBrianAccess === 'approved');
      if (!hasAccess) {
        showModalAlert('Access Restricted: You need to request access and be approved to interact with Brian AI.', 'Access Required', 'warning');
        return;
      }
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

    // Sync mobile bottom nav active state
    document.querySelectorAll('.mbn-item[data-view]').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      }
    });

    // Sync sidebar account button active state
    const sidebarAccountBtn = document.getElementById('sidebar-account-btn');
    if (sidebarAccountBtn) {
      sidebarAccountBtn.classList.remove('active');
      if (viewId === 'account') {
        sidebarAccountBtn.classList.add('active');
      }
    }

    // Save active view in localStorage
    localStorage.setItem('active_view', viewId);

    // Account page — init when navigating to it
    if (viewId === 'account') {
      // Reset to overview tab
      document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.profile-tab-content').forEach(c => { c.style.display = 'none'; c.classList.remove('active'); });
      const overviewBtn = document.querySelector('.profile-tab-btn[data-profile-tab="overview"]');
      if (overviewBtn) overviewBtn.classList.add('active');
      const overviewTab = document.getElementById('profile-tab-overview');
      if (overviewTab) { overviewTab.style.display = 'block'; overviewTab.classList.add('active'); }
      // Use setTimeout to ensure the view is visible before init runs
      setTimeout(() => { if (typeof initAccountPage === 'function') initAccountPage(); }, 0);
    }

    // Refresh icons just in case
    lucide.createIcons();
  }

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const viewId = button.getAttribute('data-view');
      switchView(viewId);
    });
  });

  // Mobile bottom nav click listeners
  document.querySelectorAll('.mbn-item[data-view]').forEach(button => {
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
  const tabButtons = document.querySelectorAll('.filter-tabs .tab-btn');
  let editingLinkId = null;
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  let currentBookmarkMode = 'shared'; // 'shared' or 'private'
  const btnToggleBookmarkMode = document.getElementById('btn-toggle-bookmark-mode');
  const sharedOnlyAdminNotice = document.getElementById('shared-only-admin-notice');
  const formGroupFolder = document.getElementById('form-group-folder');
  const linkFolderInput = document.getElementById('link-folder-input');
  const bookmarkSpaceActions = document.getElementById('bookmark-space-actions');
  const accessFolderForm = document.getElementById('access-folder-form');
  const btnShowAddBookmark = document.getElementById('btn-show-add-bookmark');
  const btnShowAccessFolder = document.getElementById('btn-show-access-folder');
  const folderKeyInput = document.getElementById('folder-key-input');
  const btnImportFolder = document.getElementById('btn-import-folder');

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
    if (linkFolderInput) {
      linkFolderInput.value = bookmark.folderName || '';
    }
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
      const iconContainer = toggleLinkFormBtn ? toggleLinkFormBtn.querySelector('.btn-icon-toggle') : null;
      if (iconContainer) {
        iconContainer.innerHTML = '<i data-lucide="chevron-up"></i>';
      }
    }
    if (btnShowAddBookmark) {
      btnShowAddBookmark.style.background = 'var(--accent-cyan)';
      btnShowAddBookmark.style.borderColor = 'var(--accent-cyan)';
      btnShowAddBookmark.style.color = '#fff';
    }
    if (btnShowAccessFolder) {
      btnShowAccessFolder.style.background = '';
      btnShowAccessFolder.style.borderColor = '';
      btnShowAccessFolder.style.color = '';
    }
    if (accessFolderForm) {
      accessFolderForm.classList.add('hidden');
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
    if (linkFolderInput) {
      linkFolderInput.value = '';
    }

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
      const iconContainer = toggleLinkFormBtn ? toggleLinkFormBtn.querySelector('.btn-icon-toggle') : null;
      if (iconContainer) {
        iconContainer.innerHTML = '<i data-lucide="chevron-down"></i>';
      }
    }
    if (btnShowAddBookmark) {
      btnShowAddBookmark.style.background = '';
      btnShowAddBookmark.style.borderColor = '';
      btnShowAddBookmark.style.color = '';
    }
    if (btnShowAccessFolder) {
      btnShowAccessFolder.style.background = '';
      btnShowAccessFolder.style.borderColor = '';
      btnShowAccessFolder.style.color = '';
    }
    if (accessFolderForm) {
      accessFolderForm.classList.add('hidden');
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
        (item.domain || '').toLowerCase().includes(searchVal) ||
        (item.folderName || '').toLowerCase().includes(searchVal)
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

    if (currentBookmarkMode === 'private' && !(window.collectModeActive && window.collectSource === 'public')) {
      // Group by Folders
      const folders = {};
      const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');

      filtered.forEach(item => {
        const fKey = item.folderKey || '';
        const fName = item.folderName || '';
        const groupKey = fKey ? `key:${fKey}` : (fName ? `local:${fName}` : 'general');

        if (!folders[groupKey]) {
          folders[groupKey] = {
            name: fName || 'General Bookmarks',
            key: fKey || null,
            owner: item.ownerUsername || 'Owner',
            isImported: fKey ? (item.ownerUsername || '').toLowerCase() !== currentUser.toLowerCase() : false,
            items: []
          };
        }
        folders[groupKey].items.push(item);
      });

      window.folderStates = window.folderStates || {};

      Object.keys(folders).forEach(groupKey => {
        const folder = folders[groupKey];
        if (!window.folderStates[groupKey]) {
          window.folderStates[groupKey] = {
            isOpen: true,
            filter: 'all',
            deleteMode: false,
            selectedForDelete: []
          };
        } else {
          // Preserve existing fields, ensure new ones exist
          if (!window.folderStates[groupKey].selectedForDelete) {
            window.folderStates[groupKey].selectedForDelete = [];
          }
        }
        const state = window.folderStates[groupKey];

        const section = document.createElement('div');
        section.className = `folder-vault-card${state.isOpen ? ' open' : ''}`;
        section.setAttribute('data-group-key', groupKey);

        const isImported = folder.isImported;

        // Folder action buttons
        let shareButtonHtml = '';
        let cloneButtonHtml = '';
        let deleteFolderButtonHtml = '';
        const deleteLinksButtonHtml = state.deleteMode ? '' : `
          <button class="btn-folder-action btn-folder-action--danger btn-delete-links-mode" title="Select links to delete">
            <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
            <span>Delete Links</span>
          </button>
        `;

        if (groupKey === 'general') {
          // General group: only Delete Links (no folder-level delete)
        } else if (!isImported) {
          shareButtonHtml = `
            <button class="btn-folder-action btn-share-folder" data-folder="${folder.name}">
              <i data-lucide="share-2" style="width:12px;height:12px;"></i>
              <span>Share</span>
            </button>
          `;
          deleteFolderButtonHtml = `
            <button class="btn-folder-action btn-delete-folder btn-folder-action--danger" data-folder="${folder.name}">
              <i data-lucide="folder-x" style="width:12px;height:12px;"></i>
              <span>Delete Folder</span>
            </button>
          `;
        } else {
          shareButtonHtml = `
            <button class="btn-folder-action btn-unsave-folder" data-key="${folder.key}">
              <i data-lucide="folder-minus" style="width:12px;height:12px;"></i>
              <span>Unsubscribe</span>
            </button>
          `;
          cloneButtonHtml = `
            <button class="btn-folder-action btn-clone-folder" data-key="${folder.key}" data-name="${folder.name}">
              <i data-lucide="copy" style="width:12px;height:12px;"></i>
              <span>Clone</span>
            </button>
          `;
        }

        const badgeHtml = isImported ? `
          <span class="bookmark-folder-badge shared-badge">Shared by ${folder.owner}</span>
        ` : (folder.key ? `
          <span class="bookmark-folder-badge btn-copy-key" style="cursor:pointer;" title="Click to copy sharing key" data-key="${folder.key}">Key: ${folder.key}</span>
        ` : '');

        section.innerHTML = `
          <!-- Vault door header -->
          <div class="folder-vault-header">
            <div class="vault-handle-wrapper">
              <div class="vault-handle-wheel">
                <svg viewBox="0 0 100 100" class="vault-wheel-svg">
                  <circle cx="50" cy="50" r="40" stroke="var(--accent-cyan)" stroke-width="6" fill="none" />
                  <circle cx="50" cy="50" r="10" fill="var(--accent-cyan)" />
                  <line x1="50" y1="10" x2="50" y2="90" stroke="var(--accent-cyan)" stroke-width="6" />
                  <line x1="10" y1="50" x2="90" y2="50" stroke="var(--accent-cyan)" stroke-width="6" />
                </svg>
              </div>
            </div>
            <div class="vault-title-details">
              <h3 class="vault-folder-name">${folder.name}</h3>
              <div class="vault-meta-info">
                ${badgeHtml}
                <span class="vault-link-count">${folder.items.length} bookmarks</span>
              </div>
            </div>
            <div class="vault-actions">
              ${cloneButtonHtml}
              ${shareButtonHtml}
              ${deleteFolderButtonHtml}
              ${deleteLinksButtonHtml}
            </div>
          </div>

          <!-- Vault interior content (collapsible) -->
          <div class="folder-vault-body${state.isOpen ? '' : ' hidden'}">
            <!-- Delete mode control bar -->
            <div class="delete-mode-bar${state.deleteMode ? '' : ' hidden'}">
              <div class="delete-mode-info">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                <span class="delete-mode-count-label">Select items to delete</span>
              </div>
              <div class="delete-mode-btns">
                <button class="btn-folder-action btn-folder-action--danger btn-delete-all-in-folder">
                  <i data-lucide="trash" style="width:12px;height:12px;"></i>
                  <span>Delete All</span>
                </button>
                <button class="btn-folder-action btn-folder-action--confirm btn-confirm-delete-selected">
                  <i data-lucide="check-circle-2" style="width:12px;height:12px;"></i>
                  <span>Done</span>
                </button>
                <button class="btn-folder-action btn-cancel-delete-mode">
                  <i data-lucide="x" style="width:12px;height:12px;"></i>
                  <span>Cancel</span>
                </button>
              </div>
            </div>
            <!-- Local category filters (hidden in delete mode) -->
            <div class="vault-filters${state.deleteMode ? ' hidden' : ''}">
              <button class="vault-filter-btn${state.filter === 'all' ? ' active' : ''}" data-filter="all">All</button>
              <button class="vault-filter-btn${state.filter === 'Movies & Shows' ? ' active' : ''}" data-filter="Movies & Shows">Movies</button>
              <button class="vault-filter-btn${state.filter === 'Sports' ? ' active' : ''}" data-filter="Sports">Sports</button>
              <button class="vault-filter-btn${state.filter === 'Anime' ? ' active' : ''}" data-filter="Anime">Anime</button>
              <button class="vault-filter-btn${state.filter === 'Games' ? ' active' : ''}" data-filter="Games">Games</button>
              <button class="vault-filter-btn${state.filter === 'Development' ? ' active' : ''}" data-filter="Development">Tools</button>
              <button class="vault-filter-btn${state.filter === 'General' ? ' active' : ''}" data-filter="General">General</button>
            </div>
            
            <!-- Bookmarks grid -->
            <div class="bookmarks-grid"></div>
          </div>
        `;

        const headerEl = section.querySelector('.folder-vault-header');
        headerEl.addEventListener('click', (e) => {
          if (e.target.closest('.btn-folder-action') || e.target.closest('.bookmark-folder-badge')) {
            return;
          }
          state.isOpen = !state.isOpen;
          renderBookmarks();
        });

        const filterBtns = section.querySelectorAll('.vault-filter-btn');
        filterBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            state.filter = btn.getAttribute('data-filter');
            renderBookmarks();
          });
        });

        const grid = section.querySelector('.bookmarks-grid');
        const activeFilter = state.filter;
        
        let folderItems = folder.items;
        if (activeFilter !== 'all') {
          folderItems = folderItems.filter(item => item.category === activeFilter);
        }

        if (folderItems.length === 0) {
          grid.innerHTML = `
            <div class="empty-state-simple" style="padding: 12px; grid-column: 1 / -1; text-align: center; color: var(--text-muted);">
              <p>No bookmarks in this category.</p>
            </div>
          `;
        } else {
          folderItems.forEach(item => {
            const isSelected = window.collectModeActive && window.selectedLinkIds.includes(item.id);
            const isSelectedForDelete = state.deleteMode && state.selectedForDelete.includes(item.id);
            const card = document.createElement('div');
            card.className = 'bookmark-card'
              + (item.hiddenByAdmin ? ' admin-hidden' : '')
              + (state.deleteMode ? ' delete-selecting' : '')
              + (isSelectedForDelete ? ' delete-selected' : '')
              + (window.collectModeActive ? ' collecting' : '')
              + (isSelected ? ' selected' : '');
            card.setAttribute('data-id', item.id);
            
            const categoryClass = getCategoryColorClass(item.category);
            const faviconHtml = getFaviconHtml(item.favicon, item.title);
            const itemOwner = (item.ownerUsername || 'Owner').toLowerCase();
            const isOwnBookmark = isOwner || itemOwner === currentUser.toLowerCase() || itemOwner === 'owner' || itemOwner === 'guest';

            const collectIndicatorHtml = window.collectModeActive ? `
              <div class="collect-indicator">
                ${isSelected ? '<i data-lucide="check" style="width:12px;height:12px;"></i>' : ''}
              </div>
            ` : '';

            card.innerHTML = `
              ${state.deleteMode ? `
              <div class="delete-indicator${isSelectedForDelete ? ' selected' : ''}">
                ${isSelectedForDelete ? '<i data-lucide="check" style="width:13px;height:13px;"></i>' : ''}
              </div>` : ''}
              <div class="bookmark-card-top">
                ${faviconHtml}
                <div class="bookmark-info">
                  <h4 class="bookmark-title" title="${item.title}">${item.title}</h4>
                  <span class="bookmark-domain">${item.domain || 'External Link'}</span>
                  <span class="bookmark-added-by">${item.addedBy || 'Owner'}</span>
                </div>
                ${collectIndicatorHtml}
              </div>
              <div class="bookmark-mid">
                <span class="category-tag ${categoryClass}">${item.category}</span>
                <div class="bookmark-actions">
                  ${(!state.deleteMode && !window.collectModeActive) ? `
                  <button class="btn-bookmark-action btn-copy" data-url="${item.url}" title="Copy Link">
                    <i data-lucide="copy"></i>
                  </button>
                  <button class="btn-bookmark-action edit-btn" data-id="${item.id}" title="Edit Bookmark" ${isOwnBookmark ? '' : 'style="display:none"'}>
                    <i data-lucide="edit-2"></i>
                  </button>
                  <button class="btn-bookmark-action delete" data-id="${item.id}" data-own="${isOwnBookmark}" title="${isOwnBookmark ? 'Delete Bookmark' : 'Remove from my space'}">
                    <i data-lucide="trash-2"></i>
                  </button>
                  ` : (window.collectModeActive ? `
                  <button class="btn-bookmark-action btn-copy" data-url="${item.url}" title="Copy Link">
                    <i data-lucide="copy"></i>
                  </button>
                  ` : '')}
                </div>
              </div>
            `;

            card.addEventListener('click', (e) => {
              if (window.collectModeActive) {
                e.preventDefault();
                e.stopPropagation();
                
                const idx = window.selectedLinkIds.indexOf(item.id);
                if (idx === -1) {
                  window.selectedLinkIds.push(item.id);
                  card.classList.add('selected');
                  const indicator = card.querySelector('.collect-indicator');
                  if (indicator) {
                    indicator.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;"></i>';
                    lucide.createIcons();
                  }
                  animateLinkToBucket(card);
                } else {
                  window.selectedLinkIds.splice(idx, 1);
                  card.classList.remove('selected');
                  const indicator = card.querySelector('.collect-indicator');
                  if (indicator) {
                    indicator.innerHTML = '';
                  }
                }
                const bucketCountEl = document.getElementById('bucket-count');
                if (bucketCountEl) {
                  bucketCountEl.textContent = window.selectedLinkIds.length;
                }
                return;
              }
              if (state.deleteMode) {
                e.preventDefault();
                e.stopPropagation();
                const idx = state.selectedForDelete.indexOf(item.id);
                if (idx === -1) {
                  state.selectedForDelete.push(item.id);
                  card.classList.add('delete-selected');
                  const ind = card.querySelector('.delete-indicator');
                  if (ind) { ind.classList.add('selected'); ind.innerHTML = '<i data-lucide="check" style="width:13px;height:13px;"></i>'; lucide.createIcons(); }
                } else {
                  state.selectedForDelete.splice(idx, 1);
                  card.classList.remove('delete-selected');
                  const ind = card.querySelector('.delete-indicator');
                  if (ind) { ind.classList.remove('selected'); ind.innerHTML = ''; }
                }
                const n = state.selectedForDelete.length;
                const lbl = section.querySelector('.delete-mode-count-label');
                if (lbl) lbl.textContent = n > 0 ? `${n} selected` : 'Select items to delete';
                const doneSpan = section.querySelector('.btn-confirm-delete-selected span');
                if (doneSpan) doneSpan.textContent = n > 0 ? `Done (${n})` : 'Done';
                return;
              }
              if (e.target.closest('.btn-bookmark-action')) return;
              window.open(item.url, '_blank', 'noopener,noreferrer');
            });
            
            grid.appendChild(card);
          });
        }

        bookmarksContainer.appendChild(section);

        // ── Delete mode handlers ───────────────────────────────────────────
        const deleteLinksModeBtn = section.querySelector('.btn-delete-links-mode');
        if (deleteLinksModeBtn) {
          deleteLinksModeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.deleteMode = true;
            state.selectedForDelete = [];
            renderBookmarks();
          });
        }

        const cancelDeleteBtn = section.querySelector('.btn-cancel-delete-mode');
        if (cancelDeleteBtn) {
          cancelDeleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.deleteMode = false;
            state.selectedForDelete = [];
            renderBookmarks();
          });
        }

        const confirmDeleteBtn = section.querySelector('.btn-confirm-delete-selected');
        if (confirmDeleteBtn) {
          confirmDeleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (state.selectedForDelete.length === 0) {
              await showModalAlert('Please select at least one bookmark first.', 'No Selection', 'warning');
              return;
            }
            const n = state.selectedForDelete.length;
            const confirmed = await showModalConfirm(
              `Remove <strong>${n}</strong> selected bookmark${n > 1 ? 's' : ''} from your space?`,
              'Confirm Delete'
            );
            if (!confirmed) return;
            await bulkDeleteBookmarks([...state.selectedForDelete]);
            state.deleteMode = false;
            state.selectedForDelete = [];
            fetchBookmarks();
          });
        }

        const deleteAllInFolderBtn = section.querySelector('.btn-delete-all-in-folder');
        if (deleteAllInFolderBtn) {
          deleteAllInFolderBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const allIds = folder.items.map(i => i.id);
            if (allIds.length === 0) {
              await showModalAlert('This folder is already empty.', 'Empty Folder', 'warning');
              return;
            }
            const confirmed = await showModalConfirm(
              `Remove <strong>all ${allIds.length}</strong> bookmark(s) from this folder?<br><br><span style="color:var(--accent-pink)">This cannot be undone.</span>`,
              'Delete All'
            );
            if (!confirmed) return;
            await bulkDeleteBookmarks(allIds);
            state.deleteMode = false;
            state.selectedForDelete = [];
            fetchBookmarks();
          });
        }
        // ──────────────────────────────────────────────────────────────────
      });

    } else {
      // Shared mode: group by category
      const grouped = {};
      filtered.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      });

      const categoryOrder = ['Movies & Shows', 'Sports', 'Anime', 'Games', 'Development', 'General'];
      const finalCategories = [...categoryOrder];
      Object.keys(grouped).forEach(cat => {
        if (!finalCategories.includes(cat)) {
          finalCategories.push(cat);
        }
      });

      finalCategories.forEach(cat => {
        const items = grouped[cat];
        if (!items || items.length === 0) return;

        const section = document.createElement('div');
        section.className = 'genre-section';

        let iconName = 'bookmark';
        let iconClass = 'genre-icon-general';
        let displayTitle = cat;

        if (cat === 'Movies & Shows') {
          iconName = 'film';
          iconClass = 'genre-icon-movies';
        } else if (cat === 'Sports') {
          iconName = 'tv';
          iconClass = 'genre-icon-sports';
          displayTitle = 'Sports Streaming';
        } else if (cat === 'Anime') {
          iconName = 'tv-2';
          iconClass = 'genre-icon-anime';
        } else if (cat === 'Games') {
          iconName = 'gamepad-2';
          iconClass = 'genre-icon-games';
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

        if (isOwner && typeof Sortable !== 'undefined' && !window.collectModeActive) {
          new Sortable(grid, {
            group: 'bookmarks-shared-group',
            animation: 250,
            handle: '.drag-handle',
            ghostClass: 'bookmark-ghost',
            chosenClass: 'bookmark-chosen',
            dragClass: 'bookmark-drag-active',
            swapThreshold: 0.65,
            onEnd: async function (evt) {
              const itemEl = evt.item;
              const toGrid = evt.to;
              const bookmarkId = itemEl.getAttribute('data-id');
              const newCategory = toGrid.getAttribute('data-category');

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

              itemEl.setAttribute('data-sort-order', newSortOrder);

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

                savedLinks.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                renderBookmarks();
              } catch (err) {
                console.error('Failed to save bookmark order:', err);
                fetchBookmarks();
              }
            }
          });
        }

        items.forEach(item => {
          const card = document.createElement('div');
          
          const isSelected = window.collectModeActive && window.selectedLinkIds.includes(item.id);
          card.className = 'bookmark-card' + 
            (item.hiddenByAdmin ? ' admin-hidden' : '') + 
            (window.collectModeActive ? ' collecting' : '') +
            (isSelected ? ' selected' : '');
            
          card.setAttribute('data-id', item.id);
          card.setAttribute('data-sort-order', item.sortOrder || '0');
          
          const categoryClass = getCategoryColorClass(item.category);
          const faviconHtml = getFaviconHtml(item.favicon, item.title);
          
          const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');
          const canModify = isOwner || (item.addedBy || 'Owner').toLowerCase() === currentUser.toLowerCase();

          // Collect indicator
          const collectIndicatorHtml = window.collectModeActive ? `
            <div class="collect-indicator">
              ${isSelected ? '<i data-lucide="check" style="width:12px;height:12px;"></i>' : ''}
            </div>
          ` : '';

          card.innerHTML = `
            <div class="bookmark-card-top">
              ${faviconHtml}
              <div class="bookmark-info">
                <h4 class="bookmark-title" title="${item.title}">${item.title}</h4>
                <span class="bookmark-domain">${item.domain || 'External Link'}</span>
                <span class="bookmark-added-by">${item.addedBy || 'Owner'}</span>
                ${item.hiddenByAdmin ? '<span class="bookmark-hidden-badge"><i data-lucide="eye-off" style="width:10px;height:10px;"></i> Hidden</span>' : ''}
              </div>
              ${collectIndicatorHtml}
            </div>
            <div class="bookmark-mid">
              <span class="category-tag ${categoryClass}">${item.category}</span>
              <div class="bookmark-actions">
                ${isOwner && !window.collectModeActive ? `
                <div class="btn-bookmark-action drag-handle" title="Drag to Reorder" style="cursor: grab;">
                  <i data-lucide="grip-vertical"></i>
                </div>
                ` : ''}
                <button class="btn-bookmark-action btn-copy" data-url="${item.url}" title="Copy Link">
                  <i data-lucide="copy"></i>
                </button>
                ${isOwner && !window.collectModeActive ? `
                <button class="btn-bookmark-action hide-toggle-btn" data-id="${item.id}" data-hidden="${item.hiddenByAdmin ? 'true' : 'false'}" title="${item.hiddenByAdmin ? 'Unhide from guests' : 'Hide from guests'}">
                  <i data-lucide="${item.hiddenByAdmin ? 'eye' : 'eye-off'}"></i>
                </button>
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
            if (window.collectModeActive) {
              e.preventDefault();
              e.stopPropagation();
              
              const idx = window.selectedLinkIds.indexOf(item.id);
              if (idx === -1) {
                window.selectedLinkIds.push(item.id);
                card.classList.add('selected');
                const indicator = card.querySelector('.collect-indicator');
                if (indicator) {
                  indicator.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;"></i>';
                  lucide.createIcons();
                }
                animateLinkToBucket(card);
              } else {
                window.selectedLinkIds.splice(idx, 1);
                card.classList.remove('selected');
                const indicator = card.querySelector('.collect-indicator');
                if (indicator) {
                  indicator.innerHTML = '';
                }
              }
              const bucketCountEl = document.getElementById('bucket-count');
              if (bucketCountEl) {
                bucketCountEl.textContent = window.selectedLinkIds.length;
              }
              return;
            }

            if (e.target.closest('.btn-bookmark-action')) {
              return;
            }
            window.open(item.url, '_blank', 'noopener,noreferrer');
          });

          grid.appendChild(card);
        });

        bookmarksContainer.appendChild(section);
      });
    }

    // Attach clipboard, edit, and delete event listeners
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
        const isOwn = btn.getAttribute('data-own') !== 'false';
        deleteBookmark(linkId, isOwn);
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

    adjustBookmarkCollapsing();
    lucide.createIcons();
  }

  function adjustBookmarkCollapsing() {
    const isAllTab = (currentFilter === 'all');
    const searchVal = linksSearch.value.trim();
    const shouldCollapse = isAllTab && !searchVal;

    document.querySelectorAll('.genre-section').forEach(section => {
      const grid = section.querySelector('.bookmarks-grid');
      if (!grid) return;
      const cat = grid.getAttribute('data-category');
      const cards = grid.querySelectorAll('.bookmark-card');
      
      // Remove any existing show-more wrapper in this section to avoid duplicates
      const existingWrapper = section.querySelector('.show-more-wrapper');
      if (existingWrapper) {
        existingWrapper.remove();
      }

      if (cards.length === 0) return;

      const firstCard = cards[0];
      const firstCardOffsetTop = firstCard.offsetTop;
      let hasMultipleRows = false;

      // Check if any card is on a different row
      for (let i = 1; i < cards.length; i++) {
        if (cards[i].offsetTop > firstCardOffsetTop + 10) {
          hasMultipleRows = true;
          break;
        }
      }

      if (hasMultipleRows && shouldCollapse) {
        const isExpanded = !!bookmarkExpandedStates[cat];

        // Create the Show More/Less button wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'show-more-wrapper';
        wrapper.innerHTML = `
          <button class="btn-show-more" data-category="${cat}">
            <span>${isExpanded ? 'Show Less' : 'Show More'}</span>
            <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}"></i>
          </button>
        `;

        section.appendChild(wrapper);

        // Apply grid styling based on state (initial render or resize state)
        if (isExpanded) {
          grid.classList.remove('collapsed');
          grid.style.maxHeight = '';
        } else {
          grid.classList.add('collapsed');
          const firstCardHeight = firstCard.offsetHeight;
          grid.style.maxHeight = `${firstCardHeight}px`;
        }

        // Add event listener to the button for smooth transitions
        const btn = wrapper.querySelector('.btn-show-more');
        btn.addEventListener('click', () => {
          const currentlyExpanded = !!bookmarkExpandedStates[cat];
          bookmarkExpandedStates[cat] = !currentlyExpanded;

          if (!currentlyExpanded) {
            // We are expanding: transition to scrollHeight
            grid.classList.remove('collapsed');
            grid.style.maxHeight = `${grid.scrollHeight}px`;
            
            // Clean up max-height inline style once transition completes so it resizes dynamically
            const onTransitionEnd = (e) => {
              if (e.propertyName === 'max-height') {
                grid.style.maxHeight = '';
                grid.removeEventListener('transitionend', onTransitionEnd);
              }
            };
            grid.addEventListener('transitionend', onTransitionEnd);
          } else {
            // We are collapsing: transition to firstCard height
            const firstCardHeight = firstCard.offsetHeight;
            grid.style.maxHeight = `${grid.scrollHeight}px`; // ensure starting height is set
            grid.offsetHeight; // force reflow
            grid.classList.add('collapsed');
            grid.style.maxHeight = `${firstCardHeight}px`;
          }

          // Toggle button text and icons
          btn.querySelector('span').textContent = bookmarkExpandedStates[cat] ? 'Show Less' : 'Show More';
          const icon = btn.querySelector('i');
          if (icon) {
            icon.setAttribute('data-lucide', bookmarkExpandedStates[cat] ? 'chevron-up' : 'chevron-down');
          }
          lucide.createIcons();
        });
      } else {
        // No multiple rows, or shouldn't collapse (specific tab/searching)
        grid.classList.remove('collapsed');
        grid.style.maxHeight = '';
      }
    });
  }

  window.addEventListener('resize', () => {
    adjustBookmarkCollapsing();
  });


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

      const isOwner = document.body.classList.contains('mode-owner');
      const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');
      headers['x-user-name'] = currentUser;

      const fetchMode = (window.collectModeActive && window.collectSource === 'public') ? 'shared' : currentBookmarkMode;
      const response = await fetch(`/api/links?mode=${fetchMode}`, { headers });
      const data = await response.json();
      savedLinks = data;
      
      // Update Dashboard Link Count
      if (!window.collectModeActive) {
        document.getElementById('stat-links-count').textContent = savedLinks.length;
      }
      
      renderBookmarks();
      if (!window.collectModeActive) {
        renderRecentBookmarks();
      }
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
    const folderVal = linkFolderInput ? linkFolderInput.value.trim() : '';
    const saveBtn = document.getElementById('btn-save-bookmark');

    const isOwner = document.body.classList.contains('mode-owner');
    if (!isOwner && !guestUser) {
      const username = await showGlobalAuthModal('guest');
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
      const isPrivate = (currentBookmarkMode === 'private');

      let response;
      if (editingLinkId) {
        response = await fetch(`/api/links/${editingLinkId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-name': addedBy,
            'x-owner-token': localStorage.getItem('owner_token') || ''
          },
          body: JSON.stringify({ 
            linkUrl: urlVal, 
            category: catVal, 
            customTitle: titleVal, 
            favicon: iconVal, 
            addedBy,
            isPrivate,
            folderName: folderVal
          })
        });
      } else {
        response = await fetch('/api/links', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-name': addedBy,
            'x-owner-token': localStorage.getItem('owner_token') || ''
          },
          body: JSON.stringify({ 
            linkUrl: urlVal, 
            category: catVal, 
            customTitle: titleVal, 
            favicon: iconVal, 
            addedBy,
            isPrivate,
            folderName: folderVal
          })
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

  // Delete / Remove bookmark from private space
  async function deleteBookmark(id, isOwn = true) {
    const isOwner = document.body.classList.contains('mode-owner');
    const confirmMsg = (isOwner || isOwn)
      ? 'Are you sure you want to permanently delete this bookmark?'
      : 'Remove this bookmark from your space?<br><small style="color:var(--text-muted)">This only removes it from your view. The original owner\'s bookmark is not affected.</small>';
    const confirmTitle = (isOwner || isOwn) ? 'Delete Bookmark' : 'Remove from My Space';
    const confirmed = await showModalConfirm(confirmMsg, confirmTitle);
    if (!confirmed) return;

    try {
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
        await showModalAlert(res.error, 'Error', 'error');
      }
    } catch (e) {
      await showModalAlert('Failed to remove bookmark.', 'Error', 'error');
    }
  }

  // Bulk delete/hide bookmarks (used by delete selection mode)
  async function bulkDeleteBookmarks(ids) {
    if (!ids || ids.length === 0) return;
    const isOwner = document.body.classList.contains('mode-owner');
    const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');
    try {
      const response = await fetch('/api/bookmarks/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': currentUser,
          'x-owner-token': localStorage.getItem('owner_token') || ''
        },
        body: JSON.stringify({ ids })
      });
      const data = await response.json();
      if (data.error) {
        await showModalAlert(data.error, 'Delete Error', 'error');
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      await showModalAlert('Failed to remove some bookmarks.', 'Error', 'error');
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

  function updateBookmarkModeUI(mode) {
    currentBookmarkMode = mode;
    localStorage.setItem('bookmark_hub_mode', mode);

    if (btnToggleBookmarkMode) {
      if (mode === 'private') {
        btnToggleBookmarkMode.classList.add('private-mode');
      } else {
        btnToggleBookmarkMode.classList.remove('private-mode');
      }
      btnToggleBookmarkMode.textContent = mode === 'shared' ? 'Shared' : 'Private';
    }

    const filterTabsContainer = document.querySelector('.filter-tabs');
    if (filterTabsContainer) {
      filterTabsContainer.style.display = 'flex'; // Keep consistent in both spaces
    }

    const btnCollectToggle = document.getElementById('btn-vault-collect-toggle');
    if (btnCollectToggle) {
      btnCollectToggle.style.display = 'flex'; // show in both spaces
      if (window.collectModeActive) {
        exitCollectMode();
      }
    }

    const isOwner = document.body.classList.contains('mode-owner');

    // Default: hide all forms/inputs and action button active states initially when toggling modes
    if (linksaverForm) linksaverForm.classList.add('hidden');
    if (accessFolderForm) accessFolderForm.classList.add('hidden');
    if (btnShowAddBookmark) {
      btnShowAddBookmark.style.background = '';
      btnShowAddBookmark.style.borderColor = '';
      btnShowAddBookmark.style.color = '';
    }
    if (btnShowAccessFolder) {
      btnShowAccessFolder.style.background = '';
      btnShowAccessFolder.style.borderColor = '';
      btnShowAccessFolder.style.color = '';
    }

    // Determine target control box element to display
    let targetContentEl = null;
    if (mode === 'shared') {
      if (formGroupFolder) formGroupFolder.classList.add('hidden');
      if (!isOwner) {
        targetContentEl = sharedOnlyAdminNotice;
      } else {
        targetContentEl = toggleLinkFormBtn;
      }
    } else {
      if (formGroupFolder) formGroupFolder.classList.remove('hidden');
      targetContentEl = bookmarkSpaceActions;
    }

    // Smoothly swap active item inside control box
    const controlContents = document.querySelectorAll('.hub-control-content');
    controlContents.forEach(el => {
      if (el === targetContentEl) {
        el.classList.remove('hidden');
        el.classList.remove('switching-out');
      } else {
        el.classList.add('hidden');
        el.classList.remove('switching-out');
      }
    });
  }

  if (btnToggleBookmarkMode) {
    btnToggleBookmarkMode.addEventListener('click', () => {
      const targetMode = currentBookmarkMode === 'shared' ? 'private' : 'shared';
      
      // Smoothly transition toggle button text
      btnToggleBookmarkMode.style.opacity = '0.3';
      btnToggleBookmarkMode.style.transform = 'scale(0.95)';
      
      // Smoothly transition container content
      if (bookmarksContainer) {
        bookmarksContainer.classList.add('switching-exit');
      }

      // Smoothly transition the active control content out
      const activeContent = document.querySelector('.hub-control-content:not(.hidden)');
      if (activeContent) {
        activeContent.classList.add('switching-out');
      }
      
      setTimeout(async () => {
        updateBookmarkModeUI(targetMode);
        await fetchBookmarks();
        
        btnToggleBookmarkMode.style.opacity = '';
        btnToggleBookmarkMode.style.transform = '';
        
        if (bookmarksContainer) {
          bookmarksContainer.classList.remove('switching-exit');
        }
      }, 250);
    });
  }

  // Initialize Collection state variables
  window.collectModeActive = false;
  window.selectedLinkIds = [];
  window.collectSource = 'private';

  function exitCollectMode() {
    window.selectedLinkIds = [];
    window.collectModeActive = false;
    window.collectSource = 'private';
    const btnCollectToggle = document.getElementById('btn-vault-collect-toggle');
    if (btnCollectToggle) {
      btnCollectToggle.innerHTML = '<i data-lucide="plus-square" style="width: 14px; height: 14px;"></i><span>Collect Links</span>';
      btnCollectToggle.style.background = '';
      btnCollectToggle.style.borderColor = '';
      btnCollectToggle.style.color = '';
    }
    const bucketEl = document.getElementById('vault-collect-bucket');
    if (bucketEl) {
      bucketEl.classList.add('hidden');
    }
    fetchBookmarks();
  }

  function animateLinkToBucket(cardEl) {
    const rect = cardEl.getBoundingClientRect();
    const bucketEl = document.getElementById('vault-collect-bucket');
    if (!bucketEl) return;
    const bucketRect = bucketEl.getBoundingClientRect();

    const particle = document.createElement('div');
    particle.className = 'vault-collect-particle';
    particle.style.left = `${rect.left + rect.width / 2 - 13}px`;
    particle.style.top = `${rect.top + rect.height / 2 - 13}px`;
    
    const favicon = cardEl.querySelector('.bookmark-favicon img');
    if (favicon && favicon.style.display !== 'none') {
      particle.innerHTML = `<img src="${favicon.src}" style="width:100%; height:100%; border-radius:50%; object-fit:contain;"/>`;
    } else {
      particle.innerHTML = `<i data-lucide="star" style="width:14px; height:14px; color:#000;"></i>`;
    }
    
    document.body.appendChild(particle);
    if (!favicon || favicon.style.display === 'none') {
      lucide.createIcons();
    }

    const destX = bucketRect.left + bucketRect.width / 2 - (rect.left + rect.width / 2);
    const destY = bucketRect.top + bucketRect.height / 2 - (rect.top + rect.height / 2);

    particle.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${destX * 0.3}px, ${destY * 0.1 - 60}px) scale(1.3)`, opacity: 0.9 },
      { transform: `translate(${destX}px, ${destY}px) scale(0.3)`, opacity: 0.3 }
    ], {
      duration: 800,
      easing: 'cubic-bezier(0.25, 1, 0.50, 1)'
    });

    setTimeout(() => {
      particle.remove();
      bucketEl.classList.add('bounce');
      setTimeout(() => bucketEl.classList.remove('bounce'), 300);
    }, 780);
  }

  function populateBucketFolderSelect() {
    const selectEl = document.getElementById('bucket-folder-select');
    if (!selectEl) return;
    
    selectEl.innerHTML = '<option value="">General (No Folder)</option><option value="__new__">+ Create New Folder...</option>';
    
    const localFolders = new Set();
    const isOwner = document.body.classList.contains('mode-owner');
    const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');
    
    savedLinks.forEach(item => {
      if (item.isPrivate && item.folderName && !item.folderKey && (item.ownerUsername || '').toLowerCase() === currentUser.toLowerCase()) {
        localFolders.add(item.folderName);
      }
    });

    localFolders.forEach(folderName => {
      const option = document.createElement('option');
      option.value = folderName;
      option.textContent = folderName;
      selectEl.appendChild(option);
    });
  }

  const btnCollectToggle = document.getElementById('btn-vault-collect-toggle');
  if (btnCollectToggle) {
    btnCollectToggle.addEventListener('click', () => {
      if (window.collectModeActive) {
        exitCollectMode();
      } else {
        window.collectModeActive = true;
        window.selectedLinkIds = [];
        window.collectSource = currentBookmarkMode === 'shared' ? 'public' : 'private';
        btnCollectToggle.innerHTML = '<i data-lucide="x" style="width: 14px; height: 14px;"></i><span>Exit Collect</span>';
        btnCollectToggle.style.background = 'var(--accent-cyan)';
        btnCollectToggle.style.borderColor = 'var(--accent-cyan)';
        btnCollectToggle.style.color = '#000';
        
        populateBucketFolderSelect();
        
        const bucketEl = document.getElementById('vault-collect-bucket');
        if (bucketEl) {
          bucketEl.classList.remove('hidden');
          const bucketCountEl = document.getElementById('bucket-count');
          if (bucketCountEl) {
            bucketCountEl.textContent = '0';
          }
        }

        renderBookmarks();
      }
      lucide.createIcons();
    });
  }

  const bucketFolderSelect = document.getElementById('bucket-folder-select');
  if (bucketFolderSelect) {
    bucketFolderSelect.addEventListener('change', async () => {
      if (bucketFolderSelect.value === '__new__') {
        const newFolderName = await showModalPrompt('Enter name for the new folder:', 'Create New Folder');
        if (newFolderName && newFolderName.trim()) {
          const opt = document.createElement('option');
          opt.value = newFolderName.trim();
          opt.textContent = newFolderName.trim();
          bucketFolderSelect.appendChild(opt);
          bucketFolderSelect.value = newFolderName.trim();
        } else {
          bucketFolderSelect.value = '';
        }
      }
    });
  }

  const btnBucketCancel = document.getElementById('btn-bucket-cancel');
  if (btnBucketCancel) {
    btnBucketCancel.addEventListener('click', exitCollectMode);
  }

  const btnBucketDone = document.getElementById('btn-bucket-done');
  if (btnBucketDone) {
    btnBucketDone.addEventListener('click', async () => {
      if (window.selectedLinkIds.length === 0) {
        await showModalAlert('Please select at least one link to collect.', 'No Links Selected', 'warning');
        return;
      }
      
      const targetFolder = bucketFolderSelect.value === '__new__' ? '' : bucketFolderSelect.value;
      btnBucketDone.disabled = true;
      try {
        const isOwner = document.body.classList.contains('mode-owner');
        const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');

        const response = await fetch('/api/links/copy-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': currentUser
          },
          body: JSON.stringify({
            linkIds: window.selectedLinkIds,
            folderName: targetFolder || null
          })
        });

        const data = await response.json();
        btnBucketDone.disabled = false;

        if (data.error) {
          await showModalAlert(data.error, 'Sync Error', 'error');
          return;
        }

        await showModalAlert(`Successfully synced ${data.count} links to private folder "${targetFolder || 'General'}"!`, 'Links Synced', 'success');
        exitCollectMode();
        fetchBookmarks();
      } catch (err) {
        btnBucketDone.disabled = false;
        console.error('Batch sync error:', err);
        await showModalAlert('Failed to sync links to private space.', 'Sync Error', 'error');
      }
    });
  }

  // Toggle dropdown forms in Private Space
  if (btnShowAddBookmark) {
    btnShowAddBookmark.addEventListener('click', () => {
      if (editingLinkId) {
        cancelEditBookmark();
        return;
      }
      
      linksaverForm.classList.toggle('hidden');
      accessFolderForm.classList.add('hidden');

      if (linksaverForm.classList.contains('hidden')) {
        btnShowAddBookmark.style.background = '';
        btnShowAddBookmark.style.borderColor = '';
        btnShowAddBookmark.style.color = '';
      } else {
        btnShowAddBookmark.style.background = 'var(--accent-cyan)';
        btnShowAddBookmark.style.borderColor = 'var(--accent-cyan)';
        btnShowAddBookmark.style.color = '#fff';
      }
      btnShowAccessFolder.style.background = '';
      btnShowAccessFolder.style.borderColor = '';
      btnShowAccessFolder.style.color = '';
    });
  }

  if (btnShowAccessFolder) {
    btnShowAccessFolder.addEventListener('click', () => {
      accessFolderForm.classList.toggle('hidden');
      linksaverForm.classList.add('hidden');

      if (accessFolderForm.classList.contains('hidden')) {
        btnShowAccessFolder.style.background = '';
        btnShowAccessFolder.style.borderColor = '';
        btnShowAccessFolder.style.color = '';
      } else {
        btnShowAccessFolder.style.background = 'var(--accent-cyan)';
        btnShowAccessFolder.style.borderColor = 'var(--accent-cyan)';
        btnShowAccessFolder.style.color = '#fff';
      }
      btnShowAddBookmark.style.background = '';
      btnShowAddBookmark.style.borderColor = '';
      btnShowAddBookmark.style.color = '';
    });
  }

  // Import shared folder using linkKey
  if (btnImportFolder) {
    btnImportFolder.addEventListener('click', async () => {
      const keyVal = folderKeyInput.value.trim();
      if (!keyVal) {
        await showModalAlert('Please enter a folder sharing key (linkKey).', 'Import Folder', 'warning');
        return;
      }

      btnImportFolder.disabled = true;
      btnImportFolder.innerHTML = '<i data-lucide="loader" class="animate-spin" style="width: 16px; height: 16px;"></i> <span>Importing...</span>';
      lucide.createIcons();

      try {
        const isOwner = document.body.classList.contains('mode-owner');
        const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');

        const response = await fetch('/api/folders/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': currentUser
          },
          body: JSON.stringify({ linkKey: keyVal })
        });
        const data = await response.json();

        btnImportFolder.disabled = false;
        btnImportFolder.innerHTML = '<i data-lucide="download" style="width: 16px; height: 16px;"></i> <span>Import Folder</span>';
        lucide.createIcons();

        if (data.error) {
          await showModalAlert(data.error, 'Import Folder Error', 'error');
          return;
        }

        folderKeyInput.value = '';
        await showModalAlert(`Successfully imported shared folder "${data.folderName}" (Shared by ${data.ownerUsername})!`, 'Import Folder', 'success');
        fetchBookmarks();
      } catch (err) {
        btnImportFolder.disabled = false;
        btnImportFolder.innerHTML = '<i data-lucide="download" style="width: 16px; height: 16px;"></i> <span>Import Folder</span>';
        lucide.createIcons();
        console.error('Import folder error:', err);
        await showModalAlert('Failed to import shared folder. Make sure the key is valid.', 'Import Folder Error', 'error');
      }
    });
  }

  // Delegate folder action events: share, unsave, click to copy key
  bookmarksContainer.addEventListener('click', async (e) => {
    // Clear all general (unfiled) bookmarks
    const clearGeneralBtn = e.target.closest('.btn-clear-general');
    if (clearGeneralBtn) {
      const confirmed = await showModalConfirm(
        'Are you sure you want to delete <strong>all unfiled bookmarks</strong> in the General Bookmarks section?<br><br><span style="color: var(--accent-pink);">This action cannot be undone.</span>',
        'Clear All General Bookmarks'
      );
      if (!confirmed) return;

      clearGeneralBtn.disabled = true;
      try {
        const isOwner = document.body.classList.contains('mode-owner');
        const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');
        const ownerToken = localStorage.getItem('owner_token');
        const headers = { 'x-user-name': currentUser };
        if (ownerToken) headers['x-owner-token'] = ownerToken;

        const response = await fetch('/api/bookmarks/clear-general', {
          method: 'DELETE',
          headers
        });
        const data = await response.json();
        clearGeneralBtn.disabled = false;

        if (data.error) {
          await showModalAlert(data.error, 'Clear Error', 'error');
          return;
        }

        await showModalAlert(`All unfiled bookmarks have been removed (${data.count} deleted).`, 'Clear General Bookmarks', 'success');
        fetchBookmarks();
      } catch (err) {
        clearGeneralBtn.disabled = false;
        console.error('Clear general bookmarks error:', err);
        await showModalAlert('Failed to clear general bookmarks.', 'Clear Error', 'error');
      }
      return;
    }

    const deleteFolderBtn = e.target.closest('.btn-delete-folder');
    if (deleteFolderBtn) {
      const folderName = deleteFolderBtn.getAttribute('data-folder');
      const confirmed = await showModalConfirm(`Are you sure you want to delete the folder "${folderName}"?<br><br><span style="color: var(--accent-pink);">Warning: This will delete all bookmarks inside this folder!</span>`, 'Delete Folder');
      if (!confirmed) return;

      deleteFolderBtn.disabled = true;
      try {
        const isOwner = document.body.classList.contains('mode-owner');
        const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');
        const ownerToken = localStorage.getItem('owner_token');
        const headers = {
          'x-user-name': currentUser
        };
        if (ownerToken) headers['x-owner-token'] = ownerToken;

        const response = await fetch(`/api/folders?folderName=${encodeURIComponent(folderName)}`, {
          method: 'DELETE',
          headers: headers
        });
        const data = await response.json();
        deleteFolderBtn.disabled = false;

        if (data.error) {
          await showModalAlert(data.error, 'Delete Folder Error', 'error');
          return;
        }

        await showModalAlert(`Folder "${folderName}" and all its bookmarks have been deleted.`, 'Delete Folder Success', 'success');
        fetchBookmarks();
      } catch (err) {
        deleteFolderBtn.disabled = false;
        console.error('Delete folder error:', err);
        await showModalAlert('Failed to delete folder.', 'Delete Folder Error', 'error');
      }
      return;
    }

    const shareBtn = e.target.closest('.btn-share-folder');
    if (shareBtn) {
      const folderName = shareBtn.getAttribute('data-folder');
      shareBtn.disabled = true;
      try {
        const isOwner = document.body.classList.contains('mode-owner');
        const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');

        const response = await fetch('/api/folders/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': currentUser
          },
          body: JSON.stringify({ folderName })
        });
        const data = await response.json();
        shareBtn.disabled = false;

        if (data.error) {
          await showModalAlert(data.error, 'Share Folder Error', 'error');
          return;
        }

        if (data.linkKey) {
          await navigator.clipboard.writeText(data.linkKey);
          await showModalAlert(`Folder shared successfully!<br><br>Sharing Key: <strong>${data.linkKey}</strong><br><br>The key has been copied to your clipboard. Share it with your friends to give them access!`, 'Share Folder', 'success');
          fetchBookmarks();
        }
      } catch (err) {
        shareBtn.disabled = false;
        console.error('Share folder error:', err);
        await showModalAlert('Failed to generate folder sharing key.', 'Share Folder Error', 'error');
      }
      return;
    }

    const cloneBtn = e.target.closest('.btn-clone-folder');
    if (cloneBtn) {
      const folderKey = cloneBtn.getAttribute('data-key');
      const defaultName = cloneBtn.getAttribute('data-name');
      const targetFolderName = await showModalPrompt('Clone Folder: All links in this shared folder will be copied into a local private folder of your own so you can edit or delete them.\n\nEnter new target folder name:', 'Clone Folder', defaultName);
      if (!targetFolderName || !targetFolderName.trim()) return;

      cloneBtn.disabled = true;
      try {
        const isOwner = document.body.classList.contains('mode-owner');
        const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');

        const response = await fetch('/api/folders/clone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': currentUser
          },
          body: JSON.stringify({ folderKey, targetFolderName: targetFolderName.trim() })
        });
        const data = await response.json();
        cloneBtn.disabled = false;

        if (data.error) {
          await showModalAlert(data.error, 'Clone Folder Error', 'error');
          return;
        }

        await showModalAlert(`Folder successfully cloned to "${targetFolderName.trim()}"! Copied ${data.count} bookmarks.`, 'Clone Folder Success', 'success');
        fetchBookmarks();
      } catch (err) {
        cloneBtn.disabled = false;
        console.error('Clone folder error:', err);
        await showModalAlert('Failed to clone shared folder.', 'Clone Folder Error', 'error');
      }
      return;
    }

    const unsaveBtn = e.target.closest('.btn-unsave-folder');
    if (unsaveBtn) {
      const keyVal = unsaveBtn.getAttribute('data-key');
      const confirmed = await showModalConfirm('Unsubscribe from this shared folder? It will remove it from your bookmarks list.', 'Unsubscribe Folder');
      if (!confirmed) return;

      unsaveBtn.disabled = true;
      try {
        const isOwner = document.body.classList.contains('mode-owner');
        const currentUser = isOwner ? 'Owner' : (guestUser || 'Guest');

        const response = await fetch('/api/folders/unsave', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-name': currentUser
          },
          body: JSON.stringify({ linkKey: keyVal })
        });
        const data = await response.json();
        unsaveBtn.disabled = false;

        if (data.error) {
          await showModalAlert(data.error, 'Unsubscribe Error', 'error');
          return;
        }

        fetchBookmarks();
      } catch (err) {
        unsaveBtn.disabled = false;
        console.error('Unsave folder error:', err);
        await showModalAlert('Failed to unsubscribe from folder.', 'Unsubscribe Error', 'error');
      }
      return;
    }

    const badgeCopy = e.target.closest('[data-key]');
    if (badgeCopy && badgeCopy.classList.contains('bookmark-folder-badge')) {
      const keyVal = badgeCopy.getAttribute('data-key');
      await navigator.clipboard.writeText(keyVal);
      await showModalAlert(`Sharing key <strong>${keyVal}</strong> copied to clipboard!`, 'Copy Key', 'success');
    }
  });




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
  if (initialMode === 'guest' && guestUser) {
    fetchUserProfile();
  }

  const savedBookmarkMode = localStorage.getItem('bookmark_hub_mode') || 'shared';
  updateBookmarkModeUI(savedBookmarkMode);

  // 2. Initial load of bookmarks
  fetchBookmarks();

  // Wire account page inline auth forms
  wireAccountAuthForms();

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
    } else if (tabName === 'brian') {
      await loadAdminBrianData(token);
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
      listBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No guest user accounts found.</td></tr>';
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
      
      const status = u.brian_access || 'none';
      let badgeClass = 'none';
      let badgeText = 'No Request';
      
      if (status === 'approved') {
        badgeClass = 'approved';
        badgeText = 'Bro / Approved';
      } else if (status === 'pending') {
        badgeClass = 'pending';
        badgeText = 'Pending';
      } else if (status === 'rejected') {
        badgeClass = 'rejected';
        badgeText = 'Rejected';
      }

      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${u.username}</td>
        <td>${regDate}</td>
        <td>
          <span class="access-badge ${badgeClass}">${badgeText}</span>
        </td>
        <td style="text-align: right;">
          <div class="admin-actions">
            ${status !== 'approved' ? `
              <button class="btn-admin-action approve-bro" title="Approve Bro Access">
                <i data-lucide="user-check"></i>
              </button>
            ` : `
              <button class="btn-admin-action revoke-bro" title="Revoke Bro Access">
                <i data-lucide="user-x"></i>
              </button>
            `}
            <button class="btn-admin-action reset-pw" title="Reset Password">
              <i data-lucide="key-round"></i>
            </button>
            <button class="btn-admin-action delete" title="Delete User">
              <i data-lucide="user-minus"></i>
            </button>
          </div>
        </td>
      `;
      
      // Approve Handler
      const approveBtn = tr.querySelector('.approve-bro');
      if (approveBtn) {
        approveBtn.addEventListener('click', async () => {
          const username = u.username;
          try {
            const res = await fetch(`/api/admin/users/${username}/brian-access`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-owner-token': localStorage.getItem('owner_token')
              },
              body: JSON.stringify({ status: 'approved' })
            });
            const result = await res.json();
            if (res.ok) {
              await showModalAlert(`Approved "${username}" for Brian AI (Bro Mode).`, 'Success', 'success');
              loadAdminUsers(localStorage.getItem('owner_token'));
            } else {
              await showModalAlert(result.error || 'Failed to approve user.', 'Error', 'error');
            }
          } catch (e) {
            await showModalAlert('Failed to update access.', 'Error', 'error');
          }
        });
      }

      // Revoke Handler
      const revokeBtn = tr.querySelector('.revoke-bro');
      if (revokeBtn) {
        revokeBtn.addEventListener('click', async () => {
          const username = u.username;
          const confirmed = await showModalConfirm(`Are you sure you want to revoke Brian AI access for "${username}"?`, 'Revoke Access');
          if (!confirmed) return;

          try {
            const res = await fetch(`/api/admin/users/${username}/brian-access`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-owner-token': localStorage.getItem('owner_token')
              },
              body: JSON.stringify({ status: 'none' })
            });
            const result = await res.json();
            if (res.ok) {
              await showModalAlert(`Revoked Brian AI access for "${username}".`, 'Success', 'success');
              loadAdminUsers(localStorage.getItem('owner_token'));
            } else {
              await showModalAlert(result.error || 'Failed to revoke access.', 'Error', 'error');
            }
          } catch (e) {
            await showModalAlert('Failed to update access.', 'Error', 'error');
          }
        });
      }

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

  // --- Brian AI Data Management (Layer 2 & 3) ---

  async function loadAdminBrianData(token) {
    try {
      // Load People
      const peopleRes = await fetch('/api/brian/people', {
        headers: { 'x-owner-token': token }
      });
      if (peopleRes.ok) {
        const pData = await peopleRes.json();
        renderAdminPeople(pData.people);
      }

      // Load Stories
      const storiesRes = await fetch('/api/brian/stories', {
        headers: { 'x-owner-token': token }
      });
      if (storiesRes.ok) {
        const sData = await storiesRes.json();
        renderAdminStories(sData.stories);
      }
    } catch (err) {
      console.error('Failed to load Brian admin data:', err);
    }
  }

  function renderAdminPeople(people) {
    const listBody = document.getElementById('admin-people-list');
    if (!listBody) return;
    listBody.innerHTML = '';

    if (!people || people.length === 0) {
      listBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No relationship profiles registered.</td></tr>';
      return;
    }

    people.forEach(p => {
      const tr = document.createElement('tr');
      const aliasesList = Array.isArray(p.aliases) ? p.aliases.join(', ') : (p.aliases || '');
      
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${escapeHTML(p.real_name)}</td>
        <td style="font-size: 12px; color: var(--text-secondary);">${escapeHTML(aliasesList || 'None')}</td>
        <td><span class="category-tag cyan" style="font-size: 11px; padding: 2px 6px;">${escapeHTML(p.relationship || 'Friend')}</span></td>
        <td style="font-size: 12px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(p.opinion || '')}">${escapeHTML(p.opinion || '')}</td>
        <td style="font-size: 12px; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(p.notes || '')}">${escapeHTML(p.notes || '')}</td>
        <td style="text-align: right; padding-right: 20px;">
          <div class="admin-actions">
            <button class="btn-admin-action edit" title="Edit Profile">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="btn-admin-action delete" title="Delete Profile">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;

      // Edit Person Hook
      tr.querySelector('.edit').addEventListener('click', async () => {
        const updated = await showAddPersonModal(p);
        if (updated) {
          await showModalAlert('Person relationship profile updated successfully.', 'Profile Updated', 'success');
          loadAdminBrianData(localStorage.getItem('owner_token'));
        }
      });

      // Delete Person Hook
      tr.querySelector('.delete').addEventListener('click', async () => {
        const confirmed = await showModalConfirm(`Are you sure you want to delete the relationship profile for "${p.real_name}"?`, 'Delete Profile');
        if (!confirmed) return;

        try {
          const response = await fetch(`/api/brian/people/${p.id}`, {
            method: 'DELETE',
            headers: {
              'x-owner-token': localStorage.getItem('owner_token')
            }
          });
          const result = await response.json();
          if (response.ok && result.success) {
            await showModalAlert(result.message || 'Profile deleted successfully.', 'Profile Deleted', 'success');
            loadAdminBrianData(localStorage.getItem('owner_token'));
          } else {
            await showModalAlert(result.error || 'Failed to delete profile.', 'Error', 'error');
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

  function renderAdminStories(stories) {
    const listBody = document.getElementById('admin-stories-list');
    if (!listBody) return;
    listBody.innerHTML = '';

    if (!stories || stories.length === 0) {
      listBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No global story records found.</td></tr>';
      return;
    }

    stories.forEach(s => {
      const tr = document.createElement('tr');
      const dateStr = s.date ? new Date(s.date).toLocaleDateString() : 'N/A';
      const charList = Array.isArray(s.people) ? s.people.join(', ') : (s.people || '');

      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(s.title)}">${escapeHTML(s.title)}</td>
        <td style="font-size: 12px; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(s.summary || '')}">${escapeHTML(s.summary || '')}</td>
        <td style="font-size: 12px; color: var(--text-muted);">${escapeHTML(charList || 'None')}</td>
        <td><span class="category-tag purple" style="font-size: 11px; padding: 2px 6px;">${escapeHTML(s.emotion || 'neutral')}</span></td>
        <td style="font-size: 12px; color: var(--text-muted);">${dateStr}</td>
        <td style="text-align: right; padding-right: 20px;">
          <div class="admin-actions">
            <button class="btn-admin-action edit" title="Edit Story">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="btn-admin-action delete" title="Delete Story">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;

      // Edit Story Hook
      tr.querySelector('.edit').addEventListener('click', async () => {
        const updated = await showAddStoryModal(s);
        if (updated) {
          await showModalAlert('Story record updated and vector embedding regenerated successfully.', 'Story Updated', 'success');
          loadAdminBrianData(localStorage.getItem('owner_token'));
        }
      });

      // Delete Story Hook
      tr.querySelector('.delete').addEventListener('click', async () => {
        const confirmed = await showModalConfirm(`Are you sure you want to delete the story record "${s.title}"?`, 'Delete Story');
        if (!confirmed) return;

        try {
          const response = await fetch(`/api/brian/stories/${s.id}`, {
            method: 'DELETE',
            headers: {
              'x-owner-token': localStorage.getItem('owner_token')
            }
          });
          const result = await response.json();
          if (response.ok && result.success) {
            await showModalAlert(result.message || 'Story deleted successfully.', 'Story Deleted', 'success');
            loadAdminBrianData(localStorage.getItem('owner_token'));
          } else {
            await showModalAlert(result.error || 'Failed to delete story.', 'Error', 'error');
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

  function showAddPersonModal(existingPerson = null) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';

      const isEdit = !!existingPerson;
      const titleText = isEdit ? 'Edit Relationship Profile' : 'Add Relationship Profile';
      const iconName = isEdit ? 'edit-2' : 'user-plus';
      const submitText = isEdit ? 'Update Profile' : 'Save Profile';
      const nameVal = isEdit ? escapeHTML(existingPerson.real_name) : '';
      const aliasesVal = isEdit ? escapeHTML(Array.isArray(existingPerson.aliases) ? existingPerson.aliases.join(', ') : (existingPerson.aliases || '')) : '';
      const relationshipVal = isEdit ? escapeHTML(existingPerson.relationship || '') : '';
      const opinionVal = isEdit ? escapeHTML(existingPerson.opinion || '') : '';
      const notesVal = isEdit ? escapeHTML(existingPerson.notes || '') : '';

      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim" style="max-width: 420px; width: 100%;">
          <div class="modal-header">
            <i data-lucide="${iconName}" class="modal-icon info" style="color: var(--accent-cyan);"></i>
            <h3>${titleText}</h3>
          </div>
          <div class="modal-body">
            <form id="form-admin-add-person" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="auth-field-group">
                <i data-lucide="user" class="auth-field-icon"></i>
                <input type="text" id="add-person-name" required placeholder="Real Name (e.g. Ena)" value="${nameVal}">
              </div>
              <div class="auth-field-group">
                <i data-lucide="tag" class="auth-field-icon"></i>
                <input type="text" id="add-person-aliases" placeholder="Aliases (comma-separated, e.g. Enu, En)" value="${aliasesVal}">
              </div>
              <div class="auth-field-group">
                <i data-lucide="heart" class="auth-field-icon"></i>
                <input type="text" id="add-person-relationship" placeholder="Relationship to Borno (e.g. Friend)" value="${relationshipVal}">
              </div>
              <div class="auth-field-group" style="align-items: flex-start; height: auto;">
                <i data-lucide="message-circle" class="auth-field-icon" style="margin-top: 10px;"></i>
                <textarea id="add-person-opinion" required placeholder="Brian's opinion of them (what Brian thinks of them)" style="width: 100%; height: 80px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); color: var(--text-primary); border-radius: var(--border-radius-sm); padding: 8px 10px 8px 36px; font-family: inherit; font-size: 13px; outline: none; resize: none;">${opinionVal}</textarea>
              </div>
              <div class="auth-field-group" style="align-items: flex-start; height: auto;">
                <i data-lucide="sticky-note" class="auth-field-icon" style="margin-top: 10px;"></i>
                <textarea id="add-person-notes" placeholder="General notes / context" style="width: 100%; height: 60px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); color: var(--text-primary); border-radius: var(--border-radius-sm); padding: 8px 10px 8px 36px; font-family: inherit; font-size: 13px; outline: none; resize: none;">${notesVal}</textarea>
              </div>
              
              <div id="add-person-error" class="auth-error-msg" style="display:none; color: var(--accent-pink); font-size: 12px;"></div>
              
              <button type="submit" class="auth-submit-btn" style="margin-top: 4px; padding: 10px;">
                <span>${submitText}</span>
                <i data-lucide="check" class="auth-submit-icon"></i>
              </button>
            </form>
          </div>
          <div class="modal-footer" style="padding-top: 8px;">
            <button class="btn-secondary btn-modal-close" style="width: 100%; padding: 10px;">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      lucide.createIcons();

      const btnClose = overlay.querySelector('.btn-modal-close');
      const form = overlay.querySelector('#form-admin-add-person');
      const errEl = overlay.querySelector('#add-person-error');

      const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(false);
        }, 150);
      };

      btnClose.addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.style.display = 'none';

        const name = overlay.querySelector('#add-person-name').value.trim();
        const aliases = overlay.querySelector('#add-person-aliases').value.trim();
        const relationship = overlay.querySelector('#add-person-relationship').value.trim();
        const opinion = overlay.querySelector('#add-person-opinion').value.trim();
        const notes = overlay.querySelector('#add-person-notes').value.trim();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
          const res = await fetch(isEdit ? `/api/brian/people/${existingPerson.id}` : '/api/brian/people', {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-owner-token': localStorage.getItem('owner_token')
            },
            body: JSON.stringify({ realName: name, aliases, relationship, opinion, notes })
          });

          let data;
          try {
            data = await res.json();
          } catch (e) {
            data = { error: `Server error: ${res.status} ${res.statusText}` };
          }

          if (res.ok && data.success) {
            closeModal();
            resolve(true);
          } else {
            submitBtn.disabled = false;
            errEl.textContent = data.error || 'Failed to save profile.';
            errEl.style.display = 'block';
          }
        } catch (err) {
          console.error('[Admin Person Submit Error]', err);
          submitBtn.disabled = false;
          errEl.textContent = err.message || 'Network error occurred.';
          errEl.style.display = 'block';
        }
      });
    });
  }

  function showAddStoryModal(existingStory = null) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay active';

      const isEdit = !!existingStory;
      const titleText = isEdit ? 'Edit Story Record' : 'Add Story Record';
      const iconName = isEdit ? 'edit-2' : 'book-open';
      const submitText = isEdit ? 'Update Story' : 'Save Story';
      const titleVal = isEdit ? escapeHTML(existingStory.title) : '';
      const summaryVal = isEdit ? escapeHTML(existingStory.summary || '') : '';
      const peopleVal = isEdit ? escapeHTML(Array.isArray(existingStory.people) ? existingStory.people.join(', ') : (existingStory.people || '')) : '';
      const emotionVal = isEdit ? escapeHTML(existingStory.emotion || '') : '';
      const fullTextVal = isEdit ? escapeHTML(existingStory.full_text || '') : '';

      overlay.innerHTML = `
        <div class="custom-modal glass-panel popup-anim" style="max-width: 440px; width: 100%;">
          <div class="modal-header">
            <i data-lucide="${iconName}" class="modal-icon info" style="color: var(--accent-purple);"></i>
            <h3>${titleText}</h3>
          </div>
          <div class="modal-body">
            <form id="form-admin-add-story" style="display: flex; flex-direction: column; gap: 14px;">
              <div class="auth-field-group">
                <i data-lucide="heading" class="auth-field-icon"></i>
                <input type="text" id="add-story-title" required placeholder="Story Title (e.g. Kitten Rescue)" value="${titleVal}">
              </div>
              <div class="auth-field-group">
                <i data-lucide="align-left" class="auth-field-icon"></i>
                <input type="text" id="add-story-summary" required placeholder="Short Summary (one-line overview)" value="${summaryVal}">
              </div>
              <div class="auth-field-group">
                <i data-lucide="users" class="auth-field-icon"></i>
                <input type="text" id="add-story-people" placeholder="People Involved (comma-separated, e.g. Ena, Borno)" value="${peopleVal}">
              </div>
              <div class="auth-field-group">
                <i data-lucide="smile" class="auth-field-icon"></i>
                <input type="text" id="add-story-emotion" placeholder="Emotional Tone (e.g. funny, proud, grateful)" value="${emotionVal}">
              </div>
              <div class="auth-field-group" style="align-items: flex-start; height: auto;">
                <i data-lucide="text" class="auth-field-icon" style="margin-top: 10px;"></i>
                <textarea id="add-story-fulltext" required placeholder="Full Story Text (the details that Brian will use to answer)" style="width: 100%; height: 110px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); color: var(--text-primary); border-radius: var(--border-radius-sm); padding: 8px 10px 8px 36px; font-family: inherit; font-size: 13px; outline: none; resize: none;">${fullTextVal}</textarea>
              </div>
              
              <div id="add-story-error" class="auth-error-msg" style="display:none; color: var(--accent-pink); font-size: 12px;"></div>
              
              <button type="submit" class="auth-submit-btn" style="margin-top: 4px; padding: 10px;">
                <span>${submitText}</span>
                <i data-lucide="check" class="auth-submit-icon"></i>
              </button>
            </form>
          </div>
          <div class="modal-footer" style="padding-top: 8px;">
            <button class="btn-secondary btn-modal-close" style="width: 100%; padding: 10px;">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      lucide.createIcons();

      const btnClose = overlay.querySelector('.btn-modal-close');
      const form = overlay.querySelector('#form-admin-add-story');
      const errEl = overlay.querySelector('#add-story-error');

      const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(false);
        }, 150);
      };

      btnClose.addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.style.display = 'none';

        const title = overlay.querySelector('#add-story-title').value.trim();
        const summary = overlay.querySelector('#add-story-summary').value.trim();
        const people = overlay.querySelector('#add-story-people').value.trim();
        const emotion = overlay.querySelector('#add-story-emotion').value.trim();
        const fullText = overlay.querySelector('#add-story-fulltext').value.trim();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
          const res = await fetch(isEdit ? `/api/brian/stories/${existingStory.id}` : '/api/brian/stories', {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-owner-token': localStorage.getItem('owner_token')
            },
            body: JSON.stringify({ title, summary, people, emotion, fullText })
          });

          let data;
          try {
            data = await res.json();
          } catch (e) {
            data = { error: `Server error: ${res.status} ${res.statusText}` };
          }

          if (res.ok && data.success) {
            closeModal();
            resolve(true);
          } else {
            submitBtn.disabled = false;
            errEl.textContent = data.error || 'Failed to save story.';
            errEl.style.display = 'block';
          }
        } catch (err) {
          console.error('[Admin Story Submit Error]', err);
          submitBtn.disabled = false;
          errEl.textContent = err.message || 'Network error occurred.';
          errEl.style.display = 'block';
        }
      });
    });
  }

  // Click listeners for Add actions
  const btnAddPerson = document.getElementById('btn-admin-add-person');
  if (btnAddPerson) {
    btnAddPerson.addEventListener('click', async () => {
      const added = await showAddPersonModal();
      if (added) {
        await showModalAlert('Person relationship profile added successfully.', 'Profile Added', 'success');
        loadAdminBrianData(localStorage.getItem('owner_token'));
      }
    });
  }

  const btnAddStory = document.getElementById('btn-admin-add-story');
  if (btnAddStory) {
    btnAddStory.addEventListener('click', async () => {
      const added = await showAddStoryModal();
      if (added) {
        await showModalAlert('Story record saved and vector embedding generated successfully.', 'Story Added', 'success');
        loadAdminBrianData(localStorage.getItem('owner_token'));
      }
    });
  }

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

  // --- Project Brian AI Controller ---
  const brianChatHistory = document.getElementById('brian-chat-history');
  const brianChatInputField = document.getElementById('brian-chat-input-field');
  const btnSendBrianMsg = document.getElementById('btn-send-brian-msg');
  brianIdentityName = document.getElementById('brian-identity-name');
  const btnApplyBrianIdentity = document.getElementById('btn-apply-brian-identity');
  
  // New chat history elements
  brianSessionsList = document.getElementById('brian-sessions-list');
  const btnBrianNewChat = document.getElementById('btn-brian-new-chat');
  const brianSearchChats = document.getElementById('brian-search-chats');

  // Initialize session ID from localStorage or generate new
  let brianSessionId = localStorage.getItem('brian_session_id');

  // Sync identity display: always locked to the authenticated username
  function syncBrianIdentity() {
    const currentMode = localStorage.getItem('nexus_mode') || 'guest';
    const activeUser = currentMode === 'owner' ? 'Owner' : (guestUser || 'Guest');
    if (brianIdentityName) {
      // brianIdentityName is now a div (read-only display), not an input
      brianIdentityName.textContent = activeUser;
    }
  }

  // Call sync initial identity
  syncBrianIdentity();

  // Identity is read-only — no Apply Name button handler needed


  // Load conversations list from backend
  async function loadConversationsList(autoSelectMostRecent = false) {
    if (!brianSessionsList) return;

    try {
      const searchQuery = brianSearchChats ? brianSearchChats.value.trim() : '';
      const filterSelect = document.getElementById('brian-admin-chat-filter');
      const userFilter = filterSelect ? filterSelect.value : 'all';

      const response = await fetch(`/api/brian/conversations?search=${encodeURIComponent(searchQuery)}&userFilter=${encodeURIComponent(userFilter)}`, {
        headers: {
          'x-user-name': guestUser || 'Guest',
          'x-owner-token': localStorage.getItem('owner_token') || ''
        }
      });
      const data = await response.json();

      if (data.success && data.conversations) {
        const list = data.conversations;
        
        if (list.length === 0) {
          brianSessionsList.innerHTML = `<div class="chat-list-empty" style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 12px;">No chats found</div>`;
          if (autoSelectMostRecent && !brianSessionId) {
            startNewChat();
          }
          return;
        }

        brianSessionsList.innerHTML = '';
        list.forEach(item => {
          const itemEl = document.createElement('div');
          itemEl.className = `chat-session-item ${item.sessionId === brianSessionId ? 'active' : ''}`;
          itemEl.dataset.sessionId = item.sessionId;

          // Format Date
          const dateObj = new Date(item.updatedAt);
          const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

          // Truncate title (first message)
          let displayTitle = item.firstMessage || 'New Chat';
          if (displayTitle.length > 25) {
            displayTitle = displayTitle.substring(0, 22) + '...';
          }

          itemEl.innerHTML = `
            <div class="chat-session-content">
              <div class="chat-session-icon">
                <i data-lucide="message-square" style="width: 14px; height: 14px;"></i>
              </div>
              <div class="chat-session-info">
                <span class="chat-session-title">${escapeHTML(displayTitle)}</span>
                <span class="chat-session-preview">By ${escapeHTML(item.userName)}</span>
              </div>
            </div>
            <span class="chat-session-date">${displayDate}</span>
            <button class="btn-delete-session" title="Delete Chat">
              <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
            </button>
          `;

          // Add click event to load chat
          itemEl.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-session')) return;
            loadConversationSession(item.sessionId);
          });

          // Add delete button click event
          const btnDelete = itemEl.querySelector('.btn-delete-session');
          btnDelete.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await showModalConfirm('Are you sure you want to permanently delete this chat history?', 'Delete Chat History');
            if (confirmed) {
              await deleteConversationSession(item.sessionId);
            }
          });

          brianSessionsList.appendChild(itemEl);
        });

        // Initialize lucide icons in the generated list
        lucide.createIcons();

        // Auto select the first conversation if none is active or if we forced autoSelect
        if (autoSelectMostRecent) {
          if (!brianSessionId && list.length > 0) {
            loadConversationSession(list[0].sessionId);
          } else if (brianSessionId) {
            const exists = list.some(item => item.sessionId === brianSessionId);
            if (exists) {
              loadConversationSession(brianSessionId);
            } else {
              loadConversationSession(list[0].sessionId);
            }
          } else {
            startNewChat();
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  // Load a single conversation session and render its messages
  async function loadConversationSession(sessionId) {
    brianSessionId = sessionId;
    localStorage.setItem('brian_session_id', brianSessionId);

    // Update active visual state
    const items = brianSessionsList.querySelectorAll('.chat-session-item');
    items.forEach(item => {
      if (item.dataset.sessionId === sessionId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (!brianChatHistory) return;
    brianChatHistory.innerHTML = '';

    try {
      const response = await fetch(`/api/brian/conversations/${sessionId}`, {
        headers: {
          'x-user-name': guestUser || 'Guest',
          'x-owner-token': localStorage.getItem('owner_token') || ''
        }
      });
      const data = await response.json();

      if (data.success && data.conversation && data.conversation.messages) {
        const messages = data.conversation.messages;
        if (messages.length === 0) {
          showDefaultGreeting();
        } else {
          messages.forEach(m => {
            appendBrianChatMessage(m.sender.toLowerCase() === 'brian' ? 'brian' : 'user', m.text);
          });
        }
      } else {
        showDefaultGreeting();
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      showDefaultGreeting();
    }
  }

  // Start a new chat session locally (generate ID, clear view)
  function startNewChat() {
    brianSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('brian_session_id', brianSessionId);

    // Deselect list items
    if (brianSessionsList) {
      const items = brianSessionsList.querySelectorAll('.chat-session-item');
      items.forEach(item => item.classList.remove('active'));
    }

    if (brianChatHistory) {
      brianChatHistory.innerHTML = '';
      showDefaultGreeting();
    }
  }

  // Delete a conversation session from backend
  async function deleteConversationSession(sessionId) {
    try {
      const response = await fetch(`/api/brian/conversations/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'x-user-name': guestUser || 'Guest',
          'x-owner-token': localStorage.getItem('owner_token') || ''
        }
      });
      const data = await response.json();
      if (data.success) {
        // If the active session is deleted, start a new chat
        if (brianSessionId === sessionId) {
          startNewChat();
        }
        await loadConversationsList(false);
      } else {
        showModalAlert('Failed to delete chat session.', 'Error', 'error');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      showModalAlert('Error connecting to server.', 'Error', 'error');
    }
  }

  // Helper to show greeting
  function showDefaultGreeting() {
    if (!brianChatHistory) return;
    brianChatHistory.innerHTML = `
      <div class="chat-row brian-row">
        <div class="chat-avatar">B</div>
        <div class="chat-bubble">
          Hey! I'm Brian, Borno's younger brother. Who's this? Introduction time!
        </div>
      </div>
    `;
    brianChatHistory.scrollTop = brianChatHistory.scrollHeight;
  }

  // Helper to escape HTML characters
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Function to append messages to the chat view
  function appendBrianChatMessage(sender, text) {
    if (!brianChatHistory) return;
    
    const row = document.createElement('div');
    row.className = `chat-row ${sender === 'user' ? 'user-row' : 'brian-row'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = sender === 'user'
      ? ((guestUser || 'G').substring(0, 1).toUpperCase())
      : 'B';
    
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true });
      bubble.innerHTML = marked.parse(text);
    } else {
      bubble.textContent = text;
    }
    
    if (sender === 'brian') {
      row.appendChild(avatar);
      row.appendChild(bubble);
    } else {
      row.appendChild(bubble);
    }
    
    brianChatHistory.appendChild(row);
    brianChatHistory.scrollTop = brianChatHistory.scrollHeight;
  }

  // Function to send user message to Brian API
  async function sendMsgToBrian() {
    if (!brianChatInputField) return;
    const message = brianChatInputField.value.trim();
    if (!message) return;

    // Always use the authenticated username — identity cannot be spoofed
    const currentMode = localStorage.getItem('nexus_mode') || 'guest';
    const userName = currentMode === 'owner' ? 'Owner' : (guestUser || 'Guest');

    // Clear input field
    brianChatInputField.value = '';

    // Append user message
    appendBrianChatMessage('user', message);

    // Show typing placeholder
    const typingRow = document.createElement('div');
    typingRow.className = 'chat-row brian-row typing-indicator-row';
    typingRow.innerHTML = `
      <div class="chat-avatar">B</div>
      <div class="chat-bubble typing-bubble">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
    brianChatHistory.appendChild(typingRow);
    brianChatHistory.scrollTop = brianChatHistory.scrollHeight;

    try {
      const response = await fetch('/api/brian/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-name': guestUser || 'Guest',
          'x-owner-token': localStorage.getItem('owner_token') || ''
        },
        body: JSON.stringify({
          sessionId: brianSessionId,
          userName: userName,
          message: message
        })
      });

      const data = await response.json();

      // Remove typing placeholder
      const indicator = brianChatHistory.querySelector('.typing-indicator-row');
      if (indicator) {
        indicator.remove();
      }

      if (data.reply) {
        appendBrianChatMessage('brian', data.reply);
        loadConversationsList(false); // Refresh sidebar list
      } else {
        appendBrianChatMessage('brian', 'Whoops, something went wrong. Try again?');
      }
    } catch (error) {
      console.error('Error talking to Brian:', error);
      const indicator = brianChatHistory.querySelector('.typing-indicator-row');
      if (indicator) {
        indicator.remove();
      }
      appendBrianChatMessage('brian', "Can't seem to connect right now. Is the server running?");
    }
  }

  // Event listener for button click
  if (btnSendBrianMsg) {
    btnSendBrianMsg.addEventListener('click', sendMsgToBrian);
  }

  // Event listener for enter key
  if (brianChatInputField) {
    brianChatInputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (!e.shiftKey) {
          e.preventDefault();
          sendMsgToBrian();
        }
      }
    });
  }

  // New Chat button event listener
  if (btnBrianNewChat) {
    btnBrianNewChat.addEventListener('click', startNewChat);
  }

  // Search input event listener (live filter)
  if (brianSearchChats) {
    brianSearchChats.addEventListener('input', () => {
      loadConversationsList(false);
    });
  }

  // Admin chat filter dropdown event listener
  const filterSelect = document.getElementById('brian-admin-chat-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      loadConversationsList(false);
    });
  }

  // Trigger sync identity and load conversations when view switches to Brian
  const brianBtn = document.querySelector('.nav-item[data-view="brian"]');
  if (brianBtn) {
    brianBtn.addEventListener('click', () => {
      syncBrianIdentity();
      loadConversationsList(false);
    });
  }

  // Same sync for mobile bottom nav Brian button
  const mbnBrianBtn = document.getElementById('mbn-brian');
  if (mbnBrianBtn) {
    mbnBrianBtn.addEventListener('click', () => {
      syncBrianIdentity();
      loadConversationsList(false);
    });
  }

  // Brian AI Auth Elements & Handlers
  brianAuthLandingView = document.getElementById('brian-auth-landing-view');
  brianChatWrapperPanel = document.getElementById('brian-chat-wrapper-panel');
  const brianLandingTabLogin = document.getElementById('brian-landing-tab-login');
  const brianLandingTabSignup = document.getElementById('brian-landing-tab-signup');
  const brianLandingAuthForm = document.getElementById('brian-landing-auth-form');
  const brianAuthUsername = document.getElementById('brian-auth-username');
  const brianAuthPassword = document.getElementById('brian-auth-password');
  const brianAuthErrorMsg = document.getElementById('brian-auth-error-msg');
  const brianAuthSubmitText = document.getElementById('brian-auth-submit-text');
  const btnBrianLogout = document.getElementById('btn-brian-logout');

  let currentAuthTab = 'login';

  function checkBrianAuth() {
    const isOwner = document.body.classList.contains('mode-owner');
    const hasAccess = isOwner || (guestUser && guestUserBrianAccess === 'approved');

    if (hasAccess) {
      if (brianAuthLandingView) brianAuthLandingView.style.display = 'none';
      if (brianChatWrapperPanel) brianChatWrapperPanel.style.display = 'flex';
      syncBrianIdentity();
      loadConversationsList(true);
    } else {
      if (brianAuthLandingView) brianAuthLandingView.style.display = 'flex';
      if (brianChatWrapperPanel) brianChatWrapperPanel.style.display = 'none';
    }
  }

  // ── Animated Tab Indicator ──
  const authTabIndicator = document.getElementById('auth-tab-indicator');

  // Handle Tab switching on landing view
  if (brianLandingTabLogin) {
    brianLandingTabLogin.addEventListener('click', () => {
      currentAuthTab = 'login';
      brianLandingTabLogin.classList.add('active');
      if (brianLandingTabSignup) brianLandingTabSignup.classList.remove('active');
      if (authTabIndicator) authTabIndicator.classList.remove('right');
      if (brianAuthSubmitText) brianAuthSubmitText.textContent = 'Log In';
      if (brianAuthErrorMsg) brianAuthErrorMsg.style.display = 'none';
    });
  }

  if (brianLandingTabSignup) {
    brianLandingTabSignup.addEventListener('click', () => {
      currentAuthTab = 'signup';
      brianLandingTabSignup.classList.add('active');
      if (brianLandingTabLogin) brianLandingTabLogin.classList.remove('active');
      if (authTabIndicator) authTabIndicator.classList.add('right');
      if (brianAuthSubmitText) brianAuthSubmitText.textContent = 'Sign Up';
      if (brianAuthErrorMsg) brianAuthErrorMsg.style.display = 'none';
    });
  }

  // ── Password visibility toggle ──
  const brianPwToggle = document.getElementById('brian-pw-toggle');
  if (brianPwToggle && brianAuthPassword) {
    brianPwToggle.addEventListener('click', () => {
      const isHidden = brianAuthPassword.type === 'password';
      brianAuthPassword.type = isHidden ? 'text' : 'password';
      brianPwToggle.querySelector('i').setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
      lucide.createIcons();
    });
  }

  // ── Forgot Password Panel Toggle ──
  const btnBrianForgot = document.getElementById('btn-brian-forgot');
  const brianLoginPanel = document.getElementById('brian-login-panel');
  const brianResetPanel = document.getElementById('brian-reset-panel');
  const btnBrianResetBack = document.getElementById('btn-brian-reset-back');

  if (btnBrianForgot) {
    btnBrianForgot.addEventListener('click', () => {
      if (brianLoginPanel) brianLoginPanel.style.display = 'none';
      if (brianResetPanel) brianResetPanel.style.display = 'block';
      if (brianAuthErrorMsg) brianAuthErrorMsg.style.display = 'none';
    });
  }

  if (btnBrianResetBack) {
    btnBrianResetBack.addEventListener('click', () => {
      if (brianResetPanel) brianResetPanel.style.display = 'none';
      if (brianLoginPanel) brianLoginPanel.style.display = 'block';
      const resetErr = document.getElementById('brian-reset-error-msg');
      if (resetErr) resetErr.style.display = 'none';
    });
  }

  // ── Password Reset Form Submission ──
  const brianResetForm = document.getElementById('brian-reset-form');
  if (brianResetForm) {
    brianResetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const resetErr = document.getElementById('brian-reset-error-msg');
      if (resetErr) resetErr.style.display = 'none';

      const usernameVal = document.getElementById('brian-reset-username')?.value.trim();
      const codeVal = document.getElementById('brian-reset-code')?.value.trim().toUpperCase();
      const newPwVal = document.getElementById('brian-reset-newpw')?.value;
      const confirmPwVal = document.getElementById('brian-reset-confirmpw')?.value;
      const submitBtn = document.getElementById('btn-brian-reset-submit');

      if (newPwVal !== confirmPwVal) {
        if (resetErr) {
          resetErr.textContent = 'Passwords do not match.';
          resetErr.style.display = 'block';
        }
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameVal, recoveryCode: codeVal, newPassword: newPwVal })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          // Show new recovery code modal
          brianResetForm.reset();
          if (brianResetPanel) brianResetPanel.style.display = 'none';
          if (brianLoginPanel) brianLoginPanel.style.display = 'block';
          showRecoveryCodeModal(data.newRecoveryCode, true);
        } else {
          if (resetErr) {
            resetErr.textContent = data.error || 'Reset failed. Check your recovery code.';
            resetErr.style.display = 'block';
          }
        }
      } catch (err) {
        if (resetErr) {
          resetErr.textContent = 'Network error. Please try again.';
          resetErr.style.display = 'block';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }


  // ── Landing page auth form submission ──
  if (brianLandingAuthForm) {
    brianLandingAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (brianAuthErrorMsg) brianAuthErrorMsg.style.display = 'none';

      const uVal = brianAuthUsername.value.trim();
      const pVal = brianAuthPassword.value;
      const submitBtn = document.getElementById('btn-brian-auth-submit');
      const submitTextEl = brianAuthSubmitText;
      const originalText = submitTextEl ? submitTextEl.textContent : '';

      if (submitBtn) submitBtn.disabled = true;
      if (submitTextEl) submitTextEl.textContent = 'Please wait...';

      const endpoint = currentAuthTab === 'login' ? '/api/auth/login' : '/api/auth/signup';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: uVal, password: pVal })
        });

        const data = await res.json();
        if (res.ok) {
          // Success — log user in globally
          guestUser = data.username;
          localStorage.setItem('guest_user', data.username);
          setAppMode('guest');

          // Clear form fields
          brianAuthUsername.value = '';
          brianAuthPassword.value = '';

          checkBrianAuth();

          // On signup: show the one-time recovery code
          if (currentAuthTab === 'signup' && data.recoveryCode) {
            showRecoveryCodeModal(data.recoveryCode, false);
          }
        } else {
          if (brianAuthErrorMsg) {
            brianAuthErrorMsg.textContent = data.error || 'Authentication failed.';
            brianAuthErrorMsg.style.display = 'block';
          }
        }
      } catch (err) {
        if (brianAuthErrorMsg) {
          brianAuthErrorMsg.textContent = 'Network error. Please try again.';
          brianAuthErrorMsg.style.display = 'block';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitTextEl) submitTextEl.textContent = originalText;
      }
    });
  }

  // ── Recovery Code Modal: shown once after signup or after password reset ──
  function showRecoveryCodeModal(code, isReset) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay active';

    const title = isReset ? 'New Recovery Code' : 'Save Your Recovery Code';
    const message = isReset
      ? 'Your password was reset. Here is your new recovery code — save it somewhere safe. The old code is now invalid.'
      : 'Account created! Save this recovery code in a safe place. You will need it if you forget your password. It cannot be shown again.';

    overlay.innerHTML = `
      <div class="custom-modal glass-panel popup-anim" style="max-width: 440px;">
        <div class="modal-header">
          <i data-lucide="shield-check" class="modal-icon success"></i>
          <h3>${title}</h3>
        </div>
        <div class="modal-body">
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px;">${message}</p>
          <div class="recovery-code-box">
            <span id="recovery-code-text">${code}</span>
            <button type="button" class="recovery-copy-btn" id="btn-copy-recovery" title="Copy code">
              <i data-lucide="copy" style="width:15px;height:15px;"></i>
            </button>
          </div>
          <p style="font-size: 11px; color: var(--text-muted); margin-top: 10px;">
            ⚠️ Store this in a password manager, notes app, or write it down. It will not be shown again.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-primary btn-modal-ok" style="min-width: 140px;">I've Saved It</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();

    const btnCopy = overlay.querySelector('#btn-copy-recovery');
    if (btnCopy) {
      btnCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code);
          btnCopy.innerHTML = '<i data-lucide="check" style="width:15px;height:15px;"></i>';
          lucide.createIcons();
          setTimeout(() => {
            btnCopy.innerHTML = '<i data-lucide="copy" style="width:15px;height:15px;"></i>';
            lucide.createIcons();
          }, 2000);
        } catch (_) {
          // Clipboard API may not be available in some contexts
        }
      });
    }

    const btnOk = overlay.querySelector('.btn-modal-ok');
    if (btnOk) {
      btnOk.focus();
      btnOk.addEventListener('click', () => {
        overlay.classList.remove('active');
        const modal = overlay.querySelector('.custom-modal');
        if (modal) { modal.classList.remove('popup-anim'); modal.classList.add('popout-anim'); }
        setTimeout(() => overlay.remove(), 150);
      });
    }
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) btnOk && btnOk.click();
    });
  }


  // Handle Log Out from settings card
  if (btnBrianLogout) {
    btnBrianLogout.addEventListener('click', async () => {
      const confirmed = await showModalConfirm('Are you sure you want to log out of your guest account?', 'Confirm Logout');
      if (confirmed) {
        guestUser = null;
        localStorage.removeItem('guest_user');
        setAppMode('guest');
        checkBrianAuth();
      }
    });
  }

  // Initial load
  checkBrianAuth();

  // --- Tool Vault & Apple spring animation logic ---
  const vaultCard = document.getElementById('dash-card-vault');
  const vaultOverlay = document.getElementById('tool-vault-overlay');
  const vaultWindow = vaultOverlay ? vaultOverlay.querySelector('.tool-vault-window') : null;
  const btnCloseVault = document.getElementById('btn-close-vault');

  function openVaultOverlay() {
    if (!vaultCard || !vaultOverlay || !vaultWindow) return;
    
    const rect = vaultCard.getBoundingClientRect();
    const folderPreview = vaultCard.querySelector('.dash-card-folder-preview');
    const previewRect = folderPreview ? folderPreview.getBoundingClientRect() : rect;

    const centerX = previewRect.left + previewRect.width / 2;
    const centerY = previewRect.top + previewRect.height / 2;
    
    const windowWidth = 420;
    const windowHeight = 280; // Default estimate
    
    const overlayCenterX = window.innerWidth / 2;
    const overlayCenterY = window.innerHeight / 2;
    
    const dx = centerX - overlayCenterX;
    const dy = centerY - overlayCenterY;
    
    const scaleX = previewRect.width / windowWidth;
    const scaleY = previewRect.height / windowHeight;
    const scale = Math.min(scaleX, scaleY) || 0.15;

    vaultWindow.style.transition = 'none';
    vaultWindow.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
    vaultWindow.style.opacity = '0';
    
    // Force reflow
    vaultWindow.offsetHeight;
    
    vaultOverlay.classList.remove('hidden');
    // Force reflow
    vaultOverlay.offsetHeight;
    vaultOverlay.classList.add('active');
    
    vaultWindow.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s';
    vaultWindow.style.transform = 'translate3d(0, 0, 0) scale(1)';
    vaultWindow.style.opacity = '1';
  }

  function closeVaultOverlay() {
    if (!vaultCard || !vaultOverlay || !vaultWindow) return;
    
    const rect = vaultCard.getBoundingClientRect();
    const folderPreview = vaultCard.querySelector('.dash-card-folder-preview');
    const previewRect = folderPreview ? folderPreview.getBoundingClientRect() : rect;
    
    const centerX = previewRect.left + previewRect.width / 2;
    const centerY = previewRect.top + previewRect.height / 2;
    
    const windowWidth = 420;
    const windowHeight = vaultWindow.offsetHeight || 280;
    
    const overlayCenterX = window.innerWidth / 2;
    const overlayCenterY = window.innerHeight / 2;
    
    const dx = centerX - overlayCenterX;
    const dy = centerY - overlayCenterY;
    
    const scaleX = previewRect.width / windowWidth;
    const scaleY = previewRect.height / windowHeight;
    const scale = Math.min(scaleX, scaleY) || 0.15;

    vaultOverlay.classList.remove('active');
    vaultWindow.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s';
    vaultWindow.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
    vaultWindow.style.opacity = '0';
    
    setTimeout(() => {
      vaultOverlay.classList.add('hidden');
    }, 350);
  }

  if (vaultCard) {
    vaultCard.addEventListener('click', openVaultOverlay);
  }
  
  if (btnCloseVault) {
    btnCloseVault.addEventListener('click', closeVaultOverlay);
  }
  
  if (vaultOverlay) {
    vaultOverlay.addEventListener('click', (e) => {
      if (e.target === vaultOverlay) {
        closeVaultOverlay();
      }
    });
  }

  // Vault app items click events
  document.querySelectorAll('.vault-app-item').forEach(item => {
    item.addEventListener('click', () => {
      const app = item.getAttribute('data-app');
      closeVaultOverlay();
      setTimeout(() => {
        switchView(app);
      }, 200); // Wait for transition out slightly
    });
  });

  document.querySelectorAll('.standalone-app-card').forEach(card => {
    card.addEventListener('click', () => {
      const app = card.getAttribute('data-app');
      switchView(app);
    });
  });

  document.querySelectorAll('.btn-back[data-action="go-to-vault"]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView('vault');
    });
  });


  // --- 1. QR Code Tool Javascript Logic ---
  const tabQrGen = document.getElementById('tab-qr-gen');
  const tabQrScan = document.getElementById('tab-qr-scan');
  const qrGenSection = document.getElementById('qr-generator-section');
  const qrScanSection = document.getElementById('qr-scanner-section');

  const qrTextInput = document.getElementById('qr-text');
  const qrFgColor = document.getElementById('qr-fg-color');
  const qrBgColor = document.getElementById('qr-bg-color');
  const qrSizeSlider = document.getElementById('qr-size-slider');
  const qrSizeVal = document.getElementById('qr-size-val');
  const btnGenerateQr = document.getElementById('btn-generate-qr');
  const qrCanvasHolder = document.getElementById('qr-canvas-holder');
  const btnDownloadQr = document.getElementById('btn-download-qr');

  const qrScanDropzone = document.getElementById('qr-scan-dropzone');
  const qrFileInput = document.getElementById('qr-file-input');
  const qrScanResultCard = document.getElementById('qr-scan-result-card');
  const qrDecodedText = document.getElementById('qr-decoded-text');
  const btnCopyQrText = document.getElementById('btn-copy-qr-text');

  // Hex color labels update
  function updateHexLabel(inputEl) {
    const label = inputEl.nextElementSibling;
    if (label && label.classList.contains('color-val-hex')) {
      label.textContent = inputEl.value.toUpperCase();
    }
  }

  if (qrFgColor) {
    qrFgColor.addEventListener('input', () => updateHexLabel(qrFgColor));
  }
  if (qrBgColor) {
    qrBgColor.addEventListener('input', () => updateHexLabel(qrBgColor));
  }

  // QR tabs switching
  if (tabQrGen && tabQrScan) {
    tabQrGen.addEventListener('click', () => {
      tabQrGen.classList.add('active');
      tabQrScan.classList.remove('active');
      qrGenSection.classList.remove('hidden');
      qrScanSection.classList.add('hidden');
    });
    tabQrScan.addEventListener('click', () => {
      tabQrScan.classList.add('active');
      tabQrGen.classList.remove('active');
      qrScanSection.classList.remove('hidden');
      qrGenSection.classList.add('hidden');
    });
  }

  // Size slider update
  if (qrSizeSlider && qrSizeVal) {
    qrSizeSlider.addEventListener('input', () => {
      qrSizeVal.textContent = `${qrSizeSlider.value}px`;
    });
  }

  // QR Code Generation
  if (btnGenerateQr) {
    btnGenerateQr.addEventListener('click', () => {
      const text = qrTextInput.value.trim();
      if (!text) {
        showModalAlert('Please enter some text or URL to generate QR code.', 'Input Required', 'warning');
        return;
      }

      const size = parseInt(qrSizeSlider.value, 10);
      const fg = qrFgColor.value;
      const bg = qrBgColor.value;

      qrCanvasHolder.innerHTML = '';
      const canvas = document.createElement('canvas');

      if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(canvas, text, {
          width: size,
          margin: 2,
          color: {
            dark: fg,
            light: bg
          }
        }, function (error) {
          if (error) {
            console.error('QR code generation failed:', error);
            showModalAlert('Failed to generate QR Code.', 'Generation Error', 'error');
            return;
          }
          qrCanvasHolder.appendChild(canvas);
          btnDownloadQr.classList.remove('hidden');
        });
      } else {
        showModalAlert('QR Code library is not loaded yet.', 'Library Missing', 'error');
      }
    });
  }

  // Download QR Code
  if (btnDownloadQr) {
    btnDownloadQr.addEventListener('click', () => {
      const canvas = qrCanvasHolder.querySelector('canvas');
      if (!canvas) return;
      
      const link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  // QR Scanner dropzone click & select file
  if (qrScanDropzone && qrFileInput) {
    qrScanDropzone.addEventListener('click', () => {
      qrFileInput.click();
    });

    qrScanDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      qrScanDropzone.classList.add('dragover');
    });

    qrScanDropzone.addEventListener('dragleave', () => {
      qrScanDropzone.classList.remove('dragover');
    });

    qrScanDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      qrScanDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        qrFileInput.files = e.dataTransfer.files;
        handleQrScanFile(e.dataTransfer.files[0]);
      }
    });

    qrFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleQrScanFile(e.target.files[0]);
      }
    });
  }

  function handleQrScanFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showModalAlert('Please select a valid image file.', 'Invalid Format', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        if (typeof jsQR !== 'undefined') {
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code) {
            qrDecodedText.textContent = code.data;
            qrScanResultCard.classList.remove('hidden');
          } else {
            qrScanResultCard.classList.add('hidden');
            showModalAlert('No readable QR code found in this image. Make sure the QR code is centered and clear.', 'Scan Failed', 'info');
          }
        } else {
          showModalAlert('Scanner library is not loaded yet.', 'Library Missing', 'error');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Copy Decoded Text
  if (btnCopyQrText) {
    btnCopyQrText.addEventListener('click', () => {
      const txt = qrDecodedText.textContent;
      if (!txt) return;
      navigator.clipboard.writeText(txt).then(() => {
        const icon = btnCopyQrText.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', 'check');
          lucide.createIcons();
          setTimeout(() => {
            icon.setAttribute('data-lucide', 'copy');
            lucide.createIcons();
          }, 1500);
        }
      });
    });
  }


  // --- 2. Password Generator Logic ---
  const pwOutput = document.getElementById('pw-output');
  const btnRegeneratePw = document.getElementById('btn-regenerate-pw');
  const btnCopyPw = document.getElementById('btn-copy-pw');
  const pwStrengthLabel = document.getElementById('pw-strength-label');
  const pwStrengthBarFill = document.getElementById('pw-strength-bar-fill');
  const pwLengthSlider = document.getElementById('pw-length');
  const pwLengthVal = document.getElementById('pw-length-val');

  const pwIncludeUpper = document.getElementById('pw-include-upper');
  const pwIncludeLower = document.getElementById('pw-include-lower');
  const pwIncludeNums = document.getElementById('pw-include-nums');
  const pwIncludeSymbols = document.getElementById('pw-include-symbols');
  const pwExcludeSimilar = document.getElementById('pw-exclude-similar');

  function generatePassword() {
    if (!pwOutput) return;

    const length = parseInt(pwLengthSlider.value, 10);
    const hasUpper = pwIncludeUpper.checked;
    const hasLower = pwIncludeLower.checked;
    const hasNums = pwIncludeNums.checked;
    const hasSymbols = pwIncludeSymbols.checked;
    const excludeSimilar = pwExcludeSimilar.checked;

    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const numChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+~|}{[]:;?><,./-=';

    let charPool = '';
    if (hasUpper) charPool += upperChars;
    if (hasLower) charPool += lowerChars;
    if (hasNums) charPool += numChars;
    if (hasSymbols) charPool += symbolChars;

    if (excludeSimilar) {
      charPool = charPool.replace(/[il1Lo0OI|`~]/g, '');
    }

    if (!charPool) {
      pwOutput.value = '';
      pwStrengthLabel.textContent = 'None';
      pwStrengthLabel.className = '';
      pwStrengthBarFill.style.width = '0%';
      pwStrengthBarFill.className = 'strength-bar-fill';
      return;
    }

    let password = '';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += charPool[array[i] % charPool.length];
    }

    pwOutput.value = password;
    evaluatePasswordStrength(password, length, hasUpper, hasLower, hasNums, hasSymbols);
  }

  function evaluatePasswordStrength(password, length, hasUpper, hasLower, hasNums, hasSymbols) {
    let score = 0;
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    if (length >= 16) score += 1;

    let diversityCount = 0;
    if (hasUpper) diversityCount++;
    if (hasLower) diversityCount++;
    if (hasNums) diversityCount++;
    if (hasSymbols) diversityCount++;
    score += (diversityCount - 1);

    if (score < 2) {
      pwStrengthLabel.textContent = 'Weak';
      pwStrengthLabel.className = 'strength-weak';
      pwStrengthBarFill.style.width = '25%';
      pwStrengthBarFill.className = 'strength-bar-fill strength-weak';
    } else if (score < 4) {
      pwStrengthLabel.textContent = 'Medium';
      pwStrengthLabel.className = 'strength-medium';
      pwStrengthBarFill.style.width = '50%';
      pwStrengthBarFill.className = 'strength-bar-fill strength-medium';
    } else if (score < 6) {
      pwStrengthLabel.textContent = 'Strong';
      pwStrengthLabel.className = 'strength-strong';
      pwStrengthBarFill.style.width = '75%';
      pwStrengthBarFill.className = 'strength-bar-fill strength-strong';
    } else {
      pwStrengthLabel.textContent = 'Secure';
      pwStrengthLabel.className = 'strength-secure';
      pwStrengthBarFill.style.width = '100%';
      pwStrengthBarFill.className = 'strength-bar-fill strength-secure';
    }
  }

  if (pwLengthSlider && pwLengthVal) {
    pwLengthSlider.addEventListener('input', () => {
      pwLengthVal.textContent = pwLengthSlider.value;
      generatePassword();
    });
  }

  [pwIncludeUpper, pwIncludeLower, pwIncludeNums, pwIncludeSymbols, pwExcludeSimilar].forEach(box => {
    if (box) box.addEventListener('change', generatePassword);
  });

  if (btnRegeneratePw) {
    btnRegeneratePw.addEventListener('click', generatePassword);
  }

  if (btnCopyPw) {
    btnCopyPw.addEventListener('click', () => {
      const pw = pwOutput.value;
      if (!pw) return;
      
      navigator.clipboard.writeText(pw).then(() => {
        const originalText = btnCopyPw.innerHTML;
        btnCopyPw.innerHTML = '<i data-lucide="check"></i><span>Copied!</span>';
        btnCopyPw.style.background = 'var(--accent-green)';
        lucide.createIcons();
        
        setTimeout(() => {
          btnCopyPw.innerHTML = originalText;
          btnCopyPw.style.background = '';
          lucide.createIcons();
        }, 1500);
      });
    });
  }

  const pwGenBtn = document.querySelector('[data-app="password-gen"]');
  if (pwGenBtn) {
    pwGenBtn.addEventListener('click', () => {
      setTimeout(generatePassword, 250);
    });
  }
  const sidePwGenBtn = document.querySelector('.standalone-app-card[data-app="password-gen"]');
  if (sidePwGenBtn) {
    sidePwGenBtn.addEventListener('click', () => {
      setTimeout(generatePassword, 250);
    });
  }


  // --- 3. Image Optimizer Logic ---
  const imgDropzone = document.getElementById('img-dropzone');
  const imgFileInput = document.getElementById('img-file-input');
  const imgSettingsSection = document.getElementById('img-settings-section');
  const imgWidthInput = document.getElementById('img-width');
  const imgHeightInput = document.getElementById('img-height');
  const imgLockAspect = document.getElementById('img-lock-aspect');
  const imgFormatSelect = document.getElementById('img-format');
  const imgQualitySlider = document.getElementById('img-quality');
  const imgQualityVal = document.getElementById('img-quality-val');
  const btnOptimizeImg = document.getElementById('btn-optimize-img');
  const imgPreviewHolder = document.getElementById('img-preview-holder');

  const imgMetaInfo = document.getElementById('img-meta-info');
  const imgOrigSize = document.getElementById('img-orig-size');
  const imgNewSize = document.getElementById('img-new-size');
  const imgReductionPct = document.getElementById('img-reduction-pct');
  const btnDownloadImg = document.getElementById('btn-download-img');

  const btnCropMode = document.getElementById('btn-crop-mode');
  const btnCropApply = document.getElementById('btn-crop-apply');
  const btnCropCancel = document.getElementById('btn-crop-cancel');
  const cropAspectRatios = document.getElementById('crop-aspect-ratios');
  const btnResetImg = document.getElementById('btn-reset-img');

  let loadedImage = null;
  let originalWidth = 0;
  let originalHeight = 0;
  let originalSize = 0;
  let originalFileName = 'image';
  let optimizedBlob = null;

  let cropperInstance = null;
  let backupImageSrc = null;
  let backupWidth = 0;
  let backupHeight = 0;
  let backupSize = 0;

  if (imgDropzone && imgFileInput) {
    imgDropzone.addEventListener('click', () => imgFileInput.click());

    imgDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      imgDropzone.classList.add('dragover');
    });

    imgDropzone.addEventListener('dragleave', () => {
      imgDropzone.classList.remove('dragover');
    });

    imgDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      imgDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        imgFileInput.files = e.dataTransfer.files;
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    imgFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleImageFile(e.target.files[0]);
      }
    });
  }

  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showModalAlert('Please select a valid image file.', 'Invalid Format', 'warning');
      return;
    }

    // Clean up any active cropper
    cancelCrop();

    originalSize = file.size;
    originalFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    imgOrigSize.textContent = formatBytes(originalSize);

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        loadedImage = img;
        originalWidth = img.width;
        originalHeight = img.height;

        // Set backup variables for reset capability
        backupImageSrc = e.target.result;
        backupWidth = img.width;
        backupHeight = img.height;
        backupSize = file.size;

        imgWidthInput.value = img.width;
        imgHeightInput.value = img.height;

        imgPreviewHolder.innerHTML = '';
        const previewImg = document.createElement('img');
        previewImg.src = e.target.result;
        imgPreviewHolder.appendChild(previewImg);

        imgSettingsSection.classList.remove('hidden');
        imgMetaInfo.classList.add('hidden');
        btnDownloadImg.classList.add('hidden');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Cancel Crop function
  function cancelCrop() {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    if (btnCropMode) btnCropMode.classList.remove('hidden');
    if (btnCropApply) btnCropApply.classList.add('hidden');
    if (btnCropCancel) btnCropCancel.classList.add('hidden');
    if (cropAspectRatios) cropAspectRatios.classList.add('hidden');
    
    // Re-render the image preview static element if we have loadedImage
    if (loadedImage && imgPreviewHolder) {
      imgPreviewHolder.innerHTML = '';
      const previewImg = document.createElement('img');
      previewImg.src = loadedImage.src;
      imgPreviewHolder.appendChild(previewImg);
    }
  }

  // Crop Mode Button click
  if (btnCropMode) {
    btnCropMode.addEventListener('click', () => {
      const previewImg = imgPreviewHolder.querySelector('img');
      if (!previewImg) return;

      btnCropMode.classList.add('hidden');
      btnCropApply.classList.remove('hidden');
      btnCropCancel.classList.remove('hidden');
      cropAspectRatios.classList.remove('hidden');

      if (cropperInstance) {
        cropperInstance.destroy();
      }

      cropperInstance = new Cropper(previewImg, {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready() {
          const activeRatioBtn = cropAspectRatios.querySelector('.btn-ratio.active');
          if (activeRatioBtn) {
            const ratio = parseFloat(activeRatioBtn.getAttribute('data-ratio'));
            cropperInstance.setAspectRatio(isNaN(ratio) ? NaN : ratio);
          }
        }
      });
    });
  }

  // Handle aspect ratio presets clicks
  if (cropAspectRatios) {
    const ratioButtons = cropAspectRatios.querySelectorAll('.btn-ratio');
    ratioButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        ratioButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const ratio = parseFloat(btn.getAttribute('data-ratio'));
        if (cropperInstance) {
          cropperInstance.setAspectRatio(isNaN(ratio) ? NaN : ratio);
        }
      });
    });
  }

  // Apply Crop
  if (btnCropApply) {
    btnCropApply.addEventListener('click', () => {
      if (!cropperInstance) return;

      const croppedCanvas = cropperInstance.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });

      if (!croppedCanvas) {
        showModalAlert('Failed to crop the image.', 'Crop Error', 'error');
        cancelCrop();
        return;
      }

      const format = imgFormatSelect.value || 'image/jpeg';
      const croppedDataUrl = croppedCanvas.toDataURL(format);

      const img = new Image();
      img.onload = function() {
        loadedImage = img;
        originalWidth = img.width;
        originalHeight = img.height;

        imgWidthInput.value = img.width;
        imgHeightInput.value = img.height;

        imgPreviewHolder.innerHTML = '';
        const previewImg = document.createElement('img');
        previewImg.src = croppedDataUrl;
        imgPreviewHolder.appendChild(previewImg);

        cropperInstance.destroy();
        cropperInstance = null;
        
        btnCropMode.classList.remove('hidden');
        btnCropApply.classList.add('hidden');
        btnCropCancel.classList.add('hidden');
        cropAspectRatios.classList.add('hidden');
        
        // Hide previous optimized result details as we have a new cropped image
        imgMetaInfo.classList.add('hidden');
        btnDownloadImg.classList.add('hidden');
      };
      img.src = croppedDataUrl;
    });
  }

  if (btnCropCancel) {
    btnCropCancel.addEventListener('click', cancelCrop);
  }

  // Reset image back to original state
  if (btnResetImg) {
    btnResetImg.addEventListener('click', () => {
      if (!backupImageSrc) return;

      if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
      }

      originalSize = backupSize;
      originalWidth = backupWidth;
      originalHeight = backupHeight;

      imgWidthInput.value = backupWidth;
      imgHeightInput.value = backupHeight;
      imgOrigSize.textContent = formatBytes(originalSize);

      const img = new Image();
      img.onload = function() {
        loadedImage = img;
        imgPreviewHolder.innerHTML = '';
        const previewImg = document.createElement('img');
        previewImg.src = backupImageSrc;
        imgPreviewHolder.appendChild(previewImg);

        btnCropMode.classList.remove('hidden');
        btnCropApply.classList.add('hidden');
        btnCropCancel.classList.add('hidden');
        cropAspectRatios.classList.add('hidden');
        imgMetaInfo.classList.add('hidden');
        btnDownloadImg.classList.add('hidden');
      };
      img.src = backupImageSrc;
    });
  }

  if (imgWidthInput && imgHeightInput) {
    imgWidthInput.addEventListener('input', () => {
      if (imgLockAspect.checked && loadedImage && originalWidth > 0) {
        const ratio = originalHeight / originalWidth;
        imgHeightInput.value = Math.round(parseFloat(imgWidthInput.value) * ratio) || '';
      }
    });

    imgHeightInput.addEventListener('input', () => {
      if (imgLockAspect.checked && loadedImage && originalHeight > 0) {
        const ratio = originalWidth / originalHeight;
        imgWidthInput.value = Math.round(parseFloat(imgHeightInput.value) * ratio) || '';
      }
    });
  }

  if (imgFormatSelect) {
    imgFormatSelect.addEventListener('change', () => {
      const format = imgFormatSelect.value;
      const qualityRow = document.getElementById('img-quality-row');
      if (qualityRow) {
        if (format === 'image/png') {
          qualityRow.style.display = 'none';
        } else {
          qualityRow.style.display = 'block';
        }
      }
    });
  }

  if (imgQualitySlider && imgQualityVal) {
    imgQualitySlider.addEventListener('input', () => {
      imgQualityVal.textContent = `${imgQualitySlider.value}%`;
    });
  }

  if (btnOptimizeImg) {
    btnOptimizeImg.addEventListener('click', () => {
      if (!loadedImage) return;

      const targetWidth = parseInt(imgWidthInput.value, 10) || originalWidth;
      const targetHeight = parseInt(imgHeightInput.value, 10) || originalHeight;
      const format = imgFormatSelect.value;
      const quality = parseFloat(imgQualitySlider.value) / 100;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(loadedImage, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(function(blob) {
        if (!blob) {
          showModalAlert('Failed to optimize image.', 'Optimization Error', 'error');
          return;
        }

        optimizedBlob = blob;

        imgPreviewHolder.innerHTML = '';
        const optImg = document.createElement('img');
        const optUrl = URL.createObjectURL(blob);
        optImg.src = optUrl;
        imgPreviewHolder.appendChild(optImg);

        imgNewSize.textContent = formatBytes(blob.size);
        
        const savings = originalSize - blob.size;
        const savingsPct = Math.max(0, Math.round((savings / originalSize) * 100));
        imgReductionPct.textContent = savingsPct > 0 ? `-${savingsPct}%` : '0%';
        if (blob.size > originalSize) {
          imgReductionPct.textContent = `+${Math.abs(savingsPct)}% (Larger)`;
          imgReductionPct.style.color = '#ef4444';
        } else {
          imgReductionPct.style.color = 'var(--accent-green)';
        }

        imgMetaInfo.classList.remove('hidden');
        btnDownloadImg.classList.remove('hidden');
      }, format, format === 'image/png' ? undefined : quality);
    });
  }

  if (btnDownloadImg) {
    btnDownloadImg.addEventListener('click', () => {
      if (!optimizedBlob) return;
      
      const format = imgFormatSelect.value;
      let ext = 'jpg';
      if (format === 'image/png') ext = 'png';
      else if (format === 'image/webp') ext = 'webp';

      const link = document.createElement('a');
      link.download = `${originalFileName}_optimized.${ext}`;
      link.href = URL.createObjectURL(optimizedBlob);
      link.click();
    });
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // ─── Object Remover Javascript Logic ───
  const objectDropzone = document.getElementById('object-dropzone');
  const objectFileInput = document.getElementById('object-file-input');
  const objectWorkspace = document.getElementById('object-workspace');
  const objectControlsEmpty = document.getElementById('object-controls-empty');
  const objectControls = document.getElementById('object-controls');
  const objectCanvasWrapper = document.getElementById('object-canvas-wrapper');
  const objectImgCanvas = document.getElementById('object-img-canvas');
  const objectMaskCanvas = document.getElementById('object-mask-canvas');
  const brushCursor = document.getElementById('brush-cursor');
  
  const btnBrushDraw = document.getElementById('btn-brush-draw');
  const btnBrushErase = document.getElementById('btn-brush-erase');
  const brushSizeSlider = document.getElementById('brush-size-slider');
  const brushSizeVal = document.getElementById('brush-size-val');
  const btnBrushUndo = document.getElementById('btn-brush-undo');
  const btnBrushClear = document.getElementById('btn-brush-clear');
  
  const btnProcessRemove = document.getElementById('btn-process-remove');
  const objectLoader = document.getElementById('object-loader');
  const objectLoaderText = document.getElementById('object-loader-text');
  const objectProgressContainer = document.getElementById('object-progress-container');
  const objectProgressFill = document.getElementById('object-progress-fill');
  
  const objectResultActions = document.getElementById('object-result-actions');
  const btnToggleCompare = document.getElementById('btn-toggle-compare');
  const btnDownloadRemoved = document.getElementById('btn-download-removed');

  let objectImage = null;
  let objectImgCtx = null;
  let objectMaskCtx = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let brushSize = 25;
  let brushMode = 'draw';
  let undoStack = [];
  const maxUndo = 10;
  
  let modelSession = null;
  let inpaintedCanvas = null;
  let isComparing = false;

  // Quantized INT8 LaMa model
  const LAMA_MODEL_URL = 'https://huggingface.co/linkus2026/lama-int8-mobile/resolve/main/lama_int8.onnx';

  function saveUndoState() {
    if (!objectMaskCanvas) return;
    if (undoStack.length >= maxUndo) {
      undoStack.shift();
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = objectMaskCanvas.width;
    tempCanvas.height = objectMaskCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(objectMaskCanvas, 0, 0);
    undoStack.push(tempCanvas);
  }

  function undo() {
    if (!objectMaskCanvas || !objectMaskCtx) return;
    if (undoStack.length > 1) {
      undoStack.pop(); // Remove current state
      const prevState = undoStack[undoStack.length - 1];
      objectMaskCtx.clearRect(0, 0, objectMaskCanvas.width, objectMaskCanvas.height);
      objectMaskCtx.drawImage(prevState, 0, 0);
    } else if (undoStack.length === 1) {
      objectMaskCtx.clearRect(0, 0, objectMaskCanvas.width, objectMaskCanvas.height);
    }
  }

  function loadEditorImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      objectImage = new Image();
      objectImage.onload = () => {
        const maxW = 750;
        const maxH = 450;
        let w = objectImage.width;
        let h = objectImage.height;
        
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        
        if (objectCanvasWrapper) {
          objectCanvasWrapper.style.width = `${w}px`;
          objectCanvasWrapper.style.height = `${h}px`;
        }
        
        if (objectImgCanvas && objectMaskCanvas) {
          objectImgCanvas.width = w;
          objectImgCanvas.height = h;
          objectMaskCanvas.width = w;
          objectMaskCanvas.height = h;
          
          objectImgCtx = objectImgCanvas.getContext('2d');
          objectMaskCtx = objectMaskCanvas.getContext('2d');
          
          objectImgCtx.clearRect(0, 0, w, h);
          objectImgCtx.drawImage(objectImage, 0, 0, w, h);
          objectMaskCtx.clearRect(0, 0, w, h);
        }
        
        undoStack = [];
        saveUndoState();
        
        if (objectDropzone) objectDropzone.classList.add('hidden');
        if (objectWorkspace) objectWorkspace.classList.remove('hidden');
        if (objectControlsEmpty) objectControlsEmpty.classList.add('hidden');
        if (objectControls) objectControls.classList.remove('hidden');
        if (objectResultActions) objectResultActions.classList.add('hidden');
        
        inpaintedCanvas = null;
        isComparing = false;
        if (btnToggleCompare) btnToggleCompare.textContent = 'Show Original';
      };
      objectImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDrawing(e) {
    if (!objectMaskCanvas || !objectMaskCtx) return;
    e.preventDefault();
    isDrawing = true;
    saveUndoState();
    const pos = getMousePos(objectMaskCanvas, e);
    lastX = pos.x;
    lastY = pos.y;
    draw(e);
  }

  function draw(e) {
    if (!isDrawing || !objectMaskCanvas || !objectMaskCtx) return;
    e.preventDefault();
    const pos = getMousePos(objectMaskCanvas, e);
    
    objectMaskCtx.beginPath();
    objectMaskCtx.moveTo(lastX, lastY);
    objectMaskCtx.lineTo(pos.x, pos.y);
    
    objectMaskCtx.lineWidth = brushSize;
    objectMaskCtx.lineCap = 'round';
    objectMaskCtx.lineJoin = 'round';
    
    if (brushMode === 'draw') {
      objectMaskCtx.globalCompositeOperation = 'source-over';
      objectMaskCtx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    } else {
      objectMaskCtx.globalCompositeOperation = 'destination-out';
      objectMaskCtx.strokeStyle = 'rgba(0,0,0,1)';
    }
    
    objectMaskCtx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDrawing() {
    isDrawing = false;
  }

  function updateBrushCursor(e) {
    if (!objectMaskCanvas || !brushCursor) return;
    const rect = objectMaskCanvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      brushCursor.style.left = `${clientX - rect.left}px`;
      brushCursor.style.top = `${clientY - rect.top}px`;
      brushCursor.style.width = `${brushSize * (rect.width / objectMaskCanvas.width)}px`;
      brushCursor.style.height = `${brushSize * (rect.height / objectMaskCanvas.height)}px`;
      brushCursor.style.display = 'block';
    } else {
      brushCursor.style.display = 'none';
    }
  }

  // Bind Drawing Events
  if (objectMaskCanvas) {
    objectMaskCanvas.addEventListener('mousedown', startDrawing);
    objectMaskCanvas.addEventListener('mousemove', (e) => {
      draw(e);
      updateBrushCursor(e);
    });
    objectMaskCanvas.addEventListener('mouseup', stopDrawing);
    objectMaskCanvas.addEventListener('mouseleave', () => {
      stopDrawing();
      if (brushCursor) brushCursor.style.display = 'none';
    });
    objectMaskCanvas.addEventListener('mouseenter', (e) => {
      updateBrushCursor(e);
    });
    
    // Touch support
    objectMaskCanvas.addEventListener('touchstart', startDrawing);
    objectMaskCanvas.addEventListener('touchmove', (e) => {
      draw(e);
      updateBrushCursor(e);
    });
    objectMaskCanvas.addEventListener('touchend', stopDrawing);
  }

  // Toolbar mode buttons
  if (btnBrushDraw) {
    btnBrushDraw.addEventListener('click', () => {
      brushMode = 'draw';
      btnBrushDraw.classList.add('active');
      if (btnBrushErase) btnBrushErase.classList.remove('active');
    });
  }

  if (btnBrushErase) {
    btnBrushErase.addEventListener('click', () => {
      brushMode = 'erase';
      btnBrushErase.classList.add('active');
      if (btnBrushDraw) btnBrushDraw.classList.remove('active');
    });
  }

  if (brushSizeSlider && brushSizeVal) {
    brushSizeSlider.addEventListener('input', () => {
      brushSize = parseInt(brushSizeSlider.value, 10);
      brushSizeVal.textContent = `${brushSize}px`;
    });
  }

  if (btnBrushUndo) {
    btnBrushUndo.addEventListener('click', undo);
  }

  if (btnBrushClear) {
    btnBrushClear.addEventListener('click', () => {
      if (objectMaskCtx && objectMaskCanvas) {
        saveUndoState();
        objectMaskCtx.clearRect(0, 0, objectMaskCanvas.width, objectMaskCanvas.height);
      }
    });
  }

  // Drag-and-drop
  if (objectDropzone && objectFileInput) {
    objectDropzone.addEventListener('click', () => objectFileInput.click());
    objectDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      objectDropzone.classList.add('dragover');
    });
    objectDropzone.addEventListener('dragleave', () => {
      objectDropzone.classList.remove('dragover');
    });
    objectDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      objectDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        loadEditorImage(e.dataTransfer.files[0]);
      }
    });
    objectFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        loadEditorImage(e.target.files[0]);
      }
    });
  }

  // Caching and downloader function
  async function getOrDownloadModel(onProgress) {
    const cache = await caches.open('onnx-model-cache');
    let response = await cache.match(LAMA_MODEL_URL);
    
    if (!response) {
      console.log('Model not cached. Fetching with progress...');
      const res = await fetch(LAMA_MODEL_URL);
      if (!res.ok) throw new Error('Failed to fetch ONNX model');
      
      const reader = res.body.getReader();
      const contentLength = +res.headers.get('content-length') || 52000000;
      let receivedLength = 0;
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        if (onProgress) {
          onProgress(Math.min(0.99, receivedLength / contentLength));
        }
      }
      
      const blob = new Blob(chunks);
      response = new Response(blob, {
        headers: { 'content-type': 'application/octet-stream' }
      });
      await cache.put(LAMA_MODEL_URL, response.clone());
    }
    
    if (onProgress) onProgress(1.0);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // Process / Inpaint
  if (btnProcessRemove) {
    btnProcessRemove.addEventListener('click', async () => {
      if (!objectImage || !objectMaskCanvas) return;
      
      // Ensure there is some mask drawn
      const maskPixels = objectMaskCtx.getImageData(0, 0, objectMaskCanvas.width, objectMaskCanvas.height).data;
      let hasMask = false;
      for (let i = 3; i < maskPixels.length; i += 4) {
        if (maskPixels[i] > 10) {
          hasMask = true;
          break;
        }
      }
      
      if (!hasMask) {
        showModalAlert('Please brush over the objects you want to remove first.', 'No Mask Selected', 'warning');
        return;
      }
      
      // Show loader
      if (objectLoader) {
        objectLoader.classList.remove('hidden');
        objectLoaderText.textContent = 'Loading AI engine...';
      }
      if (objectProgressContainer) objectProgressContainer.classList.remove('hidden');
      if (objectProgressFill) objectProgressFill.style.width = '0%';
      if (btnProcessRemove) btnProcessRemove.disabled = true;
      
      try {
        // Set up WebAssembly paths
        if (typeof ort !== 'undefined') {
          ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.0/dist/";
        } else {
          throw new Error('ONNX Runtime library not loaded.');
        }
        
        // Load model
        const modelObjectUrl = await getOrDownloadModel((pct) => {
          const pctText = Math.round(pct * 100);
          if (objectLoaderText) objectLoaderText.textContent = `Downloading AI Model: ${pctText}%`;
          if (objectProgressFill) objectProgressFill.style.width = `${pctText}%`;
        });
        
        // Initialize inference session
        if (!modelSession) {
          if (objectLoaderText) objectLoaderText.textContent = 'Starting AI engine (WebGPU)...';
          if (objectProgressContainer) objectProgressContainer.classList.add('hidden');
          
          try {
            modelSession = await ort.InferenceSession.create(modelObjectUrl, {
              executionProviders: ['webgpu']
            });
            console.log('LaMa initialized with WebGPU.');
          } catch (webgpuError) {
            console.warn('WebGPU fallback to WASM:', webgpuError);
            try {
              modelSession = await ort.InferenceSession.create(modelObjectUrl, {
                executionProviders: ['wasm']
              });
              console.log('LaMa initialized with WASM.');
            } catch (wasmError) {
              throw new Error('Failed to initialize AI model: ' + wasmError.message);
            }
          }
        }
        
        if (objectLoaderText) objectLoaderText.textContent = 'Erase process running (AI Inpainting)...';
        if (objectProgressContainer) objectProgressContainer.classList.add('hidden');
        
        // Prep inputs: image and mask resized to 512x512
        const tempImgCanvas = document.createElement('canvas');
        tempImgCanvas.width = 512;
        tempImgCanvas.height = 512;
        const tempImgCtx = tempImgCanvas.getContext('2d');
        tempImgCtx.drawImage(objectImage, 0, 0, 512, 512);
        const imgData512 = tempImgCtx.getImageData(0, 0, 512, 512);
        
        const tempMaskCanvas = document.createElement('canvas');
        tempMaskCanvas.width = 512;
        tempMaskCanvas.height = 512;
        const tempMaskCtx = tempMaskCanvas.getContext('2d');
        tempMaskCtx.drawImage(objectMaskCanvas, 0, 0, 512, 512);
        const maskData512 = tempMaskCtx.getImageData(0, 0, 512, 512);
        
        // Preprocess tensors: NCHW RGB [1, 3, 512, 512] and [1, 1, 512, 512]
        const imageFloat = new Float32Array(512 * 512 * 3);
        const maskFloat = new Float32Array(512 * 512);
        
        const imgPixels = imgData512.data;
        const maskPixels = maskData512.data;
        const size = 512 * 512;
        
        for (let i = 0; i < size; i++) {
          imageFloat[i] = imgPixels[i * 4] / 255.0;        // R
          imageFloat[size + i] = imgPixels[i * 4 + 1] / 255.0; // G
          imageFloat[size * 2 + i] = imgPixels[i * 4 + 2] / 255.0; // B
          
          maskFloat[i] = maskPixels[i * 4 + 3] > 10 ? 1.0 : 0.0;
        }
        
        const imageTensor = new ort.Tensor('float32', imageFloat, [1, 3, 512, 512]);
        const maskTensor = new ort.Tensor('float32', maskFloat, [1, 1, 512, 512]);
        
        const inputNames = modelSession.inputNames;
        const imgInputName = inputNames.find(name => name.includes('image') || name.includes('input') && !name.includes('mask')) || inputNames[0];
        const maskInputName = inputNames.find(name => name.includes('mask')) || inputNames[1];
        
        const feeds = {};
        feeds[imgInputName] = imageTensor;
        feeds[maskInputName] = maskTensor;
        
        // Run AI model
        const results = await modelSession.run(feeds);
        const outputTensor = results[modelSession.outputNames[0]];
        const outFloat = outputTensor.data;
        
        // Convert output to 512x512 canvas
        const outCanvas512 = document.createElement('canvas');
        outCanvas512.width = 512;
        outCanvas512.height = 512;
        const outCtx512 = outCanvas512.getContext('2d');
        const outImgData512 = outCtx512.createImageData(512, 512);
        
        for (let i = 0; i < size; i++) {
          let r = outFloat[i];
          let g = outFloat[size + i];
          let b = outFloat[size * 2 + i];
          
          if (Math.max(r, g, b) <= 1.01) {
            r *= 255.0;
            g *= 255.0;
            b *= 255.0;
          }
          
          outImgData512.data[i * 4] = Math.min(255, Math.max(0, Math.round(r)));
          outImgData512.data[i * 4 + 1] = Math.min(255, Math.max(0, Math.round(g)));
          outImgData512.data[i * 4 + 2] = Math.min(255, Math.max(0, Math.round(b)));
          outImgData512.data[i * 4 + 3] = 255;
        }
        outCtx512.putImageData(outImgData512, 0, 0);
        
        // High-res blended composite reconstruction
        const origW = objectImage.width;
        const origH = objectImage.height;
        
        const origMaskCanvas = document.createElement('canvas');
        origMaskCanvas.width = origW;
        origMaskCanvas.height = origH;
        const origMaskCtx = origMaskCanvas.getContext('2d');
        origMaskCtx.drawImage(objectMaskCanvas, 0, 0, origW, origH);
        
        const origInpaintCanvas = document.createElement('canvas');
        origInpaintCanvas.width = origW;
        origInpaintCanvas.height = origH;
        const origInpaintCtx = origInpaintCanvas.getContext('2d');
        origInpaintCtx.drawImage(outCanvas512, 0, 0, origW, origH);
        
        inpaintedCanvas = document.createElement('canvas');
        inpaintedCanvas.width = origW;
        inpaintedCanvas.height = origH;
        const blendCtx = inpaintedCanvas.getContext('2d');
        blendCtx.drawImage(objectImage, 0, 0);
        
        const maskFeatherCanvas = document.createElement('canvas');
        maskFeatherCanvas.width = origW;
        maskFeatherCanvas.height = origH;
        const maskFeatherCtx = maskFeatherCanvas.getContext('2d');
        
        maskFeatherCtx.filter = 'blur(4px)';
        maskFeatherCtx.drawImage(origMaskCanvas, 0, 0);
        maskFeatherCtx.filter = 'none';
        
        maskFeatherCtx.globalCompositeOperation = 'source-in';
        maskFeatherCtx.drawImage(origInpaintCanvas, 0, 0);
        
        blendCtx.drawImage(maskFeatherCanvas, 0, 0);
        
        // Draw output back to visible workspace
        objectImgCtx.clearRect(0, 0, objectImgCanvas.width, objectImgCanvas.height);
        objectImgCtx.drawImage(inpaintedCanvas, 0, 0, objectImgCanvas.width, objectImgCanvas.height);
        objectMaskCtx.clearRect(0, 0, objectMaskCanvas.width, objectMaskCanvas.height);
        
        // Show result options
        if (objectLoader) objectLoader.classList.add('hidden');
        if (objectResultActions) objectResultActions.classList.remove('hidden');
        isComparing = false;
        if (btnToggleCompare) btnToggleCompare.textContent = 'Show Original';
        
      } catch (err) {
        console.error('Inpainting error:', err);
        showModalAlert('An error occurred during AI inpainting: ' + err.message, 'Process Failed', 'error');
        if (objectLoader) objectLoader.classList.add('hidden');
      } finally {
        if (btnProcessRemove) btnProcessRemove.disabled = false;
      }
    });
  }

  // Toggle Compare
  if (btnToggleCompare) {
    btnToggleCompare.addEventListener('click', () => {
      if (!inpaintedCanvas || !objectImage || !objectImgCtx) return;
      
      if (!isComparing) {
        // Show original image
        objectImgCtx.clearRect(0, 0, objectImgCanvas.width, objectImgCanvas.height);
        objectImgCtx.drawImage(objectImage, 0, 0, objectImgCanvas.width, objectImgCanvas.height);
        btnToggleCompare.textContent = 'Show Cleaned';
        isComparing = true;
      } else {
        // Show cleaned image
        objectImgCtx.clearRect(0, 0, objectImgCanvas.width, objectImgCanvas.height);
        objectImgCtx.drawImage(inpaintedCanvas, 0, 0, objectImgCanvas.width, objectImgCanvas.height);
        btnToggleCompare.textContent = 'Show Original';
        isComparing = false;
      }
    });
  }

  // Download Output Image
  if (btnDownloadRemoved) {
    btnDownloadRemoved.addEventListener('click', () => {
      if (!inpaintedCanvas) return;
      const link = document.createElement('a');
      link.download = 'cleaned_image.png';
      link.href = inpaintedCanvas.toDataURL('image/png');
      link.click();
    });
  }

  // ==========================================================================
  // MY PROFILE PAGE LOGIC
  // ==========================================================================

  let profileCropper = null;
  let profileAvatarDataUrl = null;
  let profileData = null;

  // Password strength helper (standalone, used in profile page)
  function calcPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  function applyStrengthToBar(pw, fillEl, labelEl) {
    if (!fillEl || !labelEl) return;
    const score = calcPasswordStrength(pw);
    const widths = ['0%', '20%', '40%', '65%', '85%', '100%'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4'];
    const labels = ['', 'Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    fillEl.style.width = pw.length > 0 ? widths[score] : '0%';
    fillEl.style.background = colors[score];
    labelEl.textContent = pw.length > 0 ? labels[score] : '';
    labelEl.style.color = colors[score];
  }

  // Wire password toggle buttons on the profile page
  function wireProfilePwToggles() {
    document.querySelectorAll('.auth-pw-toggle[data-target]').forEach(btn => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input || btn._wired) return;
      btn._wired = true;
      btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
        lucide.createIcons();
      });
    });
  }

  function initAccountPage() {
    const profileLoggedIn = document.getElementById('account-logged-in');
    const profileGuestPrompt = document.getElementById('account-auth-container');
    const isLoggedIn = !!guestUser;
    const isOwner = localStorage.getItem('nexus_mode') === 'owner';

    if (!profileLoggedIn || !profileGuestPrompt) return;

    if (!isLoggedIn && !isOwner) {
      profileLoggedIn.style.display = 'none';
      profileGuestPrompt.style.display = 'block';
      return;
    }

    profileLoggedIn.style.display = 'block';
    profileGuestPrompt.style.display = 'none';

    // Populate hero
    const heroInitials = document.getElementById('profile-hero-initials');
    const heroImg = document.getElementById('profile-hero-img');
    const heroDisplayName = document.getElementById('profile-hero-display-name');
    const heroUsername = document.getElementById('profile-hero-username');
    const heroJoined = document.getElementById('profile-hero-joined');

    const displayUsername = isOwner ? 'Borno (Admin)' : (guestUser || 'User');
    if (heroUsername) heroUsername.textContent = '@' + displayUsername.toLowerCase().replace(/\s/g, '');
    if (heroInitials) heroInitials.textContent = displayUsername.substring(0, 2).toUpperCase();

    // Load profile data from server
    if (!isOwner && guestUser) {
      fetch('/api/auth/profile', { headers: { 'x-user-name': guestUser } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          profileData = data;
          const dn = data.display_name || data.username || guestUser;
          if (heroDisplayName) heroDisplayName.textContent = dn;
          if (heroInitials) heroInitials.textContent = dn.substring(0, 2).toUpperCase();
          
          // Show avatar if stored
          if (data.avatar_data && heroImg) {
            heroImg.src = data.avatar_data;
            heroImg.classList.remove('hidden');
            if (heroInitials) heroInitials.style.display = 'none';
            // Also set sidebar avatar
            updateSidebarAvatar(data.avatar_data);
          }

          if (heroJoined && data.created_at) {
            const d = new Date(data.created_at);
            heroJoined.textContent = 'Member since ' + d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          }

          // Stats
          const statJoined = document.getElementById('profile-stat-joined');
          if (statJoined && data.created_at) {
            statJoined.textContent = new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }

          const statAccess = document.getElementById('profile-stat-access');
          if (statAccess) {
            const access = data.brian_access || 'none';
            const labels = { approved: 'Approved', pending: 'Pending', rejected: 'Denied', none: 'Guest' };
            statAccess.textContent = labels[access] || 'Guest';
          }

          // Info card
          const infoUsername = document.getElementById('profile-info-username');
          const infoDN = document.getElementById('profile-info-displayname');
          const infoBio = document.getElementById('profile-info-bio');
          const infoAccess = document.getElementById('profile-info-access');
          if (infoUsername) infoUsername.textContent = data.username || guestUser;
          if (infoDN) infoDN.textContent = data.display_name || data.username || '—';
          if (infoBio) infoBio.textContent = data.bio || 'No bio set.';
          if (infoAccess) {
            const accessLabels = { approved: '✓ Bro Mode Active', pending: '⏳ Pending Approval', rejected: '✗ Rejected', none: 'No Access' };
            infoAccess.textContent = accessLabels[data.brian_access || 'none'] || 'No Access';
          }

          // Pre-fill edit form
          const dnInput = document.getElementById('profile-display-name-input');
          const bioInput = document.getElementById('profile-bio-input');
          const bioChars = document.getElementById('profile-bio-chars');
          if (dnInput) dnInput.value = data.display_name || '';
          if (bioInput) {
            bioInput.value = data.bio || '';
            if (bioChars) bioChars.textContent = (data.bio || '').length;
          }

          // Bookmark count
          const statBm = document.getElementById('profile-stat-bookmarks');
          if (statBm && typeof savedLinks !== 'undefined') {
            const privateBm = savedLinks.filter(l => l.is_private && (l.owner_username || '').toLowerCase() === guestUser.toLowerCase());
            statBm.textContent = privateBm.length;
          }

          lucide.createIcons();
        })
        .catch(() => {
          if (heroDisplayName) heroDisplayName.textContent = guestUser || 'User';
        });
    } else if (isOwner) {
      if (heroDisplayName) heroDisplayName.textContent = 'Borno (Admin)';
      if (heroJoined) heroJoined.textContent = 'Node Owner';
      const statAccess = document.getElementById('profile-stat-access');
      if (statAccess) statAccess.textContent = 'Full Admin';
    }

    // Wire password toggles
    wireProfilePwToggles();

    // Password strength meter on profile page
    const newPwInput = document.getElementById('profile-new-pw');
    const strengthFill = document.getElementById('profile-pw-strength-fill');
    const strengthLabel = document.getElementById('profile-pw-strength-label');
    const confirmPwInput = document.getElementById('profile-confirm-pw');
    const matchMsg = document.getElementById('profile-pw-match-msg');

    if (newPwInput) {
      newPwInput.addEventListener('input', () => {
        applyStrengthToBar(newPwInput.value, strengthFill, strengthLabel);
        if (confirmPwInput && confirmPwInput.value.length > 0) {
          const match = newPwInput.value === confirmPwInput.value;
          matchMsg.style.display = 'block';
          matchMsg.textContent = match ? '✓ Passwords match' : '✗ Passwords do not match';
          matchMsg.style.color = match ? '#10b981' : '#ef4444';
        }
      });
    }

    if (confirmPwInput) {
      confirmPwInput.addEventListener('input', () => {
        const match = newPwInput.value === confirmPwInput.value;
        matchMsg.style.display = confirmPwInput.value.length > 0 ? 'block' : 'none';
        matchMsg.textContent = match ? '✓ Passwords match' : '✗ Passwords do not match';
        matchMsg.style.color = match ? '#10b981' : '#ef4444';
      });
    }

    // Bio character counter
    const bioInput = document.getElementById('profile-bio-input');
    const bioCharsEl = document.getElementById('profile-bio-chars');
    if (bioInput && bioCharsEl) {
      bioInput.addEventListener('input', () => {
        bioCharsEl.textContent = bioInput.value.length;
      });
    }
  }

  function updateSidebarAvatar(dataUrl) {
    const avatarTextMode = document.getElementById('avatar-text-mode');
    const avatarRingEl = document.querySelector('.user-avatar');
    if (!avatarRingEl) return;
    // Replace initials with image in sidebar avatar
    let existingImg = avatarRingEl.querySelector('img.sidebar-avatar-img');
    if (!existingImg) {
      existingImg = document.createElement('img');
      existingImg.className = 'sidebar-avatar-img';
      existingImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:50%;';
      avatarRingEl.style.position = 'relative';
      avatarRingEl.appendChild(existingImg);
    }
    existingImg.src = dataUrl;
    if (avatarTextMode) avatarTextMode.style.opacity = '0';
  }

  // Profile tab switching
  function setupProfileTabs() {
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-profile-tab');
        document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.profile-tab-content').forEach(c => {
          c.style.display = 'none';
          c.classList.remove('active');
        });
        const target = document.getElementById('profile-tab-' + tabId);
        if (target) {
          target.style.display = 'block';
          target.classList.add('active');
        }
        lucide.createIcons();
      });
    });
  }

  setupProfileTabs();

  // Profile update form submission
  const profileUpdateForm = document.getElementById('profile-update-form');
  if (profileUpdateForm) {
    profileUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('profile-update-error');
      if (errEl) errEl.style.display = 'none';

      const dnVal = document.getElementById('profile-display-name-input')?.value?.trim() || '';
      const bioVal = document.getElementById('profile-bio-input')?.value?.trim() || '';
      const submitBtn = profileUpdateForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-name': guestUser || '' },
          body: JSON.stringify({ displayName: dnVal, bio: bioVal, avatarData: profileAvatarDataUrl || undefined })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showModalAlert('Your profile has been updated successfully!', 'Profile Updated', 'success');
          // Update displayed info
          const heroDisplayName = document.getElementById('profile-hero-display-name');
          if (heroDisplayName && dnVal) heroDisplayName.textContent = dnVal;
          const infoDisplayName = document.getElementById('profile-info-displayname');
          if (infoDisplayName && dnVal) infoDisplayName.textContent = dnVal;
          const infoBio = document.getElementById('profile-info-bio');
          if (infoBio) infoBio.textContent = bioVal || 'No bio set.';
        } else {
          if (errEl) { errEl.textContent = data.error || 'Failed to update profile.'; errEl.style.display = 'block'; }
        }
      } catch (err) {
        if (errEl) { errEl.textContent = 'Network error. Please try again.'; errEl.style.display = 'block'; }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Change password form submission
  const profileChangePwForm = document.getElementById('profile-change-password-form');
  if (profileChangePwForm) {
    profileChangePwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('profile-pw-error');
      if (errEl) errEl.style.display = 'none';

      const currentPw = document.getElementById('profile-current-pw')?.value || '';
      const newPw = document.getElementById('profile-new-pw')?.value || '';
      const confirmPw = document.getElementById('profile-confirm-pw')?.value || '';

      if (newPw !== confirmPw) {
        if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; }
        return;
      }

      if (newPw.length < 4) {
        if (errEl) { errEl.textContent = 'New password must be at least 4 characters long.'; errEl.style.display = 'block'; }
        return;
      }

      const submitBtn = profileChangePwForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/profile/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-name': guestUser || '' },
          body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          profileChangePwForm.reset();
          const fillEl = document.getElementById('profile-pw-strength-fill');
          const labelEl = document.getElementById('profile-pw-strength-label');
          if (fillEl) fillEl.style.width = '0%';
          if (labelEl) labelEl.textContent = '';
          showModalAlert('Password updated successfully! Use your new password next time you log in.', 'Password Changed', 'success');
        } else {
          if (errEl) { errEl.textContent = data.error || 'Failed to change password.'; errEl.style.display = 'block'; }
        }
      } catch (err) {
        if (errEl) { errEl.textContent = 'Network error. Please try again.'; errEl.style.display = 'block'; }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Profile page logout button
  const btnProfilePageLogout = document.getElementById('btn-profile-page-logout');
  if (btnProfilePageLogout) {
    btnProfilePageLogout.addEventListener('click', async () => {
      const confirmed = await showModalConfirm('Are you sure you want to log out?', 'Confirm Sign Out');
      if (!confirmed) return;
      localStorage.removeItem('guest_user');
      localStorage.removeItem('owner_token');
      guestUser = null;
      guestUserBrianAccess = 'none';
      setAppMode('guest');
      switchView('dashboard');
      showModalAlert('You have been signed out.', 'Signed Out', 'success');
    });
  }

  function wireAccountAuthForms() {
    const tabBtnGuest = document.getElementById('account-tab-btn-guest');
    const tabBtnOwner = document.getElementById('account-tab-btn-owner');
    const panelGuest = document.getElementById('account-panel-guest');
    const panelOwner = document.getElementById('account-panel-owner');

    const btnGuestSubtabLogin = document.getElementById('account-btn-guest-subtab-login');
    const btnGuestSubtabSignup = document.getElementById('account-btn-guest-subtab-signup');
    const guestSubtabIndicator = document.getElementById('account-guest-subtab-indicator');
    const guestSubmitText = document.getElementById('account-guest-submit-text');
    const guestUsernameInput = document.getElementById('account-guest-username');
    const guestPasswordInput = document.getElementById('account-guest-password');
    const signupExtraFields = document.getElementById('account-signup-extra-fields');
    const guestConfirmPasswordInput = document.getElementById('account-guest-confirm-password');
    const guestConfirmMatch = document.getElementById('account-guest-confirm-match');
    const guestPwStrengthFill = document.getElementById('account-guest-pw-strength-fill');
    const guestPwStrengthLabel = document.getElementById('account-guest-pw-strength-label');

    const guestCredentialsArea = document.getElementById('account-guest-credentials-area');
    const panelGuestReset = document.getElementById('account-panel-guest-reset');
    const btnGuestForgot = document.getElementById('account-btn-guest-forgot');
    const btnGuestResetBack = document.getElementById('account-btn-guest-reset-back');

    let currentGuestTab = 'login'; // login or signup

    // Password strength helper
    function getPasswordStrength(pw) {
      let score = 0;
      if (pw.length >= 6) score++;
      if (pw.length >= 10) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;
      return score;
    }

    function updateStrengthBar(pw, fill, label) {
      const score = getPasswordStrength(pw);
      const widths = ['0%', '20%', '40%', '65%', '85%', '100%'];
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4'];
      const labels = ['', 'Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
      fill.style.width = pw.length > 0 ? widths[score] : '0%';
      fill.style.background = colors[score];
      label.textContent = pw.length > 0 ? labels[score] : '';
      label.style.color = colors[score];
    }

    // Pw toggle helper
    function wireToggle(btn, input) {
      if (!btn || !input) return;
      btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
        lucide.createIcons();
      });
    }

    wireToggle(document.getElementById('account-toggle-guest-pw'), guestPasswordInput);
    wireToggle(document.getElementById('account-toggle-guest-confirm-pw'), guestConfirmPasswordInput);

    // Listen to password input for strength
    if (guestPasswordInput && guestPwStrengthFill) {
      guestPasswordInput.addEventListener('input', () => {
        if (currentGuestTab === 'signup') {
          updateStrengthBar(guestPasswordInput.value, guestPwStrengthFill, guestPwStrengthLabel);
        }
      });
    }

    // Confirm password validation
    if (guestConfirmPasswordInput) {
      guestConfirmPasswordInput.addEventListener('input', () => {
        const match = guestPasswordInput.value === guestConfirmPasswordInput.value;
        guestConfirmMatch.style.display = guestConfirmPasswordInput.value.length > 0 ? 'block' : 'none';
        guestConfirmMatch.textContent = match ? '✓ Passwords match' : '✗ Passwords do not match';
        guestConfirmMatch.style.color = match ? '#10b981' : '#ef4444';
      });
    }

    // Switch Main Portal Tabs (Guest vs Owner)
    if (tabBtnGuest) {
      tabBtnGuest.addEventListener('click', () => {
        tabBtnGuest.classList.add('active');
        tabBtnOwner.classList.remove('active');
        panelGuest.style.display = 'block';
        panelOwner.style.display = 'none';
        guestUsernameInput.focus();
      });
    }

    if (tabBtnOwner) {
      tabBtnOwner.addEventListener('click', () => {
        tabBtnOwner.classList.add('active');
        tabBtnGuest.classList.remove('active');
        panelOwner.style.display = 'block';
        panelGuest.style.display = 'none';
        document.getElementById('account-owner-username').focus();
      });
    }

    // Guest Sub-tabs Login/Signup
    if (btnGuestSubtabLogin) {
      btnGuestSubtabLogin.addEventListener('click', () => {
        currentGuestTab = 'login';
        btnGuestSubtabLogin.classList.add('active');
        btnGuestSubtabSignup.classList.remove('active');
        guestSubtabIndicator.style.left = '0px';
        guestSubmitText.textContent = 'Log In';
        document.getElementById('account-guest-auth-error').style.display = 'none';
        if (signupExtraFields) signupExtraFields.style.display = 'none';
        guestPasswordInput.autocomplete = 'current-password';
      });
    }

    if (btnGuestSubtabSignup) {
      btnGuestSubtabSignup.addEventListener('click', () => {
        currentGuestTab = 'signup';
        btnGuestSubtabSignup.classList.add('active');
        btnGuestSubtabLogin.classList.remove('active');
        guestSubtabIndicator.style.left = '50%';
        guestSubmitText.textContent = 'Sign Up';
        document.getElementById('account-guest-auth-error').style.display = 'none';
        if (signupExtraFields) signupExtraFields.style.display = 'flex';
        guestPasswordInput.autocomplete = 'new-password';
      });
    }

    // Guest Forgot password panel toggle
    if (btnGuestForgot) {
      btnGuestForgot.addEventListener('click', () => {
        guestCredentialsArea.style.display = 'none';
        panelGuestReset.style.display = 'flex';
        document.getElementById('account-reset-username').focus();
      });
    }

    if (btnGuestResetBack) {
      btnGuestResetBack.addEventListener('click', () => {
        panelGuestReset.style.display = 'none';
        guestCredentialsArea.style.display = 'block';
        guestUsernameInput.focus();
      });
    }

    // Form Guest Submission
    const formGuestAuth = document.getElementById('account-form-guest-auth');
    if (formGuestAuth) {
      formGuestAuth.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('account-guest-auth-error');
        errEl.style.display = 'none';

        const uVal = guestUsernameInput.value.trim();
        const pVal = guestPasswordInput.value;
        const submitBtn = document.getElementById('account-btn-guest-auth-submit');
        submitBtn.disabled = true;

        const endpoint = currentGuestTab === 'login' ? '/api/auth/login' : '/api/auth/signup';

        // Confirm password check for signup
        if (currentGuestTab === 'signup') {
          const confirmVal = guestConfirmPasswordInput ? guestConfirmPasswordInput.value : '';
          if (pVal !== confirmVal) {
            errEl.textContent = 'Passwords do not match. Please re-enter.';
            errEl.style.display = 'block';
            submitBtn.disabled = false;
            return;
          }
        }

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uVal, password: pVal })
          });

          const data = await res.json();
          if (res.ok) {
            guestUser = data.username;
            localStorage.setItem('guest_user', data.username);
            setAppMode('guest');

            // Fetch user profile access status immediately on login
            await fetchUserProfile();

            // Re-initialize account page UI (which will show logged-in view)
            initAccountPage();

            if (currentGuestTab === 'signup' && data.recoveryCode) {
              showRecoveryCodeModal(data.recoveryCode, false);
            }
          } else {
            submitBtn.disabled = false;
            errEl.textContent = data.error || 'Authentication failed.';
            errEl.style.display = 'block';
          }
        } catch (err) {
          submitBtn.disabled = false;
          errEl.textContent = 'Network error. Please try again.';
          errEl.style.display = 'block';
        }
      });
    }

    // Form Guest Reset Submission
    const formGuestReset = document.getElementById('account-form-guest-reset');
    if (formGuestReset) {
      formGuestReset.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('account-guest-reset-error');
        errEl.style.display = 'none';

        const uVal = document.getElementById('account-reset-username').value.trim();
        const cVal = document.getElementById('account-reset-code').value.trim().toUpperCase();
        const newPwVal = document.getElementById('account-reset-newpw').value;
        const confirmPwVal = document.getElementById('account-reset-confirmpw').value;

        if (newPwVal !== confirmPwVal) {
          errEl.textContent = 'Passwords do not match.';
          errEl.style.display = 'block';
          return;
        }

        const submitBtn = formGuestReset.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uVal, recoveryCode: cVal, newPassword: newPwVal })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            formGuestReset.reset();
            panelGuestReset.style.display = 'none';
            guestCredentialsArea.style.display = 'block';
            showRecoveryCodeModal(data.newRecoveryCode, true);
          } else {
            submitBtn.disabled = false;
            errEl.textContent = data.error || 'Reset failed.';
            errEl.style.display = 'block';
          }
        } catch (err) {
          submitBtn.disabled = false;
          errEl.textContent = 'Network error. Please try again.';
          errEl.style.display = 'block';
        }
      });
    }

    // Form Owner Submission
    const formOwnerAuth = document.getElementById('account-form-owner-auth');
    if (formOwnerAuth) {
      formOwnerAuth.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('account-owner-auth-error');
        errEl.style.display = 'none';

        const uVal = document.getElementById('account-owner-username').value.trim();
        const pVal = document.getElementById('account-owner-password').value;
        const submitBtn = formOwnerAuth.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
          const res = await fetch('/api/auth/owner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uVal, password: pVal })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            localStorage.setItem('owner_token', data.token);
            setAppMode('owner');
            initAccountPage();
          } else {
            submitBtn.disabled = false;
            errEl.textContent = data.error || 'Authentication failed.';
            errEl.style.display = 'block';
          }
        } catch (err) {
          submitBtn.disabled = false;
          errEl.textContent = 'Network error. Please try again.';
          errEl.style.display = 'block';
        }
      });
    }
  }

  // Avatar upload & crop logic
  const profileAvatarFile = document.getElementById('profile-avatar-file');
  const btnProfileAvatarEdit = document.getElementById('btn-profile-avatar-edit');
  const avatarCropModal = document.getElementById('profile-avatar-crop-modal');
  const avatarCropImg = document.getElementById('profile-avatar-crop-img');
  const btnAvatarCropApply = document.getElementById('btn-crop-apply-avatar');
  const btnAvatarCropCancel = document.getElementById('btn-crop-cancel-avatar');

  if (btnProfileAvatarEdit && profileAvatarFile) {
    btnProfileAvatarEdit.addEventListener('click', () => profileAvatarFile.click());
  }

  if (profileAvatarFile) {
    profileAvatarFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!avatarCropImg || !avatarCropModal) return;
        avatarCropImg.src = ev.target.result;
        avatarCropModal.style.display = 'flex';
        avatarCropModal.classList.add('active');
        lucide.createIcons();

        // Destroy previous cropper
        if (profileCropper) { profileCropper.destroy(); profileCropper = null; }

        if (typeof Cropper !== 'undefined') {
          profileCropper = new Cropper(avatarCropImg, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            cropBoxResizable: false,
            guides: false,
            background: false,
            autoCropArea: 1,
          });
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }

  if (btnAvatarCropApply) {
    btnAvatarCropApply.addEventListener('click', async () => {
      let dataUrl;
      if (profileCropper) {
        const canvas = profileCropper.getCroppedCanvas({ width: 256, height: 256, fillColor: '#000' });
        dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      } else if (avatarCropImg) {
        dataUrl = avatarCropImg.src;
      }
      if (!dataUrl) return;

      profileAvatarDataUrl = dataUrl;

      // Update hero image immediately
      const heroImg = document.getElementById('profile-hero-img');
      const heroInitials = document.getElementById('profile-hero-initials');
      if (heroImg) { heroImg.src = dataUrl; heroImg.classList.remove('hidden'); }
      if (heroInitials) heroInitials.style.display = 'none';
      updateSidebarAvatar(dataUrl);

      // Save to server
      if (guestUser) {
        try {
          const res = await fetch('/api/auth/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-name': guestUser },
            body: JSON.stringify({ avatarData: dataUrl })
          });
          if (res.ok) {
            showModalAlert('Avatar saved successfully!', 'Avatar Updated', 'success');
          }
        } catch (err) {
          console.error('Failed to save avatar:', err);
        }
      }

      // Close modal
      avatarCropModal.classList.remove('active');
      avatarCropModal.style.display = 'none';
      if (profileCropper) { profileCropper.destroy(); profileCropper = null; }
    });
  }

  if (btnAvatarCropCancel) {
    btnAvatarCropCancel.addEventListener('click', () => {
      avatarCropModal.classList.remove('active');
      avatarCropModal.style.display = 'none';
      if (profileCropper) { profileCropper.destroy(); profileCropper = null; }
    });
  }

});






