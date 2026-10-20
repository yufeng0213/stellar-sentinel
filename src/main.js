import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { play, unlockAudio } from './audio.js'
import './style.css'

document.addEventListener('pointerdown', unlockAudio, { passive: true })
document.addEventListener('click', (event) => {
  const target = event.target instanceof Element
    ? event.target.closest('button, a, [role="button"]')
    : null
  if (!target || target.disabled || target.dataset.sound === 'none') return
  play('tap')
})

createApp(App).use(createPinia()).use(router).mount('#app')
