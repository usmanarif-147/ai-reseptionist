import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen">

      {/* Navbar */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">AI Receptionist</span>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Login
            </Link>
            <Link href="/auth/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Turn Your Website Chat Into a<br />
          <span className="text-blue-600">Smart AI Receptionist</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Add one line of code to your website. Your customers get instant answers,
          book appointments, and pay online — automatically, 24/7.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/signup" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700">
            Start 3-Day Free Trial
          </Link>
          <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 px-8 py-3 rounded-lg text-lg font-medium border border-gray-200 hover:border-gray-300">
            See How It Works
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">No commitment. Cancel anytime.</p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything your business needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Answers Questions</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Your chatbot learns your services, hours, and pricing. Customers get instant,
                accurate answers any time of day.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Appointment Booking</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Customers check availability, pick a time slot, and confirm their booking
                directly inside the chat — no phone calls needed.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Online Payments</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Accept payments inside the chat via Stripe. Customers pay at booking and
                receive an instant email confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Get started in minutes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-lg font-semibold mb-2">Set Up Your Dashboard</h3>
              <p className="text-gray-500 text-sm">Add your services, hours, staff, and pricing. Takes about 10 minutes.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-lg font-semibold mb-2">Copy Your Widget Code</h3>
              <p className="text-gray-500 text-sm">Get a single script tag and paste it into your website before the closing body tag.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-lg font-semibold mb-2">Your AI Goes Live</h3>
              <p className="text-gray-500 text-sm">Customers can now chat, book appointments, and pay — all without you being there.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple pricing</h2>
          <p className="text-gray-500 mb-12">Start free. No hidden fees. Cancel anytime.</p>
          <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-md p-10 border-2 border-blue-600">
            <h3 className="text-xl font-bold mb-2">Monthly Plan</h3>
            <div className="text-5xl font-bold text-blue-600 mb-1">$29</div>
            <div className="text-gray-400 text-sm mb-6">per month</div>
            <ul className="text-sm text-gray-600 space-y-3 text-left mb-8">
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Unlimited customer conversations</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Appointment booking and availability</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Online payments via Stripe</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Email confirmations</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Dashboard for your business</li>
              <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Works on any website</li>
            </ul>
            <Link href="/auth/signup" className="block w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 text-center">
              Start 3-Day Free Trial
            </Link>
            <p className="text-xs text-gray-400 mt-3">Card required. Cancel before 3 days and pay nothing.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} AI Receptionist. All rights reserved.</p>
      </footer>

    </div>
  )
}
