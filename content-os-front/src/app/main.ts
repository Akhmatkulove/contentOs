import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { installSessionInterceptor } from './router/access'
import './styles/tailwind.css'
import './styles/main.scss'

const app = createApp(App).use(createPinia())
installSessionInterceptor(router)
app.use(router).mount('#app')
