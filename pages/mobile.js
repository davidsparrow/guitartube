// pages/mobile-clean.js - Clean mobile page: Header + Footer only
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { LuBrain } from 'react-icons/lu'
import { PiCurrencyCircleDollar } from 'react-icons/pi'
import { IoMdPower } from 'react-icons/io'
import { RiLogoutCircleRLine } from 'react-icons/ri'
import { PiHamburger } from 'react-icons/pi'
import AuthModal from '../components/AuthModal'
import MenuModal from '../components/MenuModal'
import SupportModal from '../components/SupportModal'
import { useAuth } from '../contexts/AuthContext'
import styles from '../styles/mobile-clean.module.css'
import { FaTimes, FaSearch } from 'react-icons/fa'

export default function MobileClean() {
  const router = useRouter()
  const { isAuthenticated, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  return (
    <>
    <div className={styles.page}>
      {/* Header fixed */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link href="/?home=true" className="hover:opacity-80 transition-opacity">
              <img src="/images/gt_logoM_PlayButton.png" alt="VideoFlip Logo" style={{ height: 32, width: 'auto' }} />
            </Link>
          </div>
          <div className={styles.headerRight}>
            <button
              onClick={() => router.push('/features')}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              title="GuitarTube Features"
            >
              <LuBrain className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/pricing')}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              title="I want my GTV!"
            >
              <PiCurrencyCircleDollar className="w-6 h-6" />
            </button>
            {isAuthenticated ? (
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <RiLogoutCircleRLine className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                title="Sign In"
              >
                <IoMdPower className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowMenuModal(true)}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              title="Menu"
            >
              <PiHamburger className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content: Row 1 - Text Logo + Subtitle */}
      <main className={styles.main}>
        <div className={styles.logoBlock}>
          <img
            src="/images/gt_logo_wide_on_black_450x90.png"
            alt="GuitarTube"
            className={styles.logoImage}
          />
          <p className={styles.subtitle}>
            Press fast forward on your <br />
            Video Guitar Learning journey
          </p>
        </div>

        {/* Row 2 - Search */}
        <div className={styles.searchBlock}>
          <div className={styles.searchFieldContainer}>
            <input
              type="text"
              placeholder="How to learn guitar faster"
              className={styles.searchInput}
            />
            <button className={styles.clearBtn} aria-label="Clear">
              <FaTimes className="w-4 h-4" />
            </button>
            <button className={styles.searchBtn} aria-label="Search">
              <FaSearch className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* CTA block inside main, above footer */}
      <div className={styles.ctaBlock}>
        <button
          onClick={() => router.push('/pricing')}
          className={`${styles.stayFreeButton} relative text-green-400 font-bold hover:text-green-300 transition-all duration-500 transform hover:scale-105 overflow-hidden group rounded-full`}
          title="No credit card required to Join"
        >
          <span className="relative z-10 bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 bg-clip-text text-transparent animate-shine">
            STAY FREE
          </span>
          <img
            src="/images/no_credit_card2.png"
            alt="No Credit Card"
            className="inline-block ml-2 -mt-0.5"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-300/40 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm rounded-full"></div>
        </button>
      </div>

      {/* Footer fixed */}
      <footer className={styles.footer}>
        <div className={`${styles.footerLinks} flex justify-center items-center space-x-3 text-white/60 text-xs`} style={{ fontFamily: 'Futura, sans-serif' }}>
          <span>© 2025 GuitarTube</span>
          <a href="/contact" className="hover:text-white transition-colors underline">contact</a>
          <a href="/terms" className="hover:text-white transition-colors underline">terms</a>
          <a href="/privacy" className="hover:text-white transition-colors underline">privacy</a>
        </div>
        <div className="text-white text-xs">Made with 🎸 in Millhatten, CA</div>
      </footer>
    </div>

    {/* Auth Modal */}
    <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

    {/* Main Menu Modal + sub-modals hook */}
    <MenuModal
      isOpen={showMenuModal}
      onClose={() => setShowMenuModal(false)}
      onSupportClick={() => setShowSupportModal(true)}
    />

    {/* Support Modal (invoked from Menu Modal) */}
    <SupportModal
      isOpen={showSupportModal}
      onClose={() => setShowSupportModal(false)}
    />
    </>
  )
}


