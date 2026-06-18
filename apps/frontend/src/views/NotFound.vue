<template>
  <div class="not-found">
    <div class="logo">
      <div class="logo-mark">H</div>
      <span class="logo-text">HireFlow</span>
    </div>
    <div class="code">404</div>
    <h1 class="title">Page not found</h1>
    <p class="sub">The page you're looking for doesn't exist or has been moved.</p>
    <button class="btn-home" @click="router.push('/dashboard')">Go to dashboard</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.not-found {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #F9FAFB;
  font-family: 'Inter', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  padding: 40px;
  text-align: center;
}
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}
.logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #4F46E5;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 700;
  font-size: 13px;
}
.logo-text { font-size: 15px; font-weight: 600; color: #111827; }
.code { font-size: 72px; font-weight: 700; color: #E5E7EB; letter-spacing: -0.04em; line-height: 1; }
.title { margin: 4px 0 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.02em; }
.sub { margin: 4px 0 0; font-size: 14px; color: #6B7280; }
.btn-home {
  margin-top: 12px;
  height: 40px;
  padding: 0 20px;
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 8px;
  font: 500 14px 'Inter', sans-serif;
  cursor: pointer;
}
.btn-home:hover { background: #4338CA; }
</style>
