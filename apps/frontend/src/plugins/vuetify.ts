import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          background: '#F9FAFB',
          primary: '#4F46E5',
          secondary: '#10B981',
        },
      },
      dark: {
        colors: {
          background: '#F9FAFB',
          primary: '#4F46E5',
          secondary: '#10B981',
        },
      },
    },
  },
  defaults: {
    global: {
      style: 'font-family: Inter, sans-serif',
    },
  },
})
