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

type Issue = {
  Title: string;
  Description: string;
  Status: "Pending" | "Assigned" | "Resolved" | "Cancelled";
  Priority: "High" | "Medium" | "Low";
  Category: string; // Issue category (e.g., Plumbing, Electrical, Structural)
  Location: string; // Specific location (e.g., House 2E, Room 204)
  IsUrgentSafetyHazard: boolean; // Urgent safety hazard flag
  ReportedAt: string;
  UpdatedAt: string;
  ReporterEmail: string;
  Rating?: number;
};

export default function AnalyticsPage() {

  const [issue, setIssue] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTableLoading, setIsTableLoading] = useState(false);

  const [detailedTrends, setDetailedTrends] = useState<any[]>([]);
  const [buildingPerformance, setBuildingPerformance] = useState<any[]>([]);
  const [recurringIssues, setRecurringIssues] = useState<any[]>([]);
  const [resolutionTimeByCategory, setResolutionTimeByCategory] = useState<any[]>([]);

  const [timeRange, setTimeRange] = useState("7d")
  const [buildingFilter, setBuildingFilter] = useState("all")
  const router = useRouter()

  useEffect(() => {
    const fetchIssues = async () => {
      setErrorMessage(null);
      setIsTableLoading(true);
  
      try {
        const response = await fetch("http://localhost:5229/issue/analytics", { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch issues");
  
        const issuesList: Issue[] = await response.json();
        console.log("Fetched issues:", issuesList);
        setIssue(issuesList); 
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setIsTableLoading(false);
      }
    };
  
    fetchIssues();
  }, []);

  // Effect to filter issues based on timeRange and buildingFilter
  useEffect(() => {
    let processedIssues = [...issue];

    // Filter by Time Range
    const now = new Date();
    let startDate = new Date();
    let applyTimeFilter = true;

    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        applyTimeFilter = false;
        break;
    }
    
    if(applyTimeFilter) {
        processedIssues = processedIssues.filter(i => new Date(i.ReportedAt) >= startDate);
    }

    // Filter by Building
    if (buildingFilter !== "all") {
      processedIssues = processedIssues.filter(i => {
        const buildingMatch = i.Location.match(/Building\s([A-E])/i);
        const building = buildingMatch ? buildingMatch[1].toLowerCase() : null;
        return building === buildingFilter;
      });
    }
    
    setFilteredIssues(processedIssues);
  }, [issue, timeRange, buildingFilter]);

  // All subsequent useEffect hooks now depend on `filteredIssues`
  useEffect(() => {
    if (filteredIssues.length > 0) {
      const inactiveStatuses = ["Resolved", "Cancelled"];

      const trends = new Map<
        string,
        { date: string; reported: number; resolved: number; urgent: number }
      >();

      filteredIssues.forEach((i) => {
        const reportedDateKey = new Date(i.ReportedAt).toISOString().split('T')[0];

        if (!trends.has(reportedDateKey)) {
          trends.set(reportedDateKey, {
            date: reportedDateKey,
            reported: 0,
            resolved: 0,
            urgent: 0,
          });
        }

        const dayData = trends.get(reportedDateKey)!;
        dayData.reported += 1;

        const isInactive = inactiveStatuses.some(
          (inactiveStatus) => inactiveStatus.toUpperCase() === i.Status?.toUpperCase()
        );
        const isActive = !isInactive;

        if (i.Priority.toUpperCase() === "HIGH" && isActive) {
          dayData.urgent += 1;
        }

        if (!isActive && i.UpdatedAt) {
          const completionDateKey = new Date(i.UpdatedAt).toISOString().split('T')[0];
          
          if (!trends.has(completionDateKey)) {
            trends.set(completionDateKey, {
              date: completionDateKey,
              reported: 0,
              resolved: 0,
              urgent: 0,
            });
          }
          trends.get(completionDateKey)!.resolved += 1;
        }
      });

      const trendsArray = Array.from(trends.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setDetailedTrends(trendsArray);
    } else {
      setDetailedTrends([]);
    }
  }, [filteredIssues]);

  useEffect(() => {
    if (filteredIssues.length > 0) {
      const issuesByBuilding = filteredIssues.reduce((buildingCounts, currentIssue) => {
        const buildingMatch = currentIssue.Location.match(/Building\s([A-E])/i);
        const building = buildingMatch ? `Building ${buildingMatch[1].toUpperCase()}` : "Building Unknown";

        if (!buildingCounts[building]) {
          buildingCounts[building] = 0;
        }
        buildingCounts[building]++;
        
        return buildingCounts;
      }, {} as Record<string, number>);

      const formattedData = Object.keys(issuesByBuilding).map(buildingName => ({
        building: buildingName,
        issues: issuesByBuilding[buildingName],
      }));

      setBuildingPerformance(formattedData);
    } else {
        setBuildingPerformance([]);
    }
  }, [filteredIssues]); 

  useEffect(() => {
    if (filteredIssues.length > 0) {
      const resolvedIssues = filteredIssues.filter(i => 
        i.ReportedAt && 
        i.UpdatedAt &&
        i.Status?.toUpperCase() === "RESOLVED" 
      );

      const timesByCategory = resolvedIssues.reduce((groupedTimesByCategory, currentIssue) => {
        const category = currentIssue.Category || "Uncategorised";

        if (!groupedTimesByCategory[category]) {
          groupedTimesByCategory[category] = [];
        }

        const reportedDate = new Date(currentIssue.ReportedAt);
        const updatedDate = new Date(currentIssue.UpdatedAt);
        const diffInMilliseconds = updatedDate.getTime() - reportedDate.getTime();
        
        const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
        groupedTimesByCategory[category].push(diffInHours);

        return groupedTimesByCategory;
      }, {} as Record<string, number[]>);

      const formattedData = Object.keys(timesByCategory).map(categoryName => {
        const allTimes = timesByCategory[categoryName];
        const sumOfTimes = allTimes.reduce((total, time) => total + time, 0);
        const averageTime = sumOfTimes / allTimes.length;

        return {
          category: categoryName,
          avgHours: Math.round(averageTime * 10) / 10,
          trend: 'down', 
        };
      });

      setResolutionTimeByCategory(formattedData);
    } else {
      setResolutionTimeByCategory([]);
    }
  }, [filteredIssues]); 

  useEffect(() => {
    if (filteredIssues.length > 0) {
      const issuesByTitle = filteredIssues.reduce((groupedIssues, currentIssue) => {
        const title = currentIssue.Title.trim();

        if (!groupedIssues[title]) {
          groupedIssues[title] = {
            issue: title,
            occurrences: 0,
            buildings: new Set<string>(),
          };
        }

        groupedIssues[title].occurrences += 1;

        const buildingMatch = currentIssue.Location.match(/Building\s([A-E])|House\s\d([A-E])/i);
        const building = buildingMatch ? buildingMatch[1]?.toUpperCase() || buildingMatch[2]?.toUpperCase() : "Unknown";
        
        groupedIssues[title].buildings.add(building);
        return groupedIssues;
      }, {} as Record<string, { issue: string; occurrences: number; buildings: Set<string> }>);

      const formattedData = Object.values(issuesByTitle)
        .filter(item => item.occurrences > 1)
        .map(item => ({
          ...item,
          buildings: Array.from(item.buildings),
        }));

      const sortedData = formattedData.sort((a, b) => b.occurrences - a.occurrences);
      setRecurringIssues(sortedData);
    } else {
        setRecurringIssues([]);
    }
  }, [filteredIssues]);

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
            {detailedTrends.length === 0 ? (
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
                  <Area
                    type="monotone"
                    dataKey="reported"
                    stackId="1"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.6}
                    name="Reported"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stackId="2"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="Resolved"
                  />
                  <Area
                    type="monotone"
                    dataKey="urgent"
                    stackId="3"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                    name="Urgent"
                  />
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
              {buildingPerformance.length === 0 ? (
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
              {resolutionTimeByCategory.length === 0 ? (
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
            {recurringIssues.length === 0 ? (
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
