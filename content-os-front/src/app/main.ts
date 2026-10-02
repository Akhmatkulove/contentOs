import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { installQuery } from './query'
import { router } from './router'
import { installSessionInterceptor } from './router/access'
import './styles/tailwind.css'
import './styles/main.scss'

const app = createApp(App).use(createPinia())
installQuery(app)
installSessionInterceptor(router)
app.use(router).mount('#app')
