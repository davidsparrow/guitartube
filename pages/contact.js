// pages/contact.js - Contact page based on mobile-clean layout
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { LuBrain } from 'react-icons/lu'
import { IoMdPower } from 'react-icons/io'
import { PiHamburger, PiCurrencyCircleDollar } from 'react-icons/pi'
import styles from '../styles/mobile-clean.module.css'
import AuthModal from '../components/AuthModal'
import MenuModal from '../components/MenuModal'
import SupportModal from '../components/SupportModal'

export default function ContactPage() {
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  // Local contact form state
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setStatus(null)
    
    console.log('Submitting contact form:', form)
    
    try {
      const res = await fetch('/api/support/contact-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      
      console.log('Contact API response:', { status: res.status, ok: res.ok })
      
      const json = await res.json()
      console.log('Contact API response data:', json)
      
      if (res.ok && json.success) {
        setStatus('success')
        setForm({ name: '', email: '', subject: '', message: '' })
        // Auto-hide success message after 5 seconds
        setTimeout(() => setStatus(null), 5000)
      } else {
        setStatus('error')
        console.error('Contact form error:', json)
      }
    } catch (err) {
      console.error('Contact form fetch error:', err)
      setStatus('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link href="/?home=true" className="hover:opacity-80 transition-opacity">
              <img src="/images/gt_logoM_PlayButton.png" alt="VideoFlip Logo" style={{ height: 32, width: 'auto' }} />
            </Link>
          </div>
          <div className={styles.headerRight}>
            <button onClick={() => router.push('/features')} className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors" title="GuitarTube Features">
              <LuBrain className="w-5 h-5" />
            </button>
            <button onClick={() => router.push('/pricing')} className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors" title="I want my GTV!">
              <PiCurrencyCircleDollar className="w-6 h-6" />
            </button>
            <button onClick={() => setShowAuthModal(true)} className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors" title="Auth">
              <IoMdPower className="w-5 h-5" />
            </button>
            <button onClick={() => setShowMenuModal(true)} className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors" title="Menu">
              <PiHamburger className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content area with contact form */}
      <main className={`${styles.main} ${styles.scrollMain}`}>
        <div className={styles.logoBlock}>
          <h1 className={styles.subtitle} style={{ marginBottom: 16 }}>Contact Us</h1>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4" style={{ zIndex: 10 }}>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors"
            placeholder="Your name"
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors"
            placeholder="your@email.com"
          />
          <input
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors"
            placeholder="What can we help with?"
          />
          <div>
            <label className="block text-sm text-gray-400 mb-2">Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors resize-none"
              placeholder="Tell us more..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-500 text-black py-3 px-4 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
          {status === 'success' && (
            <div className="text-green-400 text-center text-sm">✓ Message sent! We'll get back to you soon.</div>
          )}
          {status === 'error' && (
            <div className="text-red-400 text-center text-sm">✗ Something went wrong. Please try again.</div>
          )}
        </form>

        <div style={{ marginTop: 16, color: '#ccc', fontSize: 12 }}>
          You can also <a href="mailto:support@guitartube.net" className="underline hover:text-white">Email Us</a>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={`${styles.footerLinks} flex justify-center items-center space-x-3 text-white/60 text-xs`} style={{ fontFamily: 'Futura, sans-serif' }}>
          <span>© 2025 GuitarTube</span>
          <a href="/contact" className="hover:text-white transition-colors underline">contact</a>
          <a href="/terms" className="hover:text-white transition-colors underline">terms</a>
          <a href="/privacy" className="hover:text-white transition-colors underline">privacy</a>
        </div>
        <div className="text-white text-xs">Made with 🎸 in Millhatten, CA</div>
      </footer>

      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      <MenuModal 
        isOpen={showMenuModal} 
        onClose={() => setShowMenuModal(false)} 
      />
      <SupportModal 
        isOpen={showSupportModal} 
        onClose={() => setShowSupportModal(false)} 
      />
    </div>
  )
}


