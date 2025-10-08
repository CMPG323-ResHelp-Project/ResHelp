"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, TrendingUp, TrendingDown, BarChart3, Calendar, AlertTriangle } from "lucide-react"


export default function AnalyticsPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State for the data, which now comes directly from the API
  const [detailedTrends, setDetailedTrends] = useState<any[]>([]);
  const [buildingPerformance, setBuildingPerformance] = useState<any[]>([]);
  const [recurringIssues, setRecurringIssues] = useState<any[]>([]);
  const [resolutionTimeByCategory, setResolutionTimeByCategory] = useState<any[]>([]);

  // State for the filters
  const [timeRange, setTimeRange] = useState("7d")
  const [buildingFilter, setBuildingFilter] = useState("all")
  const router = useRouter()

  // This single useEffect now handles all data fetching
  useEffect(() => {
      const fetchAnalyticsData = async () => {
        setErrorMessage(null);
        setIsLoading(true);
    
        try {
          // Construct the URL with query parameters
          const url = `http://localhost:5229/analytics/detailed?timeRange=${timeRange}&building=${buildingFilter}`;
          const response = await fetch(url, { method: "GET" });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch analytics data. Status: ${response.status}`);
          }
    
          const data = await response.json();
          console.log("Fetched analytics data:", data);
          
          // Set all state variables from the single API response
          setDetailedTrends(data.detailedTrends || []);
          setBuildingPerformance(data.buildingPerformance || []);
          setResolutionTimeByCategory(data.resolutionTimeByCategory || []);
          setRecurringIssues(data.recurringIssues || []);

        } catch (err: any) {
          setErrorMessage(err.message);
          // Clear data on error
          setDetailedTrends([]);
          setBuildingPerformance([]);
          setResolutionTimeByCategory([]);
          setRecurringIssues([]);
        } finally {
          setIsLoading(false);
        }
      };
    
      fetchAnalyticsData();
  }, [timeRange, buildingFilter]); // Re-fetch whenever a filter changes

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <div className="h-4 w-4" />
    }
  }

  // The JSX remains largely the same, but you can add loading states
  // I've updated the "No data" messages to be more specific to the filters

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="manager" currentPage="/manager/analytics" />

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/manager/dashboard")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Detailed Analytics</h1>
              <p className="text-muted-foreground">In-depth maintenance management insights</p>
            </div>
          </div>
          <Button className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 3 months</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Building</label>
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    <SelectItem value="a">Building A</SelectItem>
                    <SelectItem value="b">Building B</SelectItem>
                    <SelectItem value="c">Building C</SelectItem>
                    <SelectItem value="d">Building D</SelectItem>
                    <SelectItem value="e">Building E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Trends */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Daily Issue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center"><p>Loading trends...</p></div>
            ) : detailedTrends.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>No daily trend data available for the selected filters</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={detailedTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="reported" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} name="Reported"/>
                  <Area type="monotone" dataKey="resolved" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Resolved"/>
                  <Area type="monotone" dataKey="urgent" stackId="3" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Urgent"/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Building Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Building</CardTitle>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                <div className="h-[300px] flex items-center justify-center"><p>Loading performance data...</p></div>
              ) : buildingPerformance.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p>No building performance data available for the selected filters</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={buildingPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="building" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="issues" fill="#6366f1" name="Total Issues" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Resolution Time by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Avg Resolution Time by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center"><p>Loading resolution times...</p></div>
              ) : resolutionTimeByCategory.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                    <p>No resolution time data available for the selected filters</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {resolutionTimeByCategory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-sm text-muted-foreground">{item.avgHours} hours average</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(item.trend)}
                        <span className="text-sm font-medium">{item.avgHours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recurring Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Recurring Issues Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="p-8 text-center"><p>Loading recurring issues...</p></div>
            ) : recurringIssues.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recurring issues identified</h3>
                <p>No patterns of recurring maintenance issues have been detected for the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recurringIssues.map((issue, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{issue.issue}</p>
                      <p className="text-sm text-muted-foreground">Affected buildings: {issue.buildings.join(", ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{issue.occurrences}</p>
                      <p className="text-sm text-muted-foreground">occurrences</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
