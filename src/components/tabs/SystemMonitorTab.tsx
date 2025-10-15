import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { apiGet } from '@/lib/api'

interface SystemMonitorTabProps {
  companyId: string
}

function SystemMonitorTab({ companyId }: SystemMonitorTabProps) {
  const [systemData, setSystemData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSystemData()
    const interval = setInterval(fetchSystemData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [companyId])

  const fetchSystemData = async () => {
    try {
      setLoading(false) // Don't show loading on refresh
      const data = await apiGet(`/api/analytics?type=sync-performance&company_id=${companyId}`)  // ✅ Use apiGet
      setSystemData(data)
    } catch (error) {
      console.error('Error fetching system data:', error)
    }
  }

  if (loading) {
    return (
      <Card className="p-12 card-glow">
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary absolute top-0 left-0"></div>
          </div>
          <p className="mt-6 text-lg font-medium text-white">📊 Loading system monitor...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 card-dark-solid border-primary/20">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-start">
            <span className="text-4xl mr-4">📊</span>
            <div>
              <h2 className="text-2xl font-bold text-white">System Performance Monitor</h2>
              <p className="text-sm text-muted-foreground mt-1">Real-time monitoring of all sync agents</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
            <Card className="px-3 py-2 bg-card border-2 border-green-500/30">
              <span className="text-xs font-bold text-green-400">🔄 Auto-refresh: 30s</span>
            </Card>
            <Button 
              onClick={fetchSystemData}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl"
            >
              🔄 Refresh Now
            </Button>
          </div>
        </div>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 card-glow hover:scale-105 transition-transform">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">🖥️ Total Agents</h3>
          <p className="text-3xl font-bold text-primary">
            {systemData?.performance_metrics?.total_agents || 0}
          </p>
        </Card>
        <Card className="p-4 card-glow hover:scale-105 transition-transform">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">🟢 Online Agents</h3>
          <p className="text-3xl font-bold text-green-400">
            {systemData?.performance_metrics?.online_agents || 0}
          </p>
        </Card>
        <Card className="p-4 card-glow hover:scale-105 transition-transform">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">⚠️ Avg Error Rate</h3>
          <p className="text-3xl font-bold text-red-400">
            {systemData?.performance_metrics?.avg_error_rate || 0}%
          </p>
        </Card>
        <Card className="p-4 card-glow hover:scale-105 transition-transform">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">🔄 Syncs/Hour</h3>
          <p className="text-3xl font-bold text-purple-400">
            {Math.round(systemData?.performance_metrics?.avg_syncs_per_hour || 0)}
          </p>
        </Card>
        <Card className="p-4 card-glow hover:scale-105 transition-transform">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">⏱️ Uptime (Avg)</h3>
          <p className="text-3xl font-bold text-orange-400">
            {Math.round(systemData?.performance_metrics?.avg_uptime_hours || 0)}h
          </p>
        </Card>
      </div>

      {/* Health Distribution */}
      <Card className="p-6 card-glow">
        <div className="flex items-center mb-6">
          <span className="text-3xl mr-3">💚</span>
          <h3 className="text-lg font-bold text-white">Agent Health Distribution</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 text-center bg-card border-2 border-green-500/50">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {systemData?.health_distribution?.excellent || 0}
            </div>
            <div className="text-xs font-bold text-muted-foreground">✅ Excellent</div>
            <div className="text-xs text-muted-foreground">(90%+)</div>
          </Card>
          <Card className="p-4 text-center bg-card border-2 border-primary/50">
            <div className="text-3xl font-bold text-primary mb-2">
              {systemData?.health_distribution?.good || 0}
            </div>
            <div className="text-xs font-bold text-muted-foreground">👍 Good</div>
            <div className="text-xs text-muted-foreground">(70-89%)</div>
          </Card>
          <Card className="p-4 text-center bg-card border-2 border-yellow-500/50">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {systemData?.health_distribution?.fair || 0}
            </div>
            <div className="text-xs font-bold text-muted-foreground">⚠️ Fair</div>
            <div className="text-xs text-muted-foreground">(50-69%)</div>
          </Card>
          <Card className="p-4 text-center bg-card border-2 border-red-500/50">
            <div className="text-3xl font-bold text-red-400 mb-2">
              {systemData?.health_distribution?.poor || 0}
            </div>
            <div className="text-xs font-bold text-muted-foreground">❌ Poor</div>
            <div className="text-xs text-muted-foreground">(&lt;50%)</div>
          </Card>
        </div>
      </Card>

      {/* Agents Detail Table */}
      <Card className="overflow-hidden border-2 border-primary/30">
        <div className="p-6 bg-card border-b-2 border-primary/30">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔧</span>
            <h3 className="text-lg font-bold text-white">Sync Agents Status</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-primary/20 to-accent/20">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">🏫 School</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">📊 Status</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">💚 Health Score</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">⏱️ Uptime</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">✅ Synced</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">❌ Errors</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider hidden sm:table-cell">💾 Memory</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {systemData?.agents?.length > 0 ? systemData.agents.map((agent) => (
                <tr key={agent.school_id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-white">{agent.school_name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">
                      💚 Health: {agent.health_score}% • ⏱️ Uptime: {agent.uptime_hours}h
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border-2 ${
                      agent.connection_status === 'Online' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                      agent.connection_status === 'Warning' 
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                      'bg-red-500/20 text-red-400 border-red-500/50'
                    }`}>
                      {agent.connection_status === 'Online' ? '🟢 Online' :
                      agent.connection_status === 'Warning' ? '⚠️ Warning' :
                      '🔴 Offline'}
                    </span>
                    <div className="text-xs text-muted-foreground sm:hidden mt-2">
                      ✅ Synced: {agent.total_synced} • ❌ Errors: {agent.total_errors}
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span className={`inline-flex px-3 py-1 rounded-lg font-bold border-2 ${
                      agent.health_score >= 90 ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                      agent.health_score >= 70 ? 'bg-primary/20 text-primary border-primary/50' :
                      agent.health_score >= 50 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                      'bg-red-500/20 text-red-400 border-red-500/50'
                    }`}>
                      {agent.health_score}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-white hidden sm:table-cell">
                    {agent.uptime_hours}h
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-green-400 hidden sm:table-cell">
                    {agent.total_synced}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-red-400 hidden sm:table-cell">
                    {agent.total_errors}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-purple-400 hidden sm:table-cell">
                    {agent.memory_usage_mb}MB
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">
                    <div className="text-5xl mb-3">🔧</div>
                    <p className="font-medium">No sync agents found</p>
                    <p className="text-sm mt-2">Sync agents will appear here when configured</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {systemData?.agents?.length > 0 && (
        <Card className="p-4 bg-card border-2 border-primary/30">
          <div className="text-sm text-muted-foreground text-center">
            📊 Monitoring <span className="font-bold text-primary">{systemData.agents.length}</span> sync agents • 
            Last updated: <span className="font-bold text-white">{new Date().toLocaleTimeString()}</span>
          </div>
        </Card>
      )}
    </div>
  )
}

export default SystemMonitorTab