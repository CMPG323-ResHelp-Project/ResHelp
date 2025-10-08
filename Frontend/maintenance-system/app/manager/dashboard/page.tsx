"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { TrendingUp, Clock, CheckCircle, AlertTriangle, Users, Calendar, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

type Issue = {
  Title: string;
  Description: string;
  Status: "Pending" | "Assigned" | "Resolved" | "Cancelled";
  Priority: "High" | "Medium" | "Low";
  Category: string;
  Location: string;
  IsUrgentSafetyHazard: boolean;
  ReportedAt: string;
  UpdatedAt: string;
  ReporterEmail: string;
  Rating?: number;
};

export default function ManagerDashboard() {
  const router = useRouter()

  const [overviewStats, setOverviewStats] = useState({ totalIssues: 0, resolvedIssues: 0, avgResponseTime: "N/A", avgResolutionTime: "N/A", studentSatisfaction: 0, activeStaff: 0 });
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [ overviewRes, trendsRes, categoryRes, responseTimeRes, staffRes ] = await Promise.all([
          fetch("http://localhost:5229/analytics/overview"),
          fetch("http://localhost:5229/analytics/monthly-trends"),
          fetch("http://localhost:5229/analytics/categories"),
          fetch("http://localhost:5229/analytics/response-times"),
          fetch("http://localhost:5229/analytics/staff-performance"),
        ]);

        if (overviewRes.ok) setOverviewStats(await overviewRes.json());
        if (trendsRes.ok) setMonthlyTrends(await trendsRes.json());
        if (responseTimeRes.ok) setResponseTimeData(await responseTimeRes.json());
        if (staffRes.ok) setStaffPerformance(await staffRes.json());

        if (categoryRes.ok) {
          const categoryRawData = await categoryRes.json();
          const categoryColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
          setCategoryData(categoryRawData.map((entry: any, index: number) => ({
            ...entry,
            color: categoryColors[index % categoryColors.length],
          })));
        }
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation userType="manager" currentPage="/manager/dashboard" />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive maintenance management insights</p>
          </div>
          <Button onClick={() => router.push("/manager/analytics")} className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" /> <span>Detailed Analytics</span>
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><Calendar className="h-5 w-5 text-blue-600" /><div><p className="text-sm text-muted-foreground">Total Issues</p><p className="text-2xl font-bold">{overviewStats.totalIssues}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><CheckCircle className="h-5 w-5 text-green-600" /><div><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold">{overviewStats.resolvedIssues}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><Clock className="h-5 w-5 text-orange-600" /><div><p className="text-sm text-muted-foreground">Avg Response</p><p className="text-2xl font-bold">{overviewStats.avgResponseTime}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><TrendingUp className="h-5 w-5 text-purple-600" /><div><p className="text-sm text-muted-foreground">Avg Resolution</p><p className="text-2xl font-bold">{overviewStats.avgResolutionTime}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><Users className="h-5 w-5 text-indigo-600" /><div><p className="text-sm text-muted-foreground">Satisfaction</p><p className="text-2xl font-bold">{overviewStats.studentSatisfaction > 0 ? `${overviewStats.studentSatisfaction.toFixed(1)}/5` : 'N/A'}</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><AlertTriangle className="h-5 w-5 text-cyan-600" /><div><p className="text-sm text-muted-foreground">Active Staff</p><p className="text-2xl font-bold">{overviewStats.activeStaff}</p></div></div></CardContent></Card>
        </div>

        {/* Main Charts: Monthly Trends and Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><CardTitle>Monthly Issue Trends</CardTitle></CardHeader>
            <CardContent>
              {isLoading || monthlyTrends.length === 0 ? (<div className="h-[300px] flex items-center justify-center text-muted-foreground"><div className="text-center"><BarChart3 className="h-12 w-12 mx-auto mb-4" /><p>{isLoading ? "Loading..." : "No trend data"}</p></div></div>) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="reported" stroke="#6366f1" name="Reported" /><Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" /><Line type="monotone" dataKey="pending" stroke="#f59e0b" name="Pending" /></LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Issues by Category</CardTitle></CardHeader>
            <CardContent>
              {isLoading || categoryData.length === 0 ? (<div className="h-[300px] flex items-center justify-center text-muted-foreground"><div className="text-center"><BarChart3 className="h-12 w-12 mx-auto mb-4" /><p>{isLoading ? "Loading..." : "No category data"}</p></div></div>) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart><Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">{categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/*Response Times and Staff Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Response Time Distribution</CardTitle></CardHeader>
            <CardContent>
              {isLoading || responseTimeData.length === 0 ? (<div className="h-[300px] flex items-center justify-center text-muted-foreground"><div className="text-center"><Clock className="h-12 w-12 mx-auto mb-4" /><p>{isLoading ? "Loading..." : "No response time data"}</p></div></div>) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timeRange" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#6366f1" /></BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || staffPerformance.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-4" />
                    <p>{isLoading ? "Loading data..." : "No staff performance data available yet"}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {staffPerformance.map((staff, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {staff.resolved} resolved • Avg: {staff.avgTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <span className="text-sm font-medium">{staff.satisfaction}</span>
                          <span className="text-xs text-muted-foreground">/ 5</span>
                        </div>
                        <Badge 
                           variant="outline"
                           className={
                            staff.satisfaction >= 4.5 
                            ? "border-green-500 text-green-600" 
                            : staff.satisfaction >= 4.0 
                            ? "border-yellow-500 text-yellow-600" 
                            : "border-red-500 text-red-600"
                          }
                        >
                          {staff.satisfaction >= 4.5 ? "Excellent" : staff.satisfaction >= 4.0 ? "Good" : "Average"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
