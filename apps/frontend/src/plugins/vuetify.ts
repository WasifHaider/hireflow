import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#4F46E5',
          secondary: '#10B981',
        },
      },
      dark: {
        colors: {
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
