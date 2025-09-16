// pages/support.js - Support Modal Direct Link
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Support() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to index page with support modal open
    router.replace('/?support=true')
  }, [router])

  // Show loading while redirecting
  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
    </div>
  )
}
