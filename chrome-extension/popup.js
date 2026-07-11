document.addEventListener('DOMContentLoaded', () => {
  // Views
  const viewLogin = document.getElementById('view-login');
  const viewMain = document.getElementById('view-main');
  const viewSettings = document.getElementById('view-settings');
  
  // Header Buttons
  const btnSettings = document.getElementById('btn-settings');
  
  // Login Form Elements
  const loginServerUrl = document.getElementById('login-server-url');
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const btnDetectLoginUser = document.getElementById('btn-detect-login-user');
  const loginSpinner = document.getElementById('login-spinner');
  
  // Saver Form Elements
  const previewTitle = document.getElementById('preview-title');
  const previewDomain = document.getElementById('preview-domain');
  const previewFavicon = document.getElementById('preview-favicon');
  const inputTitle = document.getElementById('input-title');
  const inputCategory = document.getElementById('input-category');
  const inputFolder = document.getElementById('input-folder');
  const btnSave = document.getElementById('btn-save');
  const spinner = document.getElementById('spinner');
  
  // Settings Form Elements
  const inputServerUrl = document.getElementById('input-server-url');
  const activeUserBadge = document.getElementById('active-user-badge');
  const btnSettingsSave = document.getElementById('btn-settings-save');
  const btnSettingsBack = document.getElementById('btn-settings-back');
  const btnLogout = document.getElementById('btn-logout');
  
  // Status Indicator
  const statusMessage = document.getElementById('status-message');

  let currentTabUrl = '';
  let currentTabTitle = '';
  let currentTabFavicon = '';

  const DEFAULT_PORTAL_URL = 'https://blend-com.onrender.com';

  // 1. Initial Launch: Check session
  chrome.storage.local.get(['serverUrl', 'username'], (data) => {
    const serverUrl = data.serverUrl || DEFAULT_PORTAL_URL;
    const username = data.username;

    // Check if we have cookie login session for the targeted portal URL
    chrome.cookies.get({ url: serverUrl, name: 'blendd_username' }, (cookie) => {
      if (cookie && cookie.value) {
        const cookieUser = decodeURIComponent(cookie.value);
        // Sync cookie session to extension storage
        chrome.storage.local.set({ serverUrl, username: cookieUser }, () => {
          inputServerUrl.value = serverUrl;
          activeUserBadge.textContent = cookieUser;
          showView('main');
        });
      } else if (username) {
        // No cookie, but extension storage session exists
        inputServerUrl.value = serverUrl;
        activeUserBadge.textContent = username;
        showView('main');
      } else {
        // Not logged in anywhere: show login screen
        loginServerUrl.value = serverUrl;
        showView('login');
      }
    });
  });

  // 2. Fetch Active Tab Info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      const tab = tabs[0];
      currentTabUrl = tab.url;
      currentTabTitle = tab.title || 'Untitled Page';
      currentTabFavicon = tab.favIconUrl || '';

      // Populate preview card fields
      previewTitle.textContent = currentTabTitle;
      inputTitle.value = currentTabTitle;
      
      try {
        const urlObj = new URL(currentTabUrl);
        previewDomain.textContent = urlObj.hostname;
      } catch (e) {
        previewDomain.textContent = 'Unknown Domain';
      }

      if (currentTabFavicon) {
        previewFavicon.src = currentTabFavicon;
      }
    }
  });

  // 3. Login Event
  btnLoginSubmit.addEventListener('click', () => {
    let serverUrl = loginServerUrl.value.trim();
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!serverUrl) {
      showStatus('Portal Server URL is required', 'error');
      return;
    }
    if (!username || !password) {
      showStatus('Username and Password are required', 'error');
      return;
    }

    // Strip trailing slash
    if (serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1);
    }

    // Loader
    btnLoginSubmit.disabled = true;
    loginSpinner.classList.remove('hidden');
    clearStatus();

    // Call Login API
    fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })
    .then(async (response) => {
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Invalid credentials or connection error');
      }
      return response.json();
    })
    .then((data) => {
      // Save credentials locally
      chrome.storage.local.set({ serverUrl, username }, () => {
        // Write cookie on the website domain so the site is also logged in
        chrome.cookies.set({
          url: serverUrl,
          name: 'blendd_username',
          value: encodeURIComponent(username),
          path: '/',
          expirationDate: (Date.now() / 1000) + 31536000 // 1 year
        }, () => {
          showStatus('Logged in successfully!', 'success');
          
          // Update input configs
          inputServerUrl.value = serverUrl;
          activeUserBadge.textContent = username;
          
          setTimeout(() => {
            showView('main');
            clearStatus();
            btnLoginSubmit.disabled = false;
            loginSpinner.classList.add('hidden');
            loginPassword.value = '';
          }, 800);
        });
      });
    })
    .catch((error) => {
      console.error('Authentication Error:', error);
      showStatus(error.message, 'error');
      btnLoginSubmit.disabled = false;
      loginSpinner.classList.add('hidden');
    });
  });

  // 4. Save Bookmark Event
  btnSave.addEventListener('click', () => {
    if (!currentTabUrl) {
      showStatus('No active tab URL detected', 'error');
      return;
    }

    chrome.storage.local.get(['serverUrl', 'username'], (data) => {
      const serverUrl = data.serverUrl;
      const username = data.username;

      if (!serverUrl || !username) {
        showView('login');
        return;
      }

      const titleVal = inputTitle.value.trim() || currentTabTitle;
      const categoryVal = inputCategory.value;
      const folderVal = inputFolder.value.trim();

      btnSave.disabled = true;
      spinner.classList.remove('hidden');
      clearStatus();

      const payload = {
        linkUrl: currentTabUrl,
        customTitle: titleVal,
        category: categoryVal,
        isPrivate: true,
        favicon: currentTabFavicon || 'auto',
        addedBy: username
      };

      if (folderVal) {
        payload.folderName = folderVal;
      }

      fetch(`${serverUrl}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': username
        },
        body: JSON.stringify(payload)
      })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication expired. Please sign in again.');
        }
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Server error saving bookmark');
        }
        return response.json();
      })
      .then((data) => {
        showStatus('Link saved to Private Space!', 'success');
        btnSave.style.background = '#10b981';
        btnSave.textContent = '✓ Saved!';
        
        setTimeout(() => {
          window.close();
        }, 1200);
      })
      .catch((error) => {
        console.error('Bookmark save failure:', error);
        showStatus(error.message, 'error');
        btnSave.disabled = false;
        spinner.classList.add('hidden');
        
        if (error.message.includes('Authentication expired')) {
          setTimeout(() => {
            showView('login');
          }, 1500);
        }
      });
    });
  });

  // 5. Settings Routing & Saving
  btnSettings.addEventListener('click', () => {
    showView('settings');
  });

  btnSettingsBack.addEventListener('click', () => {
    showView('main');
  });

  btnSettingsSave.addEventListener('click', () => {
    let serverUrl = inputServerUrl.value.trim();
    if (!serverUrl) {
      showStatus('Server URL is required', 'error');
      return;
    }

    if (serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1);
    }

    chrome.storage.local.set({ serverUrl }, () => {
      showStatus('Server settings updated!', 'success');
      setTimeout(() => {
        showView('main');
        clearStatus();
      }, 1000);
    });
  });

  // 6. Logout
  btnLogout.addEventListener('click', () => {
    chrome.storage.local.get(['serverUrl'], (data) => {
      const serverUrl = data.serverUrl || DEFAULT_PORTAL_URL;
      chrome.storage.local.remove(['username'], () => {
        // Delete cookie from the website domain
        chrome.cookies.remove({
          url: serverUrl,
          name: 'blendd_username'
        }, () => {
          showStatus('Logged out successfully.', 'success');
          setTimeout(() => {
            showView('login');
            clearStatus();
          }, 800);
        });
      });
    });
  });

  // 7. Auto Detect Buttons
  btnDetectLoginUser.addEventListener('click', () => {
    const serverUrl = loginServerUrl.value.trim();
    if (!serverUrl) {
      showStatus('Specify a portal URL first', 'error');
      return;
    }

    btnDetectLoginUser.disabled = true;
    btnDetectLoginUser.textContent = 'Scanning...';
    clearStatus();

    detectSessionFromTabs(serverUrl, (detectedUser) => {
      btnDetectLoginUser.disabled = false;
      btnDetectLoginUser.textContent = 'Detect';
      if (detectedUser) {
        loginUsername.value = detectedUser;
        showStatus(`Detected active user: ${detectedUser}`, 'success');
      } else {
        showStatus('No active portal tabs found.', 'error');
      }
    });
  });

  // Helper Functions
  function showView(viewName) {
    clearStatus();
    viewLogin.classList.add('hidden');
    viewMain.classList.add('hidden');
    viewSettings.classList.add('hidden');
    btnSettings.classList.add('hidden');

    if (viewName === 'login') {
      viewLogin.classList.remove('hidden');
    } else if (viewName === 'main') {
      viewMain.classList.remove('hidden');
      btnSettings.classList.remove('hidden');
    } else if (viewName === 'settings') {
      viewSettings.classList.remove('hidden');
    }
  }

  function showStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
  }

  function clearStatus() {
    statusMessage.textContent = '';
    statusMessage.className = 'status-message hidden';
  }

  function autoDetectActiveSession(serverUrl) {
    detectSessionFromTabs(serverUrl, (detectedUser) => {
      if (detectedUser) {
        loginUsername.value = detectedUser;
      }
    });
  }

  function detectSessionFromTabs(serverUrl, callback) {
    let cleanUrl = serverUrl.replace(/^https?:\/\//, '').split(':')[0]; // Host name
    
    chrome.tabs.query({}, (tabs) => {
      const targetTab = tabs.find(t => t.url && t.url.includes(cleanUrl));
      if (!targetTab) {
        callback(null);
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: () => {
          return localStorage.getItem('guest_user') || localStorage.getItem('nexus_mode') === 'owner' ? 'Owner' : null;
        }
      }, (results) => {
        if (results && results[0] && results[0].result) {
          callback(results[0].result);
        } else {
          callback(null);
        }
      });
    });
  }
});
