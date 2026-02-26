import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.classList.toggle('light', !isDark)
  }, [isDark])

  return (
    <div className="grain-overlay" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-nav)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-primary)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
              }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: "'Instrument Serif', serif" }}>A</span>
              </div>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '18px', letterSpacing: '-0.02em' }}>
                Atelier<span style={{ color: 'var(--text-accent)' }}>Code</span>
              </span>
            </a>

            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <a href="#features" className="accent-underline" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>Features</a>
              <a href="#how-it-works" className="accent-underline" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>How it Works</a>
              <a href="#pricing" className="accent-underline" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}>Pricing</a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Mobile hamburger */}
              <button
                className="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                style={{
                  display: 'none', background: 'none', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px'
                }}
              >
                {mobileMenuOpen ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                )}
              </button>
              <button
                onClick={() => setIsDark(!isDark)}
                aria-label="Toggle theme"
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                  borderRadius: '8px', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
                }}
              >
                {isDark ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
              <a
                href="https://git.unveiledsoftwaresolutions.com/jariah/ateliercode"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                  transition: 'color 0.2s'
                }}
              >
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              </a>
              <a
                href="#download"
                style={{
                  padding: '8px 20px', background: 'var(--accent)', color: '#fff',
                  borderRadius: '8px', fontWeight: 600, fontSize: '14px',
                  textDecoration: 'none', transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-accent)'
                }}
              >
                Download
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu" style={{
          position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 49,
          background: 'var(--bg-nav)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-primary)',
          padding: '16px 24px', display: 'none',
          flexDirection: 'column', gap: '12px'
        }}>
          <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px', fontWeight: 500, padding: '8px 0' }}>Features</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px', fontWeight: 500, padding: '8px 0' }}>How it Works</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '15px', fontWeight: 500, padding: '8px 0' }}>Pricing</a>
        </div>
      )}

      {/* Hero Section */}
      <section style={{ paddingTop: '140px', paddingBottom: '80px', padding: '140px 24px 80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <div className="animate-fade-in-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '100px',
            background: 'var(--badge-bg)', border: '1px solid var(--badge-border)',
            marginBottom: '32px'
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--badge-dot)', animation: 'pulse-glow 2s infinite'
            }} />
            <span style={{ color: 'var(--badge-text)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
              Now in Beta
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up stagger-1" style={{
            fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
            fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.035em',
            marginBottom: '24px', color: 'var(--text-primary)'
          }}>
            Your dev machines,{' '}
            <span className="font-serif" style={{
              fontStyle: 'italic', color: 'var(--text-accent)',
              fontWeight: 400
            }}>
              everywhere
            </span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-in-up stagger-2" style={{
            fontSize: '18px', lineHeight: 1.7, color: 'var(--text-secondary)',
            maxWidth: '560px', margin: '0 auto 40px'
          }}>
            AtelierCode connects your development machines with secure peer-to-peer WebRTC.
            Access projects, chat with AI agents, and edit code from any device.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in-up stagger-3" style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px',
            marginBottom: '72px'
          }}>
            <a href="#download" style={{
              padding: '14px 32px', background: 'var(--accent)',
              color: '#fff', borderRadius: '10px', fontWeight: 600,
              fontSize: '16px', textDecoration: 'none',
              boxShadow: 'var(--shadow-accent)',
              transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
            }}>
              Download for Free
            </a>
            <a href="https://app.ateliercode.dev" style={{
              padding: '14px 32px',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              borderRadius: '10px', fontWeight: 600, fontSize: '16px',
              textDecoration: 'none', border: '1px solid var(--border-primary)',
              transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
            }}>
              Open in Browser
            </a>
          </div>

          {/* Hero Mock UI */}
          <div className="animate-fade-in-up stagger-4" style={{
            background: 'var(--bg-hero-mock)',
            borderRadius: '16px', border: '1px solid var(--border-primary)',
            padding: '16px', boxShadow: 'var(--shadow-lg)',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Fade overlay at bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
              background: `linear-gradient(to top, var(--bg-primary), transparent)`,
              zIndex: 5, pointerEvents: 'none'
            }} />

            {/* Window chrome */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
              <span className="font-mono" style={{ marginLeft: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                AtelierCode
              </span>
            </div>

            {/* Mock layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '12px' }}>
              {/* Sidebar */}
              <div style={{
                background: 'var(--bg-mock-inner)', borderRadius: '10px', padding: '16px',
                textAlign: 'left'
              }}>
                <div className="font-mono" style={{
                  fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500
                }}>
                  Machines
                </div>
                {[
                  { name: 'Desktop PC', online: true, active: true },
                  { name: 'MacBook Pro', online: true, active: false },
                  { name: 'Home Server', online: false, active: false },
                ].map((m) => (
                  <div key={m.name} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: '6px', marginBottom: '4px',
                    background: m.active ? 'var(--accent-glow)' : 'transparent',
                    border: m.active ? '1px solid var(--border-accent)' : '1px solid transparent',
                    cursor: 'pointer'
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: m.online ? 'var(--accent)' : 'var(--text-muted)',
                      flexShrink: 0
                    }} />
                    <span style={{
                      fontSize: '13px', fontWeight: m.active ? 600 : 400,
                      color: m.active ? 'var(--text-primary)' : (m.online ? 'var(--text-secondary)' : 'var(--text-muted)')
                    }}>
                      {m.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div style={{
                background: 'var(--bg-mock-inner)', borderRadius: '10px', padding: '16px',
                textAlign: 'left'
              }}>
                <div className="font-mono" style={{
                  fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 500
                }}>
                  Projects on Desktop PC
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { name: 'ateliercode', time: '2 min ago' },
                    { name: 'my-saas-app', time: '1 hour ago' },
                    { name: 'portfolio', time: '3 hours ago' },
                    { name: 'api-server', time: 'Yesterday' },
                  ].map((p) => (
                    <div key={p.name} style={{
                      padding: '12px', borderRadius: '8px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <span className="font-mono" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '80px 24px', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 700, letterSpacing: '-0.03em',
              marginBottom: '16px', color: 'var(--text-primary)'
            }}>
              Built for developers who{' '}
              <span className="font-serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--text-accent)' }}>
                work everywhere
              </span>
            </h2>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
              A seamless development experience whether you're at your desk or on the go.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {[
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                title: "Multi-Agent AI Chat",
                desc: "Chat with Claude, Gemini, and other AI coding agents. History syncs across all your machines."
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
                title: "Peer-to-Peer Connection",
                desc: "Direct WebRTC connections between your machines. End-to-end encrypted. Data never touches our servers."
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>,
                title: "Local-First Storage",
                desc: "Projects and data stay on your machines. Access them remotely without uploading to any cloud."
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
                title: "Secure by Design",
                desc: "DTLS encryption for all peer connections. Keycloak authentication. Your code stays private."
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                title: "Native Performance",
                desc: "Built with Tauri and Rust for a lightweight, blazing-fast experience. Under 20MB on disk."
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
                title: "Full Web Access",
                desc: "No app installed? Access your machines from any browser. Full functionality, anywhere."
              }
            ].map((feature, i) => (
              <div key={i} className="card-hover" style={{
                padding: '28px', borderRadius: '14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                cursor: 'default'
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: 'var(--accent-glow)', color: 'var(--text-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 700, letterSpacing: '-0.03em',
              marginBottom: '16px', color: 'var(--text-primary)'
            }}>
              Up and running in{' '}
              <span className="font-serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--text-accent)' }}>
                minutes
              </span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {[
              {
                step: "01",
                title: "Install on your machines",
                desc: "Download AtelierCode on each machine you want to connect. Available for Windows, macOS, and Linux."
              },
              {
                step: "02",
                title: "Sign in and connect",
                desc: "Create an account through our secure Keycloak authentication. Your machines automatically discover each other."
              },
              {
                step: "03",
                title: "Start coding from anywhere",
                desc: "Select any machine to access its projects. Chat with AI agents, edit files, and run commands — all through a direct P2P connection."
              }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                <div className="font-mono" style={{
                  fontSize: '48px', fontWeight: 700, lineHeight: 1,
                  color: 'var(--step-number)', flexShrink: 0, width: '72px',
                  textAlign: 'right', letterSpacing: '-0.05em'
                }}>
                  {item.step}
                </div>
                <div style={{ paddingTop: '4px' }}>
                  <h3 style={{
                    fontSize: '20px', fontWeight: 600,
                    marginBottom: '8px', letterSpacing: '-0.01em',
                    color: 'var(--text-primary)'
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: '480px' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 24px', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 700, letterSpacing: '-0.03em',
              marginBottom: '16px', color: 'var(--text-primary)'
            }}>
              Simple,{' '}
              <span className="font-serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--text-accent)' }}>
                transparent
              </span>{' '}
              pricing
            </h2>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Start for free. Upgrade when you need more.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Free tier */}
            <div className="card-hover" style={{
              padding: '36px', borderRadius: '16px',
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)'
            }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Free</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>For individual developers</p>
              </div>
              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>$0</span>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', marginLeft: '4px' }}>/month</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {["Up to 3 machines", "Unlimited projects", "AI chat integration", "P2P file access", "Community support"].map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--check-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#download" style={{
                display: 'block', textAlign: 'center', padding: '12px 24px',
                borderRadius: '10px', fontWeight: 600, fontSize: '15px',
                textDecoration: 'none', border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)', background: 'var(--bg-primary)',
                transition: 'all 0.2s'
              }}>
                Get Started
              </a>
            </div>

            {/* Pro tier */}
            <div className="card-hover" style={{
              padding: '36px', borderRadius: '16px',
              background: 'var(--bg-pro-card)', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute', top: '16px', right: '16px',
                padding: '4px 12px', borderRadius: '100px',
                background: 'rgba(255,255,255,0.2)', color: '#fff',
                fontSize: '12px', fontWeight: 600
              }}>
                Popular
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px', color: '#fff' }}>Pro</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>For power users</p>
              </div>
              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff' }}>$12</span>
                <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginLeft: '4px' }}>/month</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {["Unlimited machines", "Priority TURN servers", "Team collaboration", "Advanced security", "Priority support", "Early access to features"].map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#download" style={{
                display: 'block', textAlign: 'center', padding: '12px 24px',
                borderRadius: '10px', fontWeight: 600, fontSize: '15px',
                textDecoration: 'none', background: '#fff', color: '#b45309',
                transition: 'all 0.2s'
              }}>
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section id="download" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: 700, letterSpacing: '-0.03em',
            marginBottom: '16px', color: 'var(--text-primary)'
          }}>
            Ready to code from{' '}
            <span className="font-serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--text-accent)' }}>
              anywhere
            </span>
            ?
          </h2>
          <p style={{ fontSize: '17px', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.7 }}>
            Download AtelierCode and connect your first machine in under 5 minutes.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            {[
              {
                label: 'Windows',
                icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
              },
              {
                label: 'macOS',
                icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              },
              {
                label: 'Linux',
                icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.504 0c-.155 0-.311.001-.465.003-.658.008-1.308.067-1.945.182C8.779.422 7.546.94 6.457 1.687c-.36.247-.695.519-1.01.81-.315.29-.614.6-.893.929-.68.803-1.2 1.728-1.55 2.727-.177.507-.312 1.035-.4 1.576C2.514 8.271 2.471 8.823 2.471 9.38v5.24c0 .557.043 1.11.133 1.651.088.541.223 1.069.4 1.576.35.999.87 1.924 1.55 2.727.28.329.578.639.893.929.315.29.65.563 1.01.81 1.089.747 2.322 1.265 3.637 1.502.637.115 1.287.174 1.945.182.154.002.31.003.465.003h-.008.504c.155 0 .311-.001.465-.003.658-.008 1.308-.067 1.945-.182 1.315-.237 2.548-.755 3.637-1.502.36-.247.695-.519 1.01-.81.315-.29.614-.6.893-.929.68-.803 1.2-1.728 1.55-2.727.177-.507.312-1.035.4-1.576.09-.542.133-1.094.133-1.651V9.38c0-.557-.043-1.11-.133-1.651a7.077 7.077 0 0 0-.4-1.576c-.35-.999-.87-1.924-1.55-2.727a8.68 8.68 0 0 0-.893-.929 8.552 8.552 0 0 0-1.01-.81C16.274.94 15.041.422 13.726.185 13.089.07 12.439.011 11.781.003 11.626.001 11.47 0 11.315 0h.685.504z"/></svg>
              }
            ].map((platform) => (
              <a key={platform.label} href="#download" style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 28px', borderRadius: '10px',
                background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)', textDecoration: 'none',
                fontWeight: 600, fontSize: '15px', transition: 'all 0.2s',
                minWidth: '140px', justifyContent: 'center'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{platform.icon}</span>
                {platform.label}
              </a>
            ))}
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Or access from your browser at{' '}
            <a href="https://app.ateliercode.dev" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 500 }}>
              app.ateliercode.dev
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '48px 24px',
        background: 'var(--footer-bg)',
        borderTop: '1px solid var(--border-primary)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
            alignItems: 'center', gap: '24px'
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '7px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px', fontFamily: "'Instrument Serif', serif" }}>A</span>
              </div>
              <span style={{ color: 'var(--footer-text)', fontWeight: 600, fontSize: '16px' }}>AtelierCode</span>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '14px' }}>
              <a href="/privacy" style={{ color: 'var(--footer-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy</a>
              <a href="/terms" style={{ color: 'var(--footer-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>Terms</a>
              <a href="https://git.unveiledsoftwaresolutions.com/jariah/ateliercode" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--footer-muted)', textDecoration: 'none', transition: 'color 0.2s' }}>GitHub</a>
            </div>

            {/* Copyright */}
            <p style={{ fontSize: '13px', color: 'var(--footer-muted)' }}>
              &copy; {new Date().getFullYear()} AtelierCode. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
