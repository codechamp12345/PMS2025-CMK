import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  // Admin functionality
  const [isAdmin, setIsAdmin] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    // Test API connection instead of direct Supabase
    const testAPIConnection = async () => {
      try {
        console.log('Testing API connection...');
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pms2025-cmk.onrender.com';
        const response = await axios.get(`${backendUrl}/api/admin/contacts`);
        if (response.data.success) {
          console.log('API connection successful');
        } else {
          console.error('API connection failed:', response.data.message);
        }
      } catch (error) {
        console.error('API connection error:', error.message);
      }
    };
    testAPIConnection();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser.role === 'hod' && currentUser.userId) {
        setIsAdmin(true);
        loadContacts(currentUser.userId);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    }
  };

  const loadContacts = async (userId) => {
    setLoadingContacts(true);
    try {
      console.log('Loading contacts for admin via API...');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pms2025-cmk.onrender.com';
      const response = await axios.get(`${backendUrl}/api/admin/contacts`);

      if (response.data.success) {
        console.log('Contacts loaded successfully via API:', response.data.data?.length || 0);
        setContacts(response.data.data || []);
      } else {
        console.error('API returned error for contacts:', response.data);
        showToast('error', response.data.message || 'Failed to load contacts');
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts via API:', error);
      if (error.response) {
        showToast('error', error.response.data.message || 'Failed to load contacts');
      } else if (error.request) {
        showToast('error', 'Network error - please check if the server is running');
      } else {
        showToast('error', 'Failed to load contacts');
      }
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!message.trim()) e.message = 'Message is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      console.log('Submitting contact form via API:', { name, email, message });
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://pms2025-cmk.onrender.com';
      const response = await axios.post(`${backendUrl}/api/contact`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim()
      });

      if (response.data.success) {
        console.log('Contact form submitted successfully via API:', response.data);
        setName(''); setEmail(''); setMessage('');
        showToast('success', 'Message sent successfully! We will get back to you soon.');
        setErrors({});
      } else {
        console.error('API returned error:', response.data);
        showToast('error', response.data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting contact form via API:', error);
      if (error.response) {
        // Server responded with error status
        showToast('error', error.response.data.message || 'Failed to send message');
      } else if (error.request) {
        // Network error
        showToast('error', 'Network error - please check if the server is running');
      } else {
        // Other error
        showToast('error', 'Failed to send message');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg border text-sm ${toast.type==='error'?'bg-red-50 border-red-200 text-red-700':'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left: Intro / Illustration */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 p-8 text-white shadow-xl">
            <h1 className="text-3xl font-bold">Get in touch</h1>
            <p className="mt-2 text-indigo-100">Have questions or feedback? Send us a message and we'll get back to you shortly.</p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">📧</span>
                <div>
                  <p className="text-sm text-indigo-100">Email</p>
                  <p className="font-medium">git@git-india.edu.in</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🏢</span>
                <div>
                  <p className="text-sm text-indigo-100">Head Office</p>
                  <p className="font-medium">GIT, Lavel,MH</p>
                </div>
              </div>
            </div>

            <img alt="contact" src="/banner.png" className="mt-8 w-full rounded-xl shadow-md ring-1 ring-white/20" />
          </motion.div>

          {/* Right: Form */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white rounded-2xl shadow-xl p-6 border">
            <h2 className="text-xl font-semibold text-gray-900">Send us a message</h2>
            <p className="text-sm text-gray-500 mb-4">We typically respond within 1–2 business days.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name *</label>
                <div className={`mt-1 flex items-center gap-2 rounded-md border px-3 ${errors.name ? 'border-red-300' : 'border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500'}`}>
                  <span className="text-gray-400">👤</span>
                  <input value={name} onChange={e=>setName(e.target.value)} className="w-full py-2 outline-none" placeholder="Your full name" />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Email *</label>
                <div className={`mt-1 flex items-center gap-2 rounded-md border px-3 ${errors.email ? 'border-red-300' : 'border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500'}`}>
                  <span className="text-gray-400">✉️</span>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full py-2 outline-none" placeholder="you@example.com" />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Message *</label>
                <div className={`mt-1 rounded-md border ${errors.message ? 'border-red-300' : 'border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500'}`}>
                  <textarea rows={6} value={message} onChange={e=>setMessage(e.target.value)} className="w-full px-3 py-2 outline-none rounded-md" placeholder="How can we help?" />
                </div>
                {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={()=>{ setName(''); setEmail(''); setMessage(''); setErrors({}); }} className="px-4 py-2 rounded-md border">
                  Clear
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-8 bg-white rounded-2xl shadow-xl p-6 border"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Submissions (Admin)</h3>
            {loadingContacts ? (
              <p className="text-gray-600">Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <p className="text-gray-600">No contact submissions yet.</p>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                      </div>
                      <p className="text-xs text-gray-500">{new Date(contact.created_at).toLocaleString()}</p>
                    </div>
                    <p className="mt-2 text-gray-800">{contact.message}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Contact;
