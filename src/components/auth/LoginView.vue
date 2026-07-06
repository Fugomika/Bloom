<script setup>
import { ref } from 'vue'
import { signIn, signUp, signInWithGoogle } from '../../composables/useAuth.js'
import AppIcon from '../ui/AppIcon.vue'
import BloomLogo from '../ui/BloomLogo.vue'

const isSignUp = ref(false)
const email    = ref('')
const password = ref('')
const submitting = ref(false)
const errorMsg   = ref('')
const successMsg = ref('')

function toggle() {
  isSignUp.value = !isSignUp.value
  errorMsg.value = ''
  successMsg.value = ''
}

async function submit() {
  errorMsg.value = ''
  successMsg.value = ''
  submitting.value = true
  try {
    if (isSignUp.value) {
      await signUp(email.value, password.value)
      successMsg.value = 'Account created! Check your email to confirm, then sign in.'
      isSignUp.value = false
    } else {
      await signIn(email.value, password.value)
    }
  } catch (e) {
    errorMsg.value = e.message || 'Something went wrong — try again.'
  } finally {
    submitting.value = false
  }
}

async function google() {
  errorMsg.value = ''
  try {
    await signInWithGoogle()
  } catch (e) {
    errorMsg.value = e.message || 'Google sign-in failed — try again.'
  }
}
</script>

<template>
  <div class="login-bg">
    <span class="blob b1"></span>
    <span class="blob b2"></span>
    <span class="blob b3"></span>

    <div class="login-card">
      <div class="brand">
        <div class="brand-logo"><BloomLogo :size="60" /></div>
        <h1 class="brand-name">Bloom</h1>
        <p class="brand-sub">{{ isSignUp ? 'make a little space of your own' : 'welcome back, sunshine' }}</p>
      </div>

      <form @submit.prevent="submit" class="login-form">
        <div class="field">
          <span class="field-ico"><AppIcon name="mail" :size="15" /></span>
          <input
            type="email"
            v-model="email"
            placeholder="your email"
            required
            autocomplete="email"
          />
        </div>
        <div class="field">
          <span class="field-ico"><AppIcon name="lock" :size="15" /></span>
          <input
            type="password"
            v-model="password"
            placeholder="password"
            required
            autocomplete="current-password"
            minlength="6"
          />
        </div>

        <p v-if="errorMsg" class="msg-error">{{ errorMsg }}</p>
        <p v-if="successMsg" class="msg-success">{{ successMsg }}</p>

        <button type="submit" class="submit-btn" :disabled="submitting">
          <span v-if="submitting" class="spin"></span>
          <span v-else>{{ isSignUp ? 'Create account' : 'Sign in' }}</span>
        </button>
      </form>

      <div class="divider"><span>or</span></div>

      <button type="button" class="google-btn" @click="google">
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Continue with Google
      </button>

      <div class="toggle-row">
        <span>{{ isSignUp ? 'Already have an account?' : "Don't have one yet?" }}</span>
        <button class="toggle-btn" @click="toggle">
          {{ isSignUp ? 'Sign in →' : 'Create one →' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-bg {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(145deg, #FFFBEB 0%, #FEF3C7 45%, #FFF7ED 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
  box-sizing: border-box;
}

/* Soft ambient blobs */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  animation: drift 9s ease-in-out infinite;
}
.b1 { width: 340px; height: 340px; top: -80px; left: -100px; background: rgba(251, 191, 36, .35) }
.b2 { width: 280px; height: 280px; bottom: -60px; right: -70px; background: rgba(249, 115, 22, .22); animation-delay: 2s }
.b3 { width: 220px; height: 220px; top: 55%; left: 6%; background: rgba(132, 204, 22, .18); animation-delay: 4s }

@keyframes drift {
  0%, 100% { transform: translate(0, 0) }
  50%      { transform: translate(18px, -22px) }
}
@media (prefers-reduced-motion: reduce) {
  .blob, .brand-logo, .login-card { animation: none }
}

/* Card */
.login-card {
  background: #fff;
  border-radius: 28px;
  padding: 40px 36px 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(251, 191, 36, 0.18), 0 4px 20px rgba(0,0,0,0.08);
  position: relative;
  z-index: 1;
  animation: cardIn .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(28px) scale(.97) }
  to   { opacity: 1; transform: none }
}

/* Brand */
.brand { text-align: center; margin-bottom: 28px }
.brand-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
  animation: logoFloat 3s ease-in-out infinite;
}
@keyframes logoFloat {
  0%, 100% { transform: translateY(0) }
  50%       { transform: translateY(-8px) }
}
.brand-name {
  font-family: 'Fredoka One', cursive;
  font-size: 38px;
  color: #92400E;
  margin: 0 0 6px;
  line-height: 1;
}
.brand-sub {
  font-size: 13.5px;
  font-weight: 700;
  color: #A16207;
  margin: 0;
  opacity: .75;
}

/* Form */
.login-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px }

.field {
  display: flex;
  align-items: center;
  background: #FFFBEB;
  border: 2px solid #FDE68A;
  border-radius: 14px;
  padding: 0 14px;
  transition: border-color .18s, box-shadow .18s;
  gap: 10px;
}
.field:focus-within {
  border-color: #FBBF24;
  box-shadow: 0 0 0 3px rgba(251,191,36,.18);
}
.field-ico { display: flex; color: #D97706; flex-shrink: 0 }
.field input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 13px;
  padding-left: 10px;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1A0E00;
  outline: none;
}
.field input::placeholder { color: #D97706; opacity: .55; font-weight: 600 }

/* Messages */
.msg-error {
  font-size: 12.5px;
  font-weight: 800;
  color: #DC2626;
  background: #FEF2F2;
  border-radius: 10px;
  padding: 9px 13px;
  margin: 0;
}
.msg-success {
  font-size: 12.5px;
  font-weight: 800;
  color: #15803D;
  background: #F0FDF4;
  border-radius: 10px;
  padding: 9px 13px;
  margin: 0;
}

/* Submit */
.submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #FBBF24, #F59E0B);
  color: #1A0E00;
  font-family: 'Fredoka One', cursive;
  font-size: 17px;
  cursor: pointer;
  transition: transform .18s, box-shadow .18s, opacity .18s;
  box-shadow: 0 4px 14px rgba(251,191,36,.45);
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 51px;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(251,191,36,.5);
}
.submit-btn:active:not(:disabled) { transform: translateY(0) }
.submit-btn:disabled { opacity: .65; cursor: default }

.spin {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid rgba(26,14,0,.25);
  border-top-color: #1A0E00;
  animation: spinRing .7s linear infinite;
}
@keyframes spinRing { to { transform: rotate(360deg) } }

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  color: #A16207;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
  opacity: .6;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1.5px;
  background: #FDE68A;
}

/* Google */
.google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 12px;
  border-radius: 14px;
  border: 2px solid #FDE68A;
  background: #fff;
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #1A0E00;
  transition: border-color .18s, box-shadow .18s, transform .18s;
  margin-bottom: 20px;
}
.google-btn:hover {
  border-color: #FBBF24;
  box-shadow: 0 4px 14px rgba(251,191,36,.2);
  transform: translateY(-1px);
}

/* Toggle */
.toggle-row {
  text-align: center;
  font-size: 12.5px;
  font-weight: 700;
  color: #A16207;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
.toggle-btn {
  border: none;
  background: none;
  font-family: 'Nunito', sans-serif;
  font-weight: 900;
  font-size: 12.5px;
  color: #D97706;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  transition: color .15s;
}
.toggle-btn:hover { color: #92400E }

@media (max-width: 440px) {
  .login-card { padding: 32px 22px 26px; border-radius: 22px }
  .brand-name { font-size: 32px }
}
</style>
