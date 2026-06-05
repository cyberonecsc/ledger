/* ==========================================================================
   CYBERONE Center Management Platform - Login & Registration (views/login.js)
   ========================================================================== */

import { auth } from '../auth.js';

export function renderLogin(mountPoint, appInstance) {
  let viewMode = 'login'; // 'login', 'signup', 'reset'
  let generatedOtp = '';
  let isEmailVerified = false;
  let photoBase64 = '';
  let resetOtpGenerated = '';
  let isResetOtpVerified = false;

  const updateCardContent = () => {
    const customLogo = localStorage.getItem('cyberone_v2_custom_logo');
    const logoSrc = customLogo || './logo.png';
    const loginLogoHtml = `<img src="${logoSrc}" class="login-logo" style="width: 64px; height: 64px; object-fit: contain; margin-bottom: 15px;" onerror="this.outerHTML='<i data-lucide=\\'shield-check\\' class=\\'login-logo\\' style=\\'width: 48px; height: 48px; display: inline-block;\\'></i>'; lucide.createIcons();">`;
    const signupLogoHtml = `<img src="${logoSrc}" class="login-logo" style="width: 64px; height: 64px; object-fit: contain; margin-bottom: 15px;" onerror="this.outerHTML='<i data-lucide=\\'user-plus\\' class=\\'login-logo\\' style=\\'width: 48px; height: 48px; display: inline-block;\\'></i>'; lucide.createIcons();">`;
    const resetLogoHtml = `<img src="${logoSrc}" class="login-logo" style="width: 64px; height: 64px; object-fit: contain; margin-bottom: 15px;" onerror="this.outerHTML='<i data-lucide=\\'key-round\\' class=\\'login-logo\\' style=\\'width: 48px; height: 48px; display: inline-block;\\'></i>'; lucide.createIcons();">`;

    if (viewMode === 'login') {
      // Render Sign In form
      mountPoint.innerHTML = `
        <div class="login-screen">
          <div class="login-card">
            <div class="login-header">
              ${loginLogoHtml}
              <h2>CYBERONE CSC Portal Login</h2>
              <p>Sign in to manage service records & accounting</p>
            </div>

            <div id="login-error" class="badge expense" style="width: 100%; display: none; justify-content: center; margin-bottom: 15px; padding: 10px; border-radius: var(--border-radius-sm);">
              Invalid username or password
            </div>

            <form id="login-form">
              <div class="form-group">
                <label class="form-label" for="username">Username</label>
                <input type="text" id="username" class="form-control" placeholder="Enter username" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <input type="password" id="password" class="form-control" placeholder="Enter password" required>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
                <i data-lucide="log-in" style="width: 16px; height: 16px;"></i> Sign In
              </button>
            </form>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; font-size: 13px;">
              <div>
                <span style="color: var(--text-muted);">New? </span>
                <a href="#" id="toggle-signup" style="color: var(--color-primary); font-weight: 600; text-decoration: none; outline: none;">Sign Up</a>
              </div>
              <div>
                <a href="#" id="link-forgot-password" style="color: var(--color-primary); font-weight: 600; text-decoration: none; outline: none;">Forgot Password?</a>
              </div>
            </div>
          </div>
        </div>
      `;
      bindLoginEvents();
    } else if (viewMode === 'signup') {
      // Render Sign Up form (excluding "owner" from the options)
      mountPoint.innerHTML = `
        <div class="login-screen">
          <div class="login-card" style="max-width: 480px; margin: 30px auto; max-height: 90vh; overflow-y: auto;">
            <div class="login-header">
              ${signupLogoHtml}
              <h2>Create Operator Account</h2>
              <p>Register as a center admin, accountant, or staff</p>
            </div>

            <div id="signup-error" class="badge expense" style="width: 100%; display: none; justify-content: center; margin-bottom: 15px; padding: 10px; border-radius: var(--border-radius-sm);">
              Username already exists
            </div>

            <form id="signup-form">
              <div class="form-group">
                <label class="form-label" for="fullname">Full Name</label>
                <input type="text" id="fullname" class="form-control" placeholder="Enter full name" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="new-username">Username</label>
                <input type="text" id="new-username" class="form-control" placeholder="Choose username" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="new-password">Password</label>
                <input type="password" id="new-password" class="form-control" placeholder="Create password" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="role-select">Select Access Level (Role)</label>
                <select id="role-select" class="form-control" required>
                  <option value="admin">Admin (All operations)</option>
                  <option value="accountant">Accountant (Ledger & Reports)</option>
                  <option value="staff" selected>Staff (Daily sales logs only)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="mobile">Mobile Number (WhatsApp)</label>
                <input type="tel" id="mobile" class="form-control" placeholder="e.g. +91 9845012345" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="email">Email ID</label>
                <div style="display: flex; gap: 10px;">
                  <input type="email" id="email" class="form-control" placeholder="Enter email address" required style="flex-grow: 1;">
                  <button type="button" id="btn-send-otp" class="btn btn-secondary" style="white-space: nowrap; padding: 10px 15px; font-size: 13px; font-weight: 600;">Send OTP</button>
                </div>
              </div>

              <!-- OTP Verification Input Section (Hidden by default) -->
              <div id="otp-section" class="form-group" style="display: none; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); padding: 12px; border-radius: var(--border-radius-sm); margin-top: 10px;">
                <label class="form-label" for="otp-input" style="color: var(--color-primary);">Verify Email OTP</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <input type="text" id="otp-input" class="form-control" placeholder="6-digit OTP" maxLength="6" style="flex-grow: 1; text-align: center; font-weight: 700; letter-spacing: 2px;">
                  <button type="button" id="btn-verify-otp" class="btn btn-primary" style="white-space: nowrap; padding: 10px 15px; font-size: 13px;">Verify</button>
                </div>
                <div id="otp-status" style="font-size: 11px; margin-top: 6px; font-weight: 600;"></div>
                <div id="resend-otp-container" style="font-size: 11px; margin-top: 8px; color: var(--text-muted); font-weight: 500;">
                  Resend OTP in <span id="resend-timer-seconds">30</span>s
                </div>
              </div>

              <div class="form-group" style="margin-top: 15px;">
                <label class="form-label" for="photo-upload">Profile Photo (Optional)</label>
                <input type="file" id="photo-upload" class="form-control" accept="image/*" style="padding: 6px 14px;">
                <div id="photo-preview-container" style="display: none; margin-top: 10px; align-items: center; gap: 10px;">
                  <img id="photo-preview" src="" alt="Preview" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-primary); box-shadow: 0 0 8px var(--color-primary-glow);">
                  <span style="font-size: 11px; color: var(--text-muted);">Photo uploaded successfully</span>
                </div>
              </div>

              <button type="submit" id="register-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 15px;" disabled>
                <i data-lucide="user-check" style="width: 16px; height: 16px;"></i> Register Account
              </button>
            </form>

            <div style="text-align: center; margin-top: 20px; font-size: 13px; padding-bottom: 10px;">
              <span style="color: var(--text-muted);">Already have an account? </span>
              <a href="#" id="toggle-login" style="color: var(--color-primary); font-weight: 600; text-decoration: none; outline: none;">Sign In</a>
            </div>
          </div>
        </div>
      `;
      bindSignUpEvents();
    } else if (viewMode === 'reset') {
      // Render Password Reset form
      mountPoint.innerHTML = `
        <div class="login-screen">
          <div class="login-card" style="max-width: 450px;">
            <div class="login-header">
              ${resetLogoHtml}
              <h2>Reset Password</h2>
              <p>Verify your account email to set a new password</p>
            </div>

            <div id="reset-error" class="badge expense" style="width: 100%; display: none; justify-content: center; margin-bottom: 15px; padding: 10px; border-radius: var(--border-radius-sm);">
              Invalid username or email
            </div>

            <form id="reset-form">
              <div class="form-group">
                <label class="form-label" for="reset-username">Username</label>
                <input type="text" id="reset-username" class="form-control" placeholder="Enter your username" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="reset-email">Email ID</label>
                <div style="display: flex; gap: 10px;">
                  <input type="email" id="reset-email" class="form-control" placeholder="Enter registered email" required style="flex-grow: 1;">
                  <button type="button" id="btn-reset-send-otp" class="btn btn-secondary" style="white-space: nowrap; padding: 10px 15px; font-size: 13px; font-weight: 600;">Send OTP</button>
                </div>
              </div>

              <!-- Reset OTP Section -->
              <div id="reset-otp-section" class="form-group" style="display: none; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); padding: 12px; border-radius: var(--border-radius-sm); margin-top: 10px;">
                <label class="form-label" for="reset-otp-input" style="color: var(--color-primary);">Verify Email OTP</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <input type="text" id="reset-otp-input" class="form-control" placeholder="6-digit OTP" maxLength="6" style="flex-grow: 1; text-align: center; font-weight: 700; letter-spacing: 2px;">
                  <button type="button" id="btn-reset-verify-otp" class="btn btn-primary" style="white-space: nowrap; padding: 10px 15px; font-size: 13px;">Verify</button>
                </div>
                <div id="reset-otp-status" style="font-size: 11px; margin-top: 6px; font-weight: 600;"></div>
              </div>

              <div class="form-group" style="margin-top: 15px;">
                <label class="form-label" for="reset-new-password">New Password</label>
                <input type="password" id="reset-new-password" class="form-control" placeholder="Enter new password" required disabled>
              </div>

              <button type="submit" id="reset-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 15px;" disabled>
                <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> Update Password
              </button>
            </form>

            <div style="text-align: center; margin-top: 20px; font-size: 13px;">
              <span style="color: var(--text-muted);">Remembered password? </span>
              <a href="#" id="toggle-reset-login" style="color: var(--color-primary); font-weight: 600; text-decoration: none; outline: none;">Sign In</a>
            </div>
          </div>
        </div>
      `;
      bindResetEvents();
    }
    lucide.createIcons();
  };

  const bindLoginEvents = () => {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const userVal = document.getElementById('username').value.trim();
      const passVal = document.getElementById('password').value;
      
      const res = auth.login(userVal, passVal);
      if (res.success) {
        appInstance.showToast(`Welcome back, ${res.user.name}!`, 'success');
        window.location.hash = '#dashboard';
      } else {
        errorDiv.style.display = 'flex';
        errorDiv.innerText = res.message;
      }
    });

    const toggleLink = document.getElementById('toggle-signup');
    if (toggleLink) {
      toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        viewMode = 'signup';
        updateCardContent();
      });
    }

    const forgotLink = document.getElementById('link-forgot-password');
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        viewMode = 'reset';
        updateCardContent();
      });
    }
  };

  const bindResetEvents = () => {
    const form = document.getElementById('reset-form');
    const errorDiv = document.getElementById('reset-error');
    const btnSendOtp = document.getElementById('btn-reset-send-otp');
    const usernameInput = document.getElementById('reset-username');
    const emailInput = document.getElementById('reset-email');
    const otpSection = document.getElementById('reset-otp-section');
    const otpInput = document.getElementById('reset-otp-input');
    const btnVerifyOtp = document.getElementById('btn-reset-verify-otp');
    const otpStatus = document.getElementById('reset-otp-status');
    const newPasswordInput = document.getElementById('reset-new-password');
    const submitBtn = document.getElementById('reset-submit-btn');

    btnSendOtp.addEventListener('click', () => {
      errorDiv.style.display = 'none';
      const userVal = usernameInput.value.trim().toLowerCase();
      const emailVal = emailInput.value.trim().toLowerCase();

      if (!userVal) {
        appInstance.showToast('Please enter your username.', 'error');
        return;
      }
      if (!emailVal || !emailInput.checkValidity()) {
        appInstance.showToast('Please enter a valid email address.', 'error');
        return;
      }

      // Check if user exists and email matches
      const matchedUser = auth.users.find(
        u => u.username.toLowerCase() === userVal && (u.email || '').toLowerCase() === emailVal
      );

      if (!matchedUser) {
        errorDiv.style.display = 'flex';
        errorDiv.innerText = 'Username and registered email do not match any account.';
        return;
      }

      // Generate simulated OTP
      resetOtpGenerated = String(Math.floor(100000 + Math.random() * 900000));
      appInstance.showToast(`[Simulated Email] Password reset OTP sent! Code: ${resetOtpGenerated}`, 'warning');
      console.log(`[CYBER ONE RESET OTP] Code: ${resetOtpGenerated}`);

      otpSection.style.display = 'block';
      usernameInput.disabled = true;
      emailInput.disabled = true;
      btnSendOtp.disabled = true;
      btnSendOtp.innerText = 'OTP Sent';
    });

    btnVerifyOtp.addEventListener('click', () => {
      const enteredVal = otpInput.value.trim();
      if (enteredVal === resetOtpGenerated) {
        isResetOtpVerified = true;
        otpStatus.innerText = 'Email verified successfully!';
        otpStatus.style.color = 'var(--color-success)';
        otpInput.disabled = true;
        btnVerifyOtp.disabled = true;
        newPasswordInput.disabled = false;
        submitBtn.disabled = false;
        appInstance.showToast('Email verified! You can now set a new password.', 'success');
      } else {
        isResetOtpVerified = false;
        otpStatus.innerText = 'Invalid OTP. Please try again.';
        otpStatus.style.color = 'var(--color-danger)';
        appInstance.showToast('Incorrect OTP.', 'error');
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isResetOtpVerified) {
        appInstance.showToast('Please verify OTP first.', 'error');
        return;
      }

      const userVal = usernameInput.value.trim();
      const newPass = newPasswordInput.value;

      const res = auth.updateUser(userVal, { password: newPass });
      if (res.success) {
        appInstance.showToast('Password updated successfully! Please login with your new password.', 'success');
        viewMode = 'login';
        resetOtpGenerated = '';
        isResetOtpVerified = false;
        updateCardContent();
      } else {
        errorDiv.style.display = 'flex';
        errorDiv.innerText = res.message;
      }
    });

    const toggleLink = document.getElementById('toggle-reset-login');
    if (toggleLink) {
      toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        viewMode = 'login';
        resetOtpGenerated = '';
        isResetOtpVerified = false;
        updateCardContent();
      });
    }
  };

  const bindSignUpEvents = () => {
    const form = document.getElementById('signup-form');
    const errorDiv = document.getElementById('signup-error');
    
    const emailInput = document.getElementById('email');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const otpSection = document.getElementById('otp-section');
    const otpInput = document.getElementById('otp-input');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const otpStatus = document.getElementById('otp-status');
    const photoUpload = document.getElementById('photo-upload');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    const photoPreview = document.getElementById('photo-preview');
    const registerBtn = document.getElementById('register-submit-btn');

    // Handle photo select preview & base64 load
    if (photoUpload) {
      photoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            photoBase64 = event.target.result;
            if (photoPreview && photoPreviewContainer) {
              photoPreview.src = photoBase64;
              photoPreviewContainer.style.display = 'flex';
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Handle Send OTP with 30s Resend Timer
    let countdownInterval = null;
    const startOtpTimer = () => {
      let secondsLeft = 30;
      const container = document.getElementById('resend-otp-container');
      if (!container) return;
      
      container.innerHTML = `Resend OTP in <span id="resend-timer-seconds" style="font-weight:700; color:var(--color-primary);">${secondsLeft}</span>s`;
      
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(countdownInterval);
          container.innerHTML = `Didn't receive OTP? <a href="#" id="link-resend-otp" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">Resend OTP</a>`;
          
          // Bind resend click
          const resendLink = document.getElementById('link-resend-otp');
          if (resendLink) {
            resendLink.addEventListener('click', (e) => {
              e.preventDefault();
              // Re-trigger OTP generation
              generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
              appInstance.showToast(`[Simulated Email] New verification OTP sent! Code: ${generatedOtp}`, 'warning');
              console.log(`[CYBER ONE OTP] New verification code: ${generatedOtp}`);
              startOtpTimer();
            });
          }
        } else {
          const secondsSpan = document.getElementById('resend-timer-seconds');
          if (secondsSpan) secondsSpan.innerText = secondsLeft;
        }
      }, 1000);
    };

    if (btnSendOtp) {
      btnSendOtp.addEventListener('click', () => {
        const emailVal = emailInput.value.trim();
        if (!emailVal || !emailInput.checkValidity()) {
          appInstance.showToast('Please enter a valid email address first.', 'error');
          return;
        }

        // Generate random 6 digit code
        generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
        
        // Show simulated OTP in toast message (and console)
        appInstance.showToast(`[Simulated Email] Verification OTP sent! Code: ${generatedOtp}`, 'warning');
        
        if (otpSection) {
          otpSection.style.display = 'block';
        }
        
        // Disable email modification during verification
        emailInput.disabled = true;
        btnSendOtp.disabled = true;
        btnSendOtp.innerText = 'OTP Sent';
        
        console.log(`[CYBER ONE OTP] Verification code: ${generatedOtp}`);
        startOtpTimer();
      });
    }

    // Handle Verify OTP
    if (btnVerifyOtp) {
      btnVerifyOtp.addEventListener('click', () => {
        const enteredVal = otpInput.value.trim();
        if (enteredVal === generatedOtp) {
          isEmailVerified = true;
          if (otpStatus) {
            otpStatus.innerText = 'Email verified successfully!';
            otpStatus.style.color = 'var(--color-success)';
          }
          otpInput.disabled = true;
          btnVerifyOtp.disabled = true;
          if (registerBtn) {
            registerBtn.disabled = false;
          }
          appInstance.showToast('Email verified successfully!', 'success');
        } else {
          isEmailVerified = false;
          if (otpStatus) {
            otpStatus.innerText = 'Invalid OTP. Please try again.';
            otpStatus.style.color = 'var(--color-danger)';
          }
          appInstance.showToast('Incorrect OTP. Check verification code.', 'error');
        }
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (!isEmailVerified) {
        appInstance.showToast('Please verify your email address with OTP first!', 'error');
        return;
      }

      const name = document.getElementById('fullname').value;
      const username = document.getElementById('new-username').value;
      const password = document.getElementById('new-password').value;
      const role = document.getElementById('role-select').value;
      const mobile = document.getElementById('mobile').value;
      const email = emailInput.value;

      const res = auth.addUser(name, username, password, role, mobile, email, photoBase64);
      if (res.success) {
        appInstance.showToast('Registration successful! Please sign in.', 'success');
        viewMode = 'login';
        // reset states
        generatedOtp = '';
        isEmailVerified = false;
        photoBase64 = '';
        updateCardContent();
      } else {
        errorDiv.style.display = 'flex';
        errorDiv.innerText = res.message;
      }
    });

    const toggleLink = document.getElementById('toggle-login');
    if (toggleLink) {
      toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        viewMode = 'login';
        // reset states
        generatedOtp = '';
        isEmailVerified = false;
        photoBase64 = '';
        updateCardContent();
      });
    }
  };

  // Initial render
  updateCardContent();
}

export default renderLogin;
