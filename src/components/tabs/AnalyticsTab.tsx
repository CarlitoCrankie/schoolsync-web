import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { apiGet } from '@/lib/api'

interface AnalyticsTabProps {
  companyId: string
}

function AnalyticsTab({ companyId }: AnalyticsTabProps) {
  const [activeView, setActiveView] = useState('overview')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalyticsData()
  }, [activeView, companyId])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ type: activeView })
      
      if (companyId && companyId !== 'undefined') {
        params.set('company_id', companyId)
      }
      
      const data = await apiGet(`/api/analytics?${params}`)
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const views = [
    { id: 'overview', label: 'Overview', emoji: '📊' },
    { id: 'trends', label: 'Trends', emoji: '📈' },
    { id: 'students', label: 'Students', emoji: '👥' },
    { id: 'real-time', label: 'Real-time', emoji: '⚡' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-start">
            <span className="text-4xl mr-4">📊</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
              <p className="text-sm text-gray-600 mt-1">Comprehensive network analytics and insights</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {views.map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md ${
                  activeView === view.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white scale-105 border-2 border-blue-600'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
                }`}
              >
                {view.emoji} {view.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 absolute top-0 left-0"></div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-700">📊 Loading analytics...</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeView === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">🏫</span>
                  <h3 className="text-lg font-bold text-gray-900">Schools</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-purple-200">
                    <span className="text-sm font-medium text-gray-700">📊 Total:</span>
                    <span className="text-2xl font-bold text-purple-600">{analyticsData?.overview?.schools?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-green-200">
                    <span className="text-sm font-medium text-gray-700">✅ Active:</span>
                    <span className="text-2xl font-bold text-green-600">{analyticsData?.overview?.schools?.active || 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">👥</span>
                  <h3 className="text-lg font-bold text-gray-900">Students</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-blue-200">
                    <span className="text-sm font-medium text-gray-700">📊 Total:</span>
                    <span className="text-2xl font-bold text-blue-600">{analyticsData?.overview?.students?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-green-200">
                    <span className="text-sm font-medium text-gray-700">✅ Active:</span>
                    <span className="text-2xl font-bold text-green-600">{analyticsData?.overview?.students?.active || 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">📅</span>
                  <h3 className="text-lg font-bold text-gray-900">Attendance</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-blue-200">
                    <span className="text-sm font-medium text-gray-700">📊 Today:</span>
                    <span className="text-2xl font-bold text-blue-600">{analyticsData?.overview?.attendance?.today || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-green-200">
                    <span className="text-sm font-medium text-gray-700">📈 This Week:</span>
                    <span className="text-2xl font-bold text-green-600">{analyticsData?.overview?.attendance?.week || 0}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeView === 'real-time' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                <h3 className="text-xs font-bold text-gray-600 mb-2">⚡ Last Minute</h3>
                <p className="text-3xl font-bold text-green-600">
                  {analyticsData?.live_metrics?.last_minute || 0}
                </p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                <h3 className="text-xs font-bold text-gray-600 mb-2">🕐 Last 5 Minutes</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {analyticsData?.live_metrics?.last_5_minutes || 0}
                </p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <h3 className="text-xs font-bold text-gray-600 mb-2">🕒 Last 15 Minutes</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {analyticsData?.live_metrics?.last_15_minutes || 0}
                </p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200">
                <h3 className="text-xs font-bold text-gray-600 mb-2">🕐 Last Hour</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {analyticsData?.live_metrics?.last_hour || 0}
                </p>
              </Card>
            </div>
          )}

          {activeView === 'trends' && (
            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
              <div className="flex items-center mb-6">
                <span className="text-3xl mr-3">📈</span>
                <h3 className="text-lg font-bold text-gray-900">Attendance Trends</h3>
              </div>
              <Card className="p-12 bg-white border-2 border-indigo-200">
                <div className="text-center">
                  <div className="text-5xl mb-4">📊</div>
                  <p className="text-lg font-medium text-gray-700 mb-2">Trends Visualization</p>
                  <p className="text-sm text-gray-500">Chart visualization would appear here</p>
                  <p className="text-xs text-gray-400 mt-2">Connect to chart library for detailed analytics</p>
                </div>
              </Card>
            </Card>
          )}

          {activeView === 'students' && (
            <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200">
              <div className="flex items-center mb-6">
                <span className="text-3xl mr-3">👥</span>
                <h3 className="text-lg font-bold text-gray-900">Student Analytics</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-white border-2 border-green-200">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-2">🏆</span>
                    <h4 className="font-bold text-green-900">Top Performers</h4>
                  </div>
                  <div className="space-y-3">
                    {Array.from({length: 5}, (_, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                        <span className="font-medium text-gray-700">🎓 Student {i + 1}</span>
                        <span className="text-lg font-bold text-green-600">{100 - i * 2}%</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-6 bg-white border-2 border-blue-200">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-2">📊</span>
                    <h4 className="font-bold text-blue-900">Attendance Patterns</h4>
                  </div>
                  <div className="space-y-3">
                    <Card className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
                      <p className="text-sm font-medium text-gray-700">
                        ⏰ <strong>Peak hours:</strong> 8:00 AM - 9:00 AM
                      </p>
                    </Card>
                    <Card className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                      <p className="text-sm font-medium text-gray-700">
                        📊 <strong>Average daily attendance:</strong> 85%
                      </p>
                    </Card>
                    <Card className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
                      <p className="text-sm font-medium text-gray-700">
                        📅 <strong>Most active day:</strong> Monday
                      </p>
                    </Card>
                  </div>
                </Card>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default AnalyticsTab