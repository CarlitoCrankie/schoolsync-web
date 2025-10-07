import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

interface SchoolSettingsTabProps {
  user: any
}

function SchoolSettingsTab({ user }: SchoolSettingsTabProps) {
  const [settings, setSettings] = useState({
    late_arrival_time: '08:30',
    early_departure_time: '14:00',
    school_start_time: '08:00',
    school_end_time: '15:00',
    timezone: 'Africa/Accra'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const schoolId = user?.school_id || user?.SchoolID || 2
      const response = await fetch(`/api/school-settings?school_id=${schoolId}`)
      const data = await response.json()
      
      if (data.success && data.settings) {
        setSettings({
          late_arrival_time: data.settings.late_arrival_time || '08:30',
          early_departure_time: data.settings.early_departure_time || '14:00',
          school_start_time: data.settings.school_start_time || '08:00',
          school_end_time: data.settings.school_end_time || '15:00',
          timezone: data.settings.timezone || 'Africa/Accra'
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (settings.late_arrival_time <= settings.school_start_time) {
      setError('Late arrival time must be after school start time')
      setSaving(false)
      return
    }

    if (settings.early_departure_time >= settings.school_end_time) {
      setError('Early departure time must be before school end time')
      setSaving(false)
      return
    }

    try {
      const schoolId = user?.school_id || user?.SchoolID || 2
      const response = await fetch('/api/school-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          ...settings
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setSuccess('Settings saved successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Failed to save settings: Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-12 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
          </div>
          <p className="mt-6 text-lg font-medium text-gray-700">⚙️ Loading settings...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your school configuration</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header Section */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
        <div className="flex items-start">
          <span className="text-4xl mr-4">⚙️</span>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">School Time Settings</h3>
            <p className="text-sm text-gray-600 mt-2">
              Configure attendance timing rules for your school. These settings determine when students are marked as late or leaving early.
            </p>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 animate-shake">
          <div className="flex items-center">
            <span className="text-3xl mr-3">❌</span>
            <div>
              <p className="font-bold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Success Message */}
      {success && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 animate-pulse">
          <div className="flex items-center">
            <span className="text-3xl mr-3">✅</span>
            <div>
              <p className="font-bold text-green-900">Success!</p>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* School Hours Section */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">🏫</span>
            <h4 className="text-xl font-bold text-gray-900">School Hours</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                ⏰ School Start Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={settings.school_start_time}
                  onChange={(e) => setSettings({...settings, school_start_time: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-lg font-medium"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">When does your school day begin?</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                🏁 School End Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={settings.school_end_time}
                  onChange={(e) => setSettings({...settings, school_end_time: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-lg font-medium"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">When does your school day end?</p>
            </div>
          </div>

          {/* Visual Timeline */}
          <div className="mt-6 p-4 bg-white rounded-lg border-2 border-blue-200">
            <p className="text-xs font-bold text-gray-600 mb-2">📊 School Day Timeline</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
                <p className="text-xs font-bold text-green-700">{settings.school_start_time}</p>
                <p className="text-xs text-gray-500">Start</p>
              </div>
              <div className="flex-1 h-1 bg-gradient-to-r from-green-300 to-red-300 mx-2"></div>
              <div className="text-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-1"></div>
                <p className="text-xs font-bold text-red-700">{settings.school_end_time}</p>
                <p className="text-xs text-gray-500">End</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Attendance Thresholds Section */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200">
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">📊</span>
            <h4 className="text-xl font-bold text-gray-900">Attendance Thresholds</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                🔴 Late Arrival Threshold
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={settings.late_arrival_time}
                  onChange={(e) => setSettings({...settings, late_arrival_time: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white shadow-sm text-lg font-medium"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">Students arriving after this time are marked late</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                🟠 Early Departure Threshold
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={settings.early_departure_time}
                  onChange={(e) => setSettings({...settings, early_departure_time: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white shadow-sm text-lg font-medium"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">Students leaving before this time are marked as early departure</p>
            </div>
          </div>

          {/* Threshold Timeline */}
          <div className="mt-6 p-4 bg-white rounded-lg border-2 border-orange-200">
            <p className="text-xs font-bold text-gray-600 mb-3">📈 Attendance Threshold Timeline</p>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-24 text-xs font-bold text-gray-600">On Time:</div>
                <div className="flex-1 flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <div className="text-xs">
                    <span className="font-bold text-green-700">{settings.school_start_time}</span>
                    <span className="text-gray-500"> to </span>
                    <span className="font-bold text-green-700">{settings.late_arrival_time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-xs font-bold text-gray-600">Late:</div>
                <div className="flex-1 flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <div className="text-xs">
                    <span className="text-gray-500">After </span>
                    <span className="font-bold text-red-700">{settings.late_arrival_time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-xs font-bold text-gray-600">Early Out:</div>
                <div className="flex-1 flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <div className="text-xs">
                    <span className="text-gray-500">Before </span>
                    <span className="font-bold text-orange-700">{settings.early_departure_time}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Additional Info Card */}
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <div className="flex items-start">
            <span className="text-3xl mr-3">💡</span>
            <div>
              <h4 className="text-sm font-bold text-indigo-900 mb-2">How These Settings Work</h4>
              <ul className="text-xs text-indigo-800 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span><strong>Late Arrival:</strong> Students checking in after the late arrival threshold will be marked as "Late"</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span><strong>Early Departure:</strong> Students checking out before the early departure threshold will be marked as "Early Departure"</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span><strong>Validation:</strong> The system ensures late arrival time is after school start, and early departure is before school end</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span><strong>Instant Effect:</strong> Changes take effect immediately after saving</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all text-base py-6"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving Changes...
                </>
              ) : (
                <>💾 Save Settings</>
              )}
            </Button>
            
            <Button
              type="button"
              onClick={fetchSettings}
              disabled={saving}
              variant="outline"
              className="flex-1 border-2 border-gray-400 hover:bg-gray-100 text-gray-700 font-bold shadow-md hover:shadow-lg transition-all text-base py-6"
            >
              🔄 Reset to Saved
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}

export default SchoolSettingsTab