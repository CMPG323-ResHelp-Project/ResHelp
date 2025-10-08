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
  const [issues, setIssues] = useState<Issue[]>([]);
  const [overviewStats, setOverviewStats] = useState({
    totalIssues: 0,
    resolvedIssues: 0,
    avgResponseTime: "0 hours",
    avgResolutionTime: "0 hours",
    studentSatisfaction: 0,
    activeStaff: 0,
  });
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const response = await fetch("http://localhost:5229/issue/analytics", { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch issues");
        const issuesList: Issue[] = await response.json();
        setIssues(issuesList);
      } catch (err: any) {
        console.error(err.message);
      }
    };
    fetchIssues();
  }, []);

  useEffect(() => {
    if (issues.length > 0) {
      const resolved = issues.filter(i => i.Status === "Resolved").length;
      setOverviewStats({
        totalIssues: issues.length,
        resolvedIssues: resolved,
        avgResponseTime: "N/A", 
        avgResolutionTime: "N/A", 
        studentSatisfaction: 4.5, 
        activeStaff: 5, 
      });

      const trends = new Map<string, { month: string; reported: number; resolved: number; pending: number }>();
      issues.forEach(issue => {
        const month = new Date(issue.ReportedAt).toLocaleString('default', { month: 'short' });
        if (!trends.has(month)) {
          trends.set(month, { month, reported: 0, resolved: 0, pending: 0 });
        }
        const data = trends.get(month)!;
        data.reported++;
        if (issue.Status === "Resolved") data.resolved++;
        if (issue.Status === "Pending" || issue.Status === "Assigned") data.pending++;
      });
      setMonthlyTrends(Array.from(trends.values()));

      const categories = new Map<string, number>();
      issues.forEach(issue => {
        categories.set(issue.Category, (categories.get(issue.Category) || 0) + 1);
      });
      const categoryColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
      setCategoryData(Array.from(categories.entries()).map(([name, value], index) => ({
        name,
        value,
        color: categoryColors[index % categoryColors.length]
      })));

      setResponseTimeData([
        { timeRange: "< 1hr", count: 15 },
        { timeRange: "1-4hr", count: 30 },
        { timeRange: "4-24hr", count: 20 },
        { timeRange: "> 24hr", count: 5 },
      ]);
      setStaffPerformance([
        { name: "John Doe", resolved: 25, avgTime: "3.5h", satisfaction: 4.8 },
        { name: "Jane Smith", resolved: 18, avgTime: "4.1h", satisfaction: 4.5 },
      ]);
    }
  }, [issues]);


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
            <BarChart3 className="h-4 w-4" />
            <span>Detailed Analytics</span>
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Issues</p>
                  <p className="text-2xl font-bold">{overviewStats.totalIssues}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold">{overviewStats.resolvedIssues}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{overviewStats.avgResponseTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Resolution</p>
                  <p className="text-2xl font-bold">{overviewStats.avgResolutionTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Satisfaction</p>
                  <p className="text-2xl font-bold">{overviewStats.studentSatisfaction}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-cyan-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Staff</p>
                  <p className="text-2xl font-bold">{overviewStats.activeStaff}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Issue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrends.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p>No trend data available yet</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="reported" stroke="#6366f1" strokeWidth={2} name="Reported" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                    <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Issue Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Issues by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p>No category data available yet</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {responseTimeData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-4" />
                    <p>No response time data available yet</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timeRange" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Staff Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {staffPerformance.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-4" />
                    <p>No staff performance data available yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {staffPerformance.map((staff, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {staff.resolved} resolved • Avg: {staff.avgTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium">{staff.satisfaction}</span>
                          <span className="text-xs text-muted-foreground">/5</span>
                        </div>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {staff.satisfaction >= 4.3 ? "Excellent" : staff.satisfaction >= 4.0 ? "Good" : "Average"}
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
