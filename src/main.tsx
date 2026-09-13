import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

async function bootstrap() {
  // mock 模式是唯一感知 MSW 的地方；业务代码照常走 axios。
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap()
