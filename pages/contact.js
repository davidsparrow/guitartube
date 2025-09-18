// pages/contact.js - Contact page based on mobile-clean layout
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import styles from '../styles/mobile-clean.module.css'
import AuthModal from '../components/AuthModal'
import MenuModal from '../components/MenuModal'
import SupportModal from '../components/SupportModal'
import Header from '../components/Header'

export default function ContactPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  // Local contact form state
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)
  const [showEmail, setShowEmail] = useState(false)

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
      {/* Header Component */}
      <Header 
        showBrainIcon={true}
        showSearchIcon={false}
        onAuthClick={() => setShowAuthModal(true)}
        onMenuClick={() => setShowMenuModal(true)}
        isAuthenticated={isAuthenticated}
      />

      {/* Main content area with contact form */}
      <main className={`${styles.main} ${styles.scrollMain} md:pt-16`}>
        <div className={`${styles.logoBlock} md:pt-16`}>
          <h1 className="text-3xl font-bold text-yellow-400 mb-2" style={{ fontFamily: 'Futura, sans-serif' }}>Contact Us Today!</h1>
          <h2 className={styles.subtitle} style={{ marginBottom: 16 }}>Or...tomorrow could be better.</h2>
        </div>

        <div className="text-gray-300 text-xs leading-relaxed mb-6 max-w-md px-5 md:px-0" style={{ fontFamily: 'Futura, sans-serif' }}>
          <p className="mb-3 font-normal">
            Trouble tuning up? Looking for fatter Tone?* Wondering how we do what we do like a wild voodoo child? Don't go smashing your{' '}
            <a href="https://www.youtube.com/watch?v=_diKw9F6t3U" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 underline">
              perfectly good guitar
            </a>
            . Just press Send on a message here. Then go smash your guitar in a good way.
          </p>
          
          <p className="mb-3 font-normal">
            We will get back to guit, err, back to You during normal chord sha, err, normal business days and hours. Early mornings are not good, so don't expect much of that. Fridays are right out.
          </p>
          
          <p className="text-xs text-gray-400 italic font-normal">
            *Jimi/Stevie method: HEAVY-ass strings, downtune 1/2 step, play really LOUD (natural distortion), AND add 2 lifetimes of practice.
          </p>
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
          <button 
            onClick={() => setShowEmail(!showEmail)}
            className="underline hover:text-white bg-transparent border-none p-0 cursor-pointer"
          >
            Hate forms?
          </button>
          {showEmail && (
            <div style={{ marginTop: 8, color: '#fff', fontSize: 14, fontFamily: 'monospace' }}>
              support@guitartube.net
            </div>
          )}
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


