'use client';

import { useState } from 'react';
import { ArrowRight, Zap, Globe, Download, CheckCircle, Star, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  const [isHovered, setIsHovered] = useState(false);

  const platforms = [
    { name: 'Instagram', color: 'from-pink-500 to-purple-600' },
    { name: 'TikTok', color: 'from-gray-900 to-black' },
    { name: 'YouTube', color: 'from-red-500 to-red-600' },
    { name: 'Twitter', color: 'from-blue-400 to-blue-600' },
    { name: 'Linktree', color: 'from-green-500 to-green-600' },
    { name: 'Beacons', color: 'from-orange-500 to-orange-600' }
  ];

  const valueProps = [
    {
      icon: Zap,
      title: 'Automatic Discovery',
      description: 'Finds links you forgot about across all your platforms',
      stat: '47 avg links found'
    },
    {
      icon: Globe,
      title: 'All Platforms',
      description: '6+ platforms checked simultaneously in seconds',
      stat: '99.9% success rate'
    },
    {
      icon: Download,
      title: 'Instant Import',
      description: 'One click to import everything to your link-in-bio',
      stat: '30 second process'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Enter Your Username',
      description: 'Just type your Instagram, TikTok, or any platform username'
    },
    {
      number: '02', 
      title: 'We Scan All Platforms',
      description: 'Our AI automatically discovers every link across all your accounts'
    },
    {
      number: '03',
      title: 'Import Everything Instantly',
      description: 'One click and all your links are ready in your link-in-bio tool'
    }
  ];

  const testimonials = [
    {
      quote: "Found 23 affiliate links I completely forgot about!",
      author: "@fitnessguru",
      followers: "2.1M followers"
    },
    {
      quote: "Saved me 3 hours of copying and pasting",
      author: "@techreviewer", 
      followers: "890K followers"
    },
    {
      quote: "This is magic. Found links from 2019 I thought were gone",
      author: "@lifestyleblogger",
      followers: "1.5M followers"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-16 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Import All Your Links
              <br />
              <span className="text-blue-600">in 30 Seconds</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              We automatically find every affiliate link across all your platforms. 
              No more manual copying and pasting.
            </p>

            <Link href="/onboarding">
              <motion.button
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-8 py-4 text-xl font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Start Free
                <ArrowRight className={`ml-2 h-6 w-6 transition-transform duration-200 ${isHovered ? 'translate-x-1' : ''}`} />
              </motion.button>
            </Link>
          </motion.div>

          {/* Platform Logos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16"
          >
            <p className="text-sm text-gray-500 mb-6">Supported platforms</p>
            <div className="flex flex-wrap justify-center items-center gap-6">
              {platforms.map((platform, index) => (
                <motion.div
                  key={platform.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className={`px-4 py-2 rounded-lg bg-gradient-to-r ${platform.color} text-white text-sm font-medium shadow-md`}
                >
                  {platform.name}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Creators Love This
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stop wasting hours manually copying links. Let automation do the work.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {valueProps.map((prop, index) => (
              <motion.div
                key={prop.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <prop.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{prop.title}</h3>
                <p className="text-gray-600 mb-4">{prop.description}</p>
                <div className="text-sm font-semibold text-blue-600">{prop.stat}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to import all your links
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Trusted by Creators Worldwide
            </h2>
            <p className="text-xl text-blue-100">
              Join thousands of creators who have automated their link management
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-white mb-2">10,000+</div>
              <div className="text-blue-100">Creators Onboarded</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-white mb-2">2M+</div>
              <div className="text-blue-100">Links Discovered</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-white mb-2">47</div>
              <div className="text-blue-100">Avg Links per Creator</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-white mb-2">30s</div>
              <div className="text-blue-100">Average Discovery Time</div>
            </motion.div>
          </div>

          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-white mb-4">"{testimonial.quote}"</p>
                <div className="text-blue-100">
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm">{testimonial.followers}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Ready to Import All Your Links?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of creators who automated their link management
            </p>
            
            <Link href="/onboarding">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-8 py-4 text-xl font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Start Free Discovery
                <ArrowRight className="ml-2 h-6 w-6" />
              </motion.button>
            </Link>

            <p className="text-sm text-gray-500 mt-4">
              No credit card required • 30 second setup
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold mb-4">Creator Link Discovery</h3>
              <p className="text-gray-400">
                Automatically import all your affiliate links from every platform in 30 seconds.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Creator Link Discovery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
