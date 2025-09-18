// pages/mobile-clean.js - Clean mobile page: Header + Footer only
import Link from 'next/link'
import { useRouter } from 'next/router'
import { LuBrain } from 'react-icons/lu'
import { IoMdPower } from 'react-icons/io'
import { RiLogoutCircleRLine } from 'react-icons/ri'
import { FaHamburger } from 'react-icons/fa'
import styles from '../styles/mobile-clean.module.css'

export default function MobileClean() {
  const router = useRouter()

  return (
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
              onClick={() => router.push('/auth')}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              title="Auth"
            >
              <IoMdPower className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/features')}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              title="Menu"
            >
              <FaHamburger className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for where main content will go next step */}
      <div className={styles.mainSpacer} />

      {/* Footer fixed */}
      <footer className={styles.footer}>
        <button
          onClick={() => router.push('/pricing')}
          className="relative text-green-400 font-bold text-xl hover:text-green-300 transition-all duration-500 transform hover:scale-105 overflow-hidden group px-6 py-3 rounded-full"
          title="No credit card required to Join"
        >
          <span className="relative z-10 bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 bg-clip-text text-transparent animate-shine">
            STAY FREE
          </span>
          <img
            src="/images/no_credit_card2.png"
            alt="No Credit Card"
            className="inline-block ml-2 -mt-0.5 w-6 h-6"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-emerald-300/40 to-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm rounded-full"></div>
        </button>

        <div className="flex justify-center items-center space-x-3 text-white/60 text-xs" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <span>© 2025 GuitarTube</span>
          <a href="/terms" className="hover:text-white transition-colors underline">terms</a>
          <a href="/privacy" className="hover:text-white transition-colors underline">privacy</a>
        </div>
      </footer>
    </div>
  )
}


