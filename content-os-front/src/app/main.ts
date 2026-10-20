import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { installQuery } from './query'
import { router } from './router'
import { installSessionInterceptor } from './router/access'
import { installChunkReload } from './router/chunk-reload'
import './styles/tailwind.css'

const app = createApp(App).use(createPinia())
installQuery(app)
installSessionInterceptor(router)
installChunkReload(router)
app.use(router).mount('#app')
