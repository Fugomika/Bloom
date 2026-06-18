<script setup>
import { ref } from 'vue'
import { signIn, signUp } from '../../composables/useAuth.js'

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
      successMsg.value = 'Account created! Check your email to confirm, then sign in 💌'
      isSignUp.value = false
    } else {
      await signIn(email.value, password.value)
    }
  } catch (e) {
    errorMsg.value = e.message || 'Something went wrong, try again 🥲'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-bg">
    <span class="deco d1">🌸</span>
    <span class="deco d2">✨</span>
    <span class="deco d3">🌼</span>
    <span class="deco d4">💛</span>
    <span class="deco d5">🌻</span>
    <span class="deco d6">🍀</span>

    <div class="login-card">
      <div class="brand">
        <div class="brand-logo">🌻</div>
        <h1 class="brand-name">Bloom</h1>
        <p class="brand-sub">{{ isSignUp ? 'create your little space 🌱' : 'welcome back, sunshine 💛' }}</p>
      </div>

      <form @submit.prevent="submit" class="login-form">
        <div class="field">
          <span class="field-ico">✉️</span>
          <input
            type="email"
            v-model="email"
            placeholder="your email"
            required
            autocomplete="email"
          />
        </div>
        <div class="field">
          <span class="field-ico">🔒</span>
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
          <span v-if="submitting" class="spin">🌻</span>
          <span v-else>{{ isSignUp ? 'Create Account ✨' : 'Sign In 🌻' }}</span>
        </button>
      </form>

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

/* Floating decorations */
.deco {
  position: absolute;
  font-size: 28px;
  pointer-events: none;
  opacity: 0.55;
  animation: float 6s ease-in-out infinite;
  user-select: none;
}
.d1 { top: 8%;  left: 8%;  animation-delay: 0s;    animation-duration: 7s }
.d2 { top: 14%; right: 11%;animation-delay: 1s;    animation-duration: 5s; font-size: 20px }
.d3 { bottom: 18%; left: 14%; animation-delay: 2s;  animation-duration: 8s; font-size: 24px }
.d4 { top: 55%; right: 7%; animation-delay: 0.5s;  animation-duration: 6s; font-size: 22px }
.d5 { bottom: 8%; right: 18%; animation-delay: 3s;  animation-duration: 7s }
.d6 { top: 38%; left: 5%;  animation-delay: 1.5s;  animation-duration: 9s; font-size: 18px }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg) }
  50%       { transform: translateY(-18px) rotate(8deg) }
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
  font-size: 56px;
  display: block;
  margin-bottom: 6px;
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
.login-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px }

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
.field-ico { font-size: 16px; flex-shrink: 0 }
.field input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 13px 0;
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
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(251,191,36,.5);
}
.submit-btn:active:not(:disabled) { transform: translateY(0) }
.submit-btn:disabled { opacity: .65; cursor: default }

.spin { display: inline-block; animation: spinSun 1s linear infinite }
@keyframes spinSun { to { transform: rotate(360deg) } }

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
  .brand-logo { font-size: 48px }
  .brand-name { font-size: 32px }
}
</style>
