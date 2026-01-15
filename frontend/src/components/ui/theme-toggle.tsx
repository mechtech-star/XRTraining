import React from 'react'
import { Button } from './button'
import { useTheme } from '../../lib/theme'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button variant="outline" onClick={toggleTheme} size="sm">
      {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </Button>
  )
}
