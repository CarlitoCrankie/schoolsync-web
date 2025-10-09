import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { apiGet, apiPost } from '@/lib/api'

function DatabaseHealthMonitor() {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [activeView, setActiveView] = useState('overview')

  const fetchHealthData = async (action = '') => {
    try {
      setLoading(true)
      const url = action ? `/api/health?action=${action}` : '/api/health'
      const data = await apiGet(url)

      setHealthData(data)
      setError('')
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Health check failed:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runManualCleanup = async () => {
    try {
      setCleanupLoading(true)
      
      const maintenanceKey = prompt('Enter maintenance key for cleanup:')
      if (!maintenanceKey) return

      const result = await apiPost('/api/health?action=cleanup', {
        auth_key: maintenanceKey
      })

      if (result.success) {
        alert('Cleanup completed successfully!')
        fetchHealthData(activeView === 'detailed' ? 'database' : '')
      } else {
        alert('Cleanup failed: ' + result.error)
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
      alert('Cleanup failed: ' + error.message)
    } finally {
      setCleanupLoading(false)
    }
  }

  const fetchSessionDetails = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/health?action=monitor')

      setHealthData(data)
      setError('')
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Session monitoring failed:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadData = () => {
      switch (activeView) {
        case 'detailed':
          fetchHealthData('database')
          break
        case 'sessions':
          fetchSessionDetails()
          break
        default:
          fetchHealthData('')
      }
    }

    loadData()
    
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [activeView])

  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-gradient-to-r from-green-100 to-emerald-100 border-green-300'
    if (score >= 70) return 'text-yellow-600 bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300'
    if (score >= 50) return 'text-orange-600 bg-gradient-to-r from-orange-100 to-red-100 border-orange-300'
    return 'text-red-600 bg-gradient-to-r from-red-100 to-pink-100 border-red-300'
  }

  if (loading && !healthData) {
    return (
      <Card className="p-12 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 absolute top-0 left-0"></div>
          </div>
          <p className="mt-6 text-lg font-medium text-gray-700">💊 Checking system health...</p>
        </div>
      </Card>
    )
  }

  if (error && !healthData) {
    return (
      <Card className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300">
        <div className="flex items-center justify-between">
          <div className="flex items-start">
            <span className="text-3xl mr-3">❌</span>
            <div>
              <h4 className="font-bold text-red-900">Health Check Failed</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <Button 
            onClick={() => fetchHealthData('')}
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg"
          >
            🔄 Retry
          </Button>
        </div>
      </Card>
    )
  }

  if (!healthData) return null

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <span className="text-4xl mr-4">💊</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Database Health Monitor</h3>
                <p className="text-sm text-gray-600 mt-1">Real-time system health monitoring and diagnostics</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex rounded-lg shadow-md overflow-hidden border-2 border-blue-300">
              <button
                onClick={() => setActiveView('overview')}
                className={`px-4 py-2 text-sm font-bold transition-all ${
                  activeView === 'overview'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveView('detailed')}
                className={`px-4 py-2 text-sm font-bold transition-all border-x-2 border-blue-300 ${
                  activeView === 'detailed'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                🔍 Detailed
              </button>
              <button
                onClick={() => setActiveView('sessions')}
                className={`px-4 py-2 text-sm font-bold transition-all ${
                  activeView === 'sessions'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                👥 Sessions
              </button>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => fetchHealthData(activeView === 'detailed' ? 'database' : activeView === 'sessions' ? 'monitor' : '')}
                disabled={loading}
                variant="outline"
                className="border-2 border-gray-400 hover:bg-gray-100 shadow-md"
              >
                {loading ? '🔄 Checking...' : '🔄 Refresh'}
              </Button>
              <Button
                onClick={runManualCleanup}
                disabled={cleanupLoading}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg"
              >
                {cleanupLoading ? '🧹 Cleaning...' : '🧹 Cleanup'}
              </Button>
            </div>
          </div>

          {lastUpdated && (
            <Card className="p-2 text-center bg-white border-2 border-green-200">
              <span className="text-xs font-bold text-green-700">
                ⏰ Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </Card>
          )}
        </div>
      </Card>

      {/* Health Status Overview */}
      {(activeView === 'overview' || activeView === 'detailed') && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">📊</span>
            <h4 className="text-lg font-bold text-gray-900">System Status</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={`p-4 text-center border-2 ${getHealthColor(healthData.health_score || 0)}`}>
              <div className="text-3xl font-bold mb-2">
                {healthData.health_score || 0}%
              </div>
              <div className="text-xs font-bold text-gray-600">💚 Health Score</div>
            </Card>
            
            <Card className="p-4 text-center bg-white border-2 border-blue-300">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {healthData.performance?.response_time_ms || 'N/A'}
              </div>
              <div className="text-xs font-bold text-gray-600">⚡ Response (ms)</div>
            </Card>
            
            <Card className={`p-4 text-center border-2 ${
              healthData.database?.status === 'connected' 
                ? 'bg-green-100 border-green-300' 
                : 'bg-red-100 border-red-300'
            }`}>
              <div className={`text-4xl font-bold mb-2 ${
                healthData.database?.status === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {healthData.database?.status === 'connected' ? '✅' : '❌'}
              </div>
              <div className="text-xs font-bold text-gray-600">💾 DB Connection</div>
            </Card>
            
            <Card className={`p-4 text-center border-2 ${
              (healthData.connection_pool?.available || healthData.pool_status?.available || 0) > 0 
                ? 'bg-green-100 border-green-300' 
                : 'bg-red-100 border-red-300'
            }`}>
              <div className={`text-3xl font-bold mb-2 ${
                (healthData.connection_pool?.available || healthData.pool_status?.available || 0) > 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {healthData.connection_pool?.available || healthData.pool_status?.available || 0}
              </div>
              <div className="text-xs font-bold text-gray-600">🔌 Available</div>
            </Card>
          </div>
        </Card>
      )}

      {/* Connection Pool Details */}
      {(activeView === 'overview' || activeView === 'detailed') && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">🔌</span>
            <h4 className="text-lg font-bold text-gray-900">Connection Pool Status</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['size', 'available', 'pending', 'keepAlive', 'healthCheck'].map((metric) => {
              const poolData = healthData.connection_pool || healthData.pool_status || {}
              let value = poolData[metric] || 0
              let displayValue = value
              
              if (metric === 'keepAlive' || metric === 'healthCheck') {
                displayValue = value ? '✅' : '❌'
              }
              
              return (
                <Card key={metric} className="p-3 text-center bg-white border-2 border-purple-200">
                  <div className={`text-2xl font-bold mb-1 ${
                    metric === 'available' ? (value > 0 ? 'text-green-600' : 'text-red-600') :
                    metric === 'keepAlive' || metric === 'healthCheck' ? (value ? 'text-green-600' : 'text-red-600') :
                    'text-gray-900'
                  }`}>
                    {displayValue}
                  </div>
                  <div className="text-xs font-bold text-gray-600 capitalize">
                    {metric.replace(/([A-Z])/g, ' $1')}
                  </div>
                </Card>
              )
            })}
          </div>
        </Card>
      )}

      {/* Database Connection Statistics */}
      {activeView === 'detailed' && healthData.database_connections && (
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">📈</span>
            <h4 className="text-lg font-bold text-gray-900">Database Connection Statistics</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border-2 border-indigo-200">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {healthData.database_connections.total_user_connections || 0}
              </div>
              <div className="text-xs font-bold text-gray-600">📊 Total Connections</div>
            </Card>
            <Card className="p-4 bg-white border-2 border-blue-200">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {healthData.database_connections.node_connections || 0}
              </div>
              <div className="text-xs font-bold text-gray-600">🔷 Node.js Connections</div>
            </Card>
            <Card className={`p-4 border-2 ${
              (healthData.database_connections.idle_15min || 0) > 5 
                ? 'bg-yellow-100 border-yellow-300' 
                : 'bg-green-100 border-green-300'
            }`}>
              <div className={`text-2xl font-bold mb-1 ${
                (healthData.database_connections.idle_15min || 0) > 5 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {healthData.database_connections.idle_15min || 0}
              </div>
              <div className="text-xs font-bold text-gray-600">⏱️ Idle 15+ min</div>
            </Card>
            <Card className={`p-4 border-2 ${
              (healthData.database_connections.idle_30min || 0) > 0 
                ? 'bg-red-100 border-red-300' 
                : 'bg-green-100 border-green-300'
            }`}>
              <div className={`text-2xl font-bold mb-1 ${
                (healthData.database_connections.idle_30min || 0) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {healthData.database_connections.idle_30min || 0}
              </div>
              <div className="text-xs font-bold text-gray-600">⏰ Idle 30+ min</div>
            </Card>
          </div>
        </Card>
      )}

      {/* Active Sessions */}
      {activeView === 'sessions' && healthData.active_sessions && (
        <Card className="overflow-hidden border-2 border-cyan-200">
          <div className="p-6 bg-gradient-to-r from-cyan-50 to-blue-50 border-b-2 border-cyan-200">
            <div className="flex items-center">
              <span className="text-2xl mr-3">👥</span>
              <h4 className="text-lg font-bold text-gray-900">Active Database Sessions</h4>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-cyan-500 to-blue-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">🆔 Session ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">👤 Login</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">💻 Program</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">⏱️ Idle Time</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase">📊 Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {healthData.active_sessions.slice(0, 10).map((session) => (
                  <tr key={session.session_id} className={`transition-colors ${
                    session.idle_minutes > 30 ? 'bg-red-50' : 
                    session.idle_minutes > 15 ? 'bg-yellow-50' : 
                    'hover:bg-cyan-50'
                  }`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {session.session_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {session.login_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {session.program_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 ${
                        session.idle_minutes > 30 ? 'bg-red-100 text-red-800 border-red-300' :
                        session.idle_minutes > 15 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        'bg-green-100 text-green-800 border-green-300'
                      }`}>
                        {session.idle_minutes} min
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                      {session.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {healthData.active_sessions.length > 10 && (
            <div className="p-4 bg-gray-50 border-t-2 border-cyan-200 text-center">
              <p className="text-sm text-gray-600">
                📊 Showing 10 of <span className="font-bold text-blue-600">{healthData.active_sessions.length}</span> sessions
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Alerts */}
      {healthData.alerts && healthData.alerts.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200">
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">🚨</span>
            <h4 className="text-lg font-bold text-red-900">System Alerts</h4>
          </div>
          <div className="space-y-3">
            {healthData.alerts.map((alert, index) => (
              <Card key={index} className={`p-4 border-2 ${
                alert.level === 'critical' 
                  ? 'bg-red-100 border-red-300' 
                  : 'bg-yellow-100 border-yellow-300'
              }`}>
                <div className="flex items-start">
                  <span className="text-2xl mr-3">{alert.level === 'critical' ? '🔴' : '⚠️'}</span>
                  <div>
                    <span className="font-bold text-sm">{alert.level.toUpperCase()}:</span>
                    <span className="text-sm ml-2">{alert.message}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {healthData.recommendations && healthData.recommendations.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">💡</span>
            <h4 className="text-lg font-bold text-gray-900">Recommendations</h4>
          </div>
          <div className="space-y-3">
            {healthData.recommendations.map((recommendation, index) => (
              <Card key={index} className={`p-4 border-2 ${
                recommendation.includes('optimal') ? 'bg-green-100 border-green-300' :
                recommendation.includes('restart') || recommendation.includes('critical') ? 'bg-red-100 border-red-300' :
                'bg-blue-100 border-blue-300'
              }`}>
                <div className="flex items-start">
                  <span className="text-xl mr-3">
                    {recommendation.includes('optimal') ? '✅' :
                     recommendation.includes('restart') || recommendation.includes('critical') ? '⚠️' :
                     '💡'}
                  </span>
                  <p className="text-sm font-medium">{recommendation}</p>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200">
        <div className="flex items-center mb-6">
          <span className="text-3xl mr-3">⚡</span>
          <h4 className="text-lg font-bold text-gray-900">Performance Metrics</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white border-2 border-orange-200">
            <div className="text-xs font-bold text-gray-600 mb-2">⚡ Response Time</div>
            <div className="text-2xl font-bold text-orange-600">
              {healthData.performance?.response_time_ms || 'N/A'}ms
            </div>
          </Card>
          <Card className={`p-4 border-2 ${
            (healthData.performance?.query_timeouts || 0) > 0 
              ? 'bg-red-100 border-red-300' 
              : 'bg-green-100 border-green-300'
          }`}>
            <div className="text-xs font-bold text-gray-600 mb-2">⏱️ Query Timeouts</div>
            <div className={`text-2xl font-bold ${
              (healthData.performance?.query_timeouts || 0) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {healthData.performance?.query_timeouts || 0}
            </div>
          </Card>
          <Card className={`p-4 border-2 ${
            (healthData.performance?.failed_checks || 0) > 0 
              ? 'bg-red-100 border-red-300' 
              : 'bg-green-100 border-green-300'
          }`}>
            <div className="text-xs font-bold text-gray-600 mb-2">❌ Failed Checks</div>
            <div className={`text-2xl font-bold ${
              (healthData.performance?.failed_checks || 0) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {healthData.performance?.failed_checks || 0}
            </div>
          </Card>
        </div>
      </Card>

      {/* Detailed Errors */}
      {healthData.detailed_errors && healthData.detailed_errors.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300">
          <div className="flex items-center mb-6">
            <span className="text-3xl mr-3">🔴</span>
            <h4 className="text-lg font-bold text-red-900">System Errors</h4>
          </div>
          <div className="space-y-3">
            {healthData.detailed_errors.map((error, index) => (
              <Card key={index} className="p-4 bg-white border-2 border-red-300">
                <div className="text-sm font-bold text-red-900 mb-2">
                  ⚠️ Check #{error.check_index + 1}
                </div>
                <div className="text-sm text-red-700">{error.error}</div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default DatabaseHealthMonitor