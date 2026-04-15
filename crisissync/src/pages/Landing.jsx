import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <div className="dark bg-surface text-on-surface font-body selection:bg-primary/30 min-h-screen">
            {/* Header Section */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl">
                <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
                    <div className="text-xl font-bold tracking-tighter text-slate-50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
                        CrisisSync
                    </div>
                    <div className="hidden md:flex gap-8 items-center">
                        <a className="font-['Inter'] text-sm font-medium tracking-wide text-slate-400 hover:text-slate-100 transition-all duration-300 ease-in-out" href="#features">Features</a>
                        <a className="font-['Inter'] text-sm font-medium tracking-wide text-slate-400 hover:text-slate-100 transition-all duration-300 ease-in-out" href="#how-it-works">How It Works</a>
                        <a className="font-['Inter'] text-sm font-medium tracking-wide text-slate-400 hover:text-slate-100 transition-all duration-300 ease-in-out" href="#emergency-types">Emergency Types</a>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Link to="/login" className="px-5 py-2 rounded-xl text-sm font-medium text-primary border border-primary/20 hover:bg-primary/10 transition-all duration-300">Login</Link>
                        <Link to="/signup" className="px-5 py-2 rounded-xl text-sm font-medium bg-error-container text-on-error-container sos-glow hover:scale-105 active:scale-95 transition-all duration-300">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-slate-950 to-surface min-h-[921px] flex flex-col justify-center">
                <div className="max-w-7xl mx-auto px-8 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-tertiary-fixed text-on-tertiary-fixed-variant shadow-lg shadow-tertiary/10">
                            One Tap. Every Responder. Zero Delay.
                        </span>
                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter leading-[1.1] text-on-surface">
                            Emergency Response at the Speed of a Tap
                        </h1>
                        <p className="text-xl text-on-surface-variant max-w-xl leading-relaxed">
                            CrisisSync connects hotel guests, staff, and admins in one unified emergency platform, alerting responders in under 2 seconds.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link to="/signup" className="px-8 py-4 rounded-xl text-lg font-bold bg-error text-on-error flex items-center gap-3 hover:scale-105 transition-transform sos-glow">
                                <span className="material-symbols-outlined">luggage</span>
                                I’m a Guest
                            </Link>
                            <Link to="/login" className="px-8 py-4 rounded-xl text-lg font-bold text-on-surface border border-outline-variant hover:bg-surface-bright transition-colors">
                                <span className="material-symbols-outlined mr-2">hotel</span>
                                Admin / Staff Login
                            </Link>
                        </div>
                    </div>
                    <div className="relative flex justify-center items-center py-20 lg:py-0">
                        <div className="absolute w-[300px] h-[300px] bg-error/20 rounded-full blur-[100px]"></div>
                        <div className="relative z-10 w-64 h-64 bg-surface-container-highest rounded-full flex items-center justify-center shadow-2xl border border-error/30 group">
                            <div className="absolute inset-0 rounded-full border-4 border-error/40 animate-ripple"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-error/20 animate-ripple" style={{ animationDelay: '0.6s' }}></div>
                            <div className="absolute inset-0 rounded-full border-4 border-error/10 animate-ripple" style={{ animationDelay: '1.2s' }}></div>
                            <span className="text-8xl select-none group-hover:scale-110 transition-transform">🆘</span>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-surface-container-low to-transparent"></div>
            </header>

            {/* How It Works */}
            <section className="py-24 bg-surface-container-low" id="how-it-works">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mb-4">How CrisisSync Works</h2>
                        <p className="text-on-surface-variant max-w-2xl mx-auto">Seamless synchronization from the first touchpoint to the final resolution.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Card 01 */}
                        <div className="group p-8 rounded-3xl bg-surface-container-high hover:bg-surface-bright transition-all duration-500 hover:-translate-y-2">
                            <div className="flex justify-between items-start mb-12">
                                <span className="text-5xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">01</span>
                                <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-3xl">touch_app</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-on-surface">Guest Taps SOS</h3>
                            <p className="text-on-surface-variant leading-relaxed">Guests trigger an alert through their room key, smartphone, or dedicated SOS kiosk instantly.</p>
                        </div>
                        {/* Card 02 */}
                        <div className="group p-8 rounded-3xl bg-surface-container-high hover:bg-surface-bright transition-all duration-500 hover:-translate-y-2">
                            <div className="flex justify-between items-start mb-12">
                                <span className="text-5xl font-black text-secondary/10 group-hover:text-secondary/20 transition-colors">02</span>
                                <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-secondary">
                                    <span className="material-symbols-outlined text-3xl">dashboard</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-on-surface">Dashboard Activates Instantly</h3>
                            <p className="text-on-surface-variant leading-relaxed">Central command screens pulse red, showing exact location data and guest medical profiles.</p>
                        </div>
                        {/* Card 03 */}
                        <div className="group p-8 rounded-3xl bg-surface-container-high hover:bg-surface-bright transition-all duration-500 hover:-translate-y-2">
                            <div className="flex justify-between items-start mb-12">
                                <span className="text-5xl font-black text-tertiary/10 group-hover:text-tertiary/20 transition-colors">03</span>
                                <div className="w-14 h-14 rounded-2xl bg-tertiary-container flex items-center justify-center text-tertiary">
                                    <span className="material-symbols-outlined text-3xl">support_agent</span>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-on-surface">Staff Responds in Real-Time</h3>
                            <p className="text-on-surface-variant leading-relaxed">Nearest security and medical teams receive haptic alerts and route maps to the incident.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Bento Grid */}
            <section className="py-24 bg-surface" id="features">
                <div className="max-w-7xl mx-auto px-8">
                    <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mb-16 text-center">Unified Command Architecture</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-3xl bg-surface-container border-l-4 border-error hover:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-error mb-6 block text-4xl">notification_important</span>
                            <h4 className="text-xl font-bold text-on-surface mb-2">Instant SOS Alerts</h4>
                            <p className="text-on-surface-variant text-sm leading-relaxed">Global hotel-wide broadcast within 2 seconds of detection.</p>
                        </div>
                        {/* Feature 2 */}
                        <div className="p-8 rounded-3xl bg-surface-container border-l-4 border-tertiary hover:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-tertiary mb-6 block text-4xl">palette</span>
                            <h4 className="text-xl font-bold text-on-surface mb-2">Color-Coded Emergencies</h4>
                            <p className="text-on-surface-variant text-sm leading-relaxed">Instantly recognize the nature of the crisis via unified lighting.</p>
                        </div>
                        {/* Feature 3 */}
                        <div className="p-8 rounded-3xl bg-surface-container border-l-4 border-primary hover:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-primary mb-6 block text-4xl">chat_bubble</span>
                            <h4 className="text-xl font-bold text-on-surface mb-2">Live Incident Chat</h4>
                            <p className="text-on-surface-variant text-sm leading-relaxed">Direct messaging between victims and responders for reassurance.</p>
                        </div>
                        {/* Feature 4 */}
                        <div className="p-8 rounded-3xl bg-surface-container border-l-4 border-secondary hover:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-secondary mb-6 block text-4xl">call</span>
                            <h4 className="text-xl font-bold text-on-surface mb-2">Emergency Voice Calls</h4>
                            <p className="text-on-surface-variant text-sm leading-relaxed">Priority VOIP channels that bypass busy hotel switchboards.</p>
                        </div>
                        {/* Feature 5 */}
                        <div className="p-8 rounded-3xl bg-surface-container border-l-4 border-[#8b5cf6] hover:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-[#8b5cf6] mb-6 block text-4xl">smart_toy</span>
                            <h4 className="text-xl font-bold text-on-surface mb-2">AI Safety Chatbot</h4>
                            <p className="text-on-surface-variant text-sm leading-relaxed">Automated triage that provides immediate first-aid instructions.</p>
                        </div>
                        {/* Feature 6 */}
                        <div className="p-8 rounded-3xl bg-surface-container border-l-4 border-[#2dd4bf] hover:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-[#2dd4bf] mb-6 block text-4xl">history</span>
                            <h4 className="text-xl font-bold text-on-surface mb-2">Full Incident Audit Trail</h4>
                            <p className="text-on-surface-variant text-sm leading-relaxed">Comprehensive logging of every action for post-crisis reporting.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Emergency Color Guide */}
            <section className="py-24 bg-surface-container-lowest" id="emergency-types">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div>
                            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mb-4">Emergency Color Guide</h2>
                            <p className="text-on-surface-variant max-w-xl">Universal visual standards ensure that response is intuitive even when communication fails.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-1 w-24 bg-error rounded-full"></div>
                            <div className="h-1 w-12 bg-secondary rounded-full"></div>
                            <div className="h-1 w-12 bg-primary rounded-full"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Fire */}
                        <div className="bg-surface-container-low p-6 rounded-2xl border-b-4 border-error hover:bg-surface-container transition-all group">
                            <div className="flex justify-between items-center mb-4">
                                <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(255,180,171,0.2)]">Level 1</span>
                                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                            </div>
                            <h4 className="text-2xl font-bold text-error mb-2">FIRE</h4>
                            <p className="text-sm text-on-surface-variant">Evacuation protocols, fire system activation, and room containment status.</p>
                        </div>
                        {/* Medical */}
                        <div className="bg-surface-container-low p-6 rounded-2xl border-b-4 border-secondary hover:bg-surface-container transition-all group">
                            <div className="flex justify-between items-center mb-4">
                                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(132,214,185,0.2)]">Priority</span>
                                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
                            </div>
                            <h4 className="text-2xl font-bold text-secondary mb-2">MEDICAL</h4>
                            <p className="text-sm text-on-surface-variant">AED locations, first responder dispatch, and allergy profiles.</p>
                        </div>
                        {/* Security */}
                        <div className="bg-surface-container-low p-6 rounded-2xl border-b-4 border-[#a78bfa] hover:bg-surface-container transition-all group">
                            <div className="flex justify-between items-center mb-4">
                                <span className="px-3 py-1 bg-[#4c1d95] text-[#ddd6fe] text-[10px] font-black uppercase tracking-widest rounded-full">Tactical</span>
                                <span className="material-symbols-outlined text-[#a78bfa]" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                            </div>
                            <h4 className="text-2xl font-bold text-[#a78bfa] mb-2">SECURITY</h4>
                            <p className="text-sm text-on-surface-variant">Intruder alerts, lockdown procedures, and live CCTV feed integration.</p>
                        </div>
                        {/* Common */}
                        <div className="bg-surface-container-low p-6 rounded-2xl border-b-4 border-tertiary hover:bg-surface-container transition-all group">
                            <div className="flex justify-between items-center mb-4">
                                <span className="px-3 py-1 bg-tertiary-container text-on-tertiary-container text-[10px] font-black uppercase tracking-widest rounded-full">Standard</span>
                                <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                            </div>
                            <h4 className="text-2xl font-bold text-tertiary mb-2">COMMON</h4>
                            <p className="text-sm text-on-surface-variant">Maintenance issues, elevator failures, and guest distress signals.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-24 bg-on-surface-variant/5">
                <div className="max-w-7xl mx-auto px-8 text-center">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="space-y-2">
                            <div className="text-7xl font-black text-error tracking-tighter leading-none">&lt;2s</div>
                            <div className="text-on-surface-variant uppercase text-xs font-bold tracking-widest">Alert Delivery Time</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-7xl font-black text-error tracking-tighter leading-none">3</div>
                            <div className="text-on-surface-variant uppercase text-xs font-bold tracking-widest">Unified Stakeholder Roles</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-7xl font-black text-error tracking-tighter leading-none">₹0</div>
                            <div className="text-on-surface-variant uppercase text-xs font-bold tracking-widest">Setup Cost for Guests</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 text-slate-500 pt-20 pb-10 border-t border-tertiary/20">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-1">
                            <div className="text-2xl font-black text-slate-100 mb-6 tracking-tighter">CrisisSync</div>
                            <p className="text-sm leading-relaxed mb-6">Empowering hotels with the world's most responsive emergency synchronization platform.</p>
                            <div className="flex gap-4">
                                <a className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-slate-300 hover:text-primary transition-colors" href="#">
                                    <span className="material-symbols-outlined">share</span>
                                </a>
                                <a className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-slate-300 hover:text-primary transition-colors" href="#">
                                    <span className="material-symbols-outlined">hub</span>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h5 className="text-slate-100 font-bold mb-6">Platform</h5>
                            <ul className="space-y-4 text-sm">
                                <li><a className="hover:text-blue-400 transition-colors" href="#">Features</a></li>
                                <li><a className="hover:text-blue-400 transition-colors" href="#">How It Works</a></li>
                                <li><a className="hover:text-blue-400 transition-colors" href="#">Security Standards</a></li>
                                <li><a className="hover:text-blue-400 transition-colors" href="#">Case Studies</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-slate-100 font-bold mb-6">Company</h5>
                            <ul className="space-y-4 text-sm">
                                <li><a className="hover:text-blue-400 transition-colors" href="#">About Us</a></li>
                                <li><a className="hover:text-blue-400 transition-colors" href="#">Contact Support</a></li>
                                <li><a className="hover:text-blue-400 transition-colors" href="#">Privacy Policy</a></li>
                                <li><a className="hover:text-blue-400 transition-colors" href="#">Press Kit</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-slate-100 font-bold mb-6">Contact</h5>
                            <ul className="space-y-4 text-sm">
                                <li className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-tertiary">mail</span>
                                    emergency@crisissync.io
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-tertiary">location_on</span>
                                    Tech Hub, Bangalore
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-xs">© 2024 CrisisSync. All rights reserved.</p>
                        <div className="bg-tertiary/10 border border-tertiary/20 px-4 py-2 rounded-lg text-[10px] text-tertiary font-bold tracking-wider max-w-lg text-center md:text-right uppercase">
                            EMERGENCY DISCLAIMER: THIS SYSTEM IS A SUPPLEMENTAL TOOL AND DOES NOT REPLACE DIRECT CONTACT WITH LOCAL EMERGENCY SERVICES (911/112).
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

