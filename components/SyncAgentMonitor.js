// components/SyncAgentMonitor.js - Admin dashboard for monitoring sync agent
import { useState, useEffect } from 'react'

export default function SyncAgentMonitor() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadStatus()
    
    if (autoRefresh) {
      const interval = setInterval(loadStatus, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadStatus = async () => {
    try {
      setError('')
      const response = await fetch('/api/sync-status')
      const data = await response.json()
      
      if (response.ok) {
        setStatus(data)
      } else {
        setError(data.error || 'Failed to load sync status')
      }
    } catch (error) {
      setError('Network error loading sync status')
    } finally {
      setLoading(false)
    }
  }

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'idle': return 'text-blue-600 bg-blue-100'
      case 'degraded': return 'text-yellow-600 bg-yellow-100'
      case 'stale': return 'text-orange-600 bg-orange-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'stopped': return 'text-gray-600 bg-gray-100'
      case 'crashed': return 'text-red-800 bg-red-200'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getHealthIcon = (health) => {
    switch (health) {
      case 'healthy': return '✓'
      case 'idle': return '○'
      case 'degraded': return '⚠'
      case 'stale': return '⏰'
      case 'error': return '✗'
      case 'stopped': return '⏸'
      case 'crashed': return '💥'
      default: return '?'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sync Agent Monitor</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={loadStatus}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {status && (
        <>
          {/* Overall Health Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(status.overallHealth)}`}>
                {getHealthIcon(status.overallHealth)} {status.overallHealth.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sync Agent Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Sync Agent</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthColor(status.syncAgent.health)}`}>
                    {getHealthIcon(status.syncAgent.health)} {status.syncAgent.health}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Process: {status.syncAgent.process_running ? 'Running' : 'Stopped'}</p>
                  <p>Uptime: {status.syncAgent.uptime_hours ? `${status.syncAgent.uptime_hours.toFixed(1)}h` : 'N/A'}</p>
                  <p>Memory: {status.syncAgent.memory_usage_mb ? `${status.syncAgent.memory_usage_mb.toFixed(0)}MB` : 'N/A'}</p>
                </div>
              </div>

              {/* Database Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Database</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthColor(status.database.health)}`}>
                    {getHealthIcon(status.database.health)} {status.database.health}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Cloud: {status.database.cloud_connected ? 'Connected' : 'Disconnected'}</p>
                  <p>Week Records: {status.database.total_attendance_week || 0}</p>
                  <p>Hour Records: {status.database.recent_syncs_hour || 0}</p>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Today's Activity</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Total Records: {status.recentActivity.total_today || 0}</p>
                  <p>Recent: {status.recentActivity.recent_records?.length || 0} records</p>
                  <p>Hourly Periods: {status.recentActivity.hourly_activity?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Sync Agent Info */}
          {status.syncAgent && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Agent Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{status.syncAgent.total_synced || 0}</div>
                  <div className="text-sm text-blue-600">Records Synced</div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{status.syncAgent.total_errors || 0}</div>
                  <div className="text-sm text-red-600">Total Errors</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {status.syncAgent.time_since_last_sync_minutes !== null ? 
                      `${Math.round(status.syncAgent.time_since_last_sync_minutes)}m` : 'N/A'}
                  </div>
                  <div className="text-sm text-green-600">Last Sync</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{status.syncAgent.process_id || 'N/A'}</div>
                  <div className="text-sm text-purple-600">Process ID</div>
                </div>
              </div>

              {/* Error Information */}
              {status.syncAgent.last_error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-900 mb-2">Last Error</h4>
                  <p className="text-sm text-red-700">{status.syncAgent.last_error}</p>
                </div>
              )}

              {/* Status Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Status Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Current Status:</span>
                    <span className="ml-2 font-medium">{status.syncAgent.current_status || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Started:</span>
                    <span className="ml-2 font-medium">
                      {status.syncAgent.start_time ? 
                        new Date(status.syncAgent.start_time).toLocaleString() : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="ml-2 font-medium">
                      {status.syncAgent.last_sync_time ? 
                        new Date(status.syncAgent.last_sync_time).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status File Age:</span>
                    <span className="ml-2 font-medium">
                      {status.syncAgent.status_file_age_minutes ? 
                        `${Math.round(status.syncAgent.status_file_age_minutes)} min` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {status.recentActivity && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sync Activity</h3>
              
              {status.recentActivity.recent_records && status.recentActivity.recent_records.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scan Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Synced At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {status.recentActivity.recent_records.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {record.student_name || `ID: ${record.student_id}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {record.status === 'IN' ? 'Check In' : 'Check Out'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.scan_time).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent sync activity found</p>
                  <p className="text-sm">Records will appear here when students scan their fingerprints</p>
                </div>
              )}
            </div>
          )}

          {/* Hourly Activity Chart */}
          {status.recentActivity?.hourly_activity && status.recentActivity.hourly_activity.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">24-Hour Activity</h3>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {Array.from({length: 24}, (_, hour) => {
                  const activityData = status.recentActivity.hourly_activity.find(a => a.Hour === hour)
                  const count = activityData?.Count || 0
                  const maxCount = Math.max(...status.recentActivity.hourly_activity.map(a => a.Count), 1)
                  const height = Math.max(4, (count / maxCount) * 40)
                  
                  return (
                    <div key={hour} className="flex flex-col items-center">
                      <div 
                        className="w-8 bg-indigo-600 rounded-t"
                        style={{height: `${height}px`}}
                        title={`${hour}:00 - ${count} records`}
                      ></div>
                      <div className="text-xs text-gray-500 mt-1">{hour}</div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                Hours (24-hour format) - Hover for details
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}