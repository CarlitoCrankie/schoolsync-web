// components/ParentContactManager.js - Enhanced with required contact flow
import { useState, useEffect } from 'react'

export default function ParentContactManager({ user, onComplete, isRequired = false }) {
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    loadCurrentContactInfo()
  }, [user.student_id])

  const loadCurrentContactInfo = async () => {
    if (!user.student_id) return

    try {
      const response = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_parent_contact',
          data: { studentId: user.student_id }
        })
      })

      const result = await response.json()
      if (result.success) {
        setContactInfo({
          email: result.result.parentContact.email || '',
          phone: result.result.parentContact.phone || ''
        })
      }
    } catch (error) {
      console.error('Failed to load contact info:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleUpdateContact = async (e) => {
    e.preventDefault()
    
    // Validation for required flow
    if (isRequired && !contactInfo.email && !contactInfo.phone) {
      setError('Please provide at least one contact method (email or phone number) to receive notifications.')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/sync-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_parent_contact',
          data: {
            studentId: user.student_id,
            newEmail: contactInfo.email || null,
            newPhone: contactInfo.phone || null
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        setMessage('Contact information updated successfully! You will receive notifications at the provided contact details.')
        
        // If this was a required update and completed successfully, call onComplete
        if (isRequired && onComplete) {
          setTimeout(() => {
            onComplete()
          }, 2000) // Give user time to see success message
        }
      } else {
        setError(result.error || 'Failed to update contact information')
      }
    } catch (error) {
      setError('Failed to update contact information. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setContactInfo({
      ...contactInfo,
      [e.target.name]: e.target.value
    })
    setError('')
    setMessage('')
  }

  const hasContactInfo = contactInfo.email || contactInfo.phone

  if (initialLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded mb-6 w-2/3"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">📱</span>
        <h3 className="text-lg font-semibold text-gray-900">
          {isRequired ? 'Setup Contact Information' : 'Update Contact Information'}
        </h3>
      </div>
      
      <p className="text-gray-600 mb-6">
        {isRequired ? 
          `Please provide your contact information to receive attendance notifications for ${user.student_name}.` :
          `Update your contact information to receive attendance notifications for ${user.student_name}.`
        }
      </p>

      {/* Current Status */}
      {!isRequired && (
        <div className={`mb-6 p-4 rounded-lg ${hasContactInfo ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center">
            <span className={`text-xl mr-3 ${hasContactInfo ? 'text-green-500' : 'text-yellow-500'}`}>
              {hasContactInfo ? '✓' : '⚠'}
            </span>
            <div>
              <p className={`font-medium ${hasContactInfo ? 'text-green-800' : 'text-yellow-800'}`}>
                {hasContactInfo ? 'Notifications Active' : 'Notifications Disabled'}
              </p>
              <p className={`text-sm ${hasContactInfo ? 'text-green-600' : 'text-yellow-600'}`}>
                {hasContactInfo ? 
                  'You will receive notifications when your child checks in/out' :
                  'Provide contact info to receive attendance notifications'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <div className="flex items-center">
            <span className="text-green-500 text-lg mr-2">✓</span>
            {message}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <div className="flex items-center">
            <span className="text-red-500 text-lg mr-2">✗</span>
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleUpdateContact} className="space-y-4">
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <span className="text-lg mr-2">📧</span>
            Email Address
            {isRequired && !contactInfo.phone && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="email"
            name="email"
            value={contactInfo.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="your.email@example.com"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            You'll receive email notifications when {user.student_name} checks in/out
          </p>
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <span className="text-lg mr-2">📱</span>
            Phone Number
            {isRequired && !contactInfo.email && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="tel"
            name="phone"
            value={contactInfo.phone}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="+233123456789"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            You'll receive SMS notifications when {user.student_name} checks in/out
          </p>
        </div>

        {isRequired && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Required:</span> Please provide at least one contact method to continue to your dashboard.
            </p>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
            }`}
          >
            {loading ? 'Updating...' : isRequired ? 'Continue to Dashboard' : 'Update Contact Info'}
          </button>
          
          {!isRequired && (
            <button
              type="button"
              onClick={loadCurrentContactInfo}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Refresh
            </button>
          )}

          {isRequired && (contactInfo.email || contactInfo.phone) && (
            <button
              type="button"
              onClick={() => {
                setContactInfo({ email: '', phone: '' })
                setError('')
                setMessage('')
              }}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="flex items-center font-medium text-blue-900 mb-2">
          <span className="text-lg mr-2">ℹ</span>
          How Notifications Work
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• SMS notifications sent instantly when {user.student_name} scans fingerprint</li>
          <li>• Email notifications include detailed attendance information</li>
          <li>• All information is stored securely and used only for attendance notifications</li>
          <li>• You can update your contact information anytime</li>
          <li>• Both email and phone are optional, but at least one is recommended</li>
        </ul>
      </div>

      {/* Test Notification Section */}
      {/* {hasContactInfo && !isRequired && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Test Notifications</h4>
          <p className="text-sm text-gray-600 mb-3">
            Want to test if notifications are working? You can simulate a check-in from the admin panel or ask your school administrator to test the system.
          </p>
          <div className="text-xs text-gray-500">
            <p>Current contact methods:</p>
            {contactInfo.email && <p>• Email: {contactInfo.email}</p>}
            {contactInfo.phone && <p>• Phone: {contactInfo.phone}</p>}
          </div>
        </div>
      )} */}
    </div>
  )
}