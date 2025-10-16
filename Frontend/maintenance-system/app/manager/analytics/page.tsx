"use client"

import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, TrendingDown, BarChart3, Calendar, AlertTriangle } from "lucide-react";
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';

export default function AnalyticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false); // State for export button
  
  const [detailedTrends, setDetailedTrends] = useState<any[]>([]);
  const [buildingPerformance, setBuildingPerformance] = useState<any[]>([]);
  const [resolutionTimeByCategory, setResolutionTimeByCategory] = useState<any[]>([]);
  const [recurringIssues, setRecurringIssues] = useState<any[]>([]);

  const [timeRange, setTimeRange] = useState("7d");
  const [buildingFilter, setBuildingFilter] = useState("all");

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const queryParams = `?timeRange=${timeRange}&building=${buildingFilter}`;
        const response = await fetch(`http://localhost:5229/analytics/detailed${queryParams}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch analytics data.");
        }

        const data = await response.json();
        
        setDetailedTrends(data.detailedTrends);
        setBuildingPerformance(data.buildingPerformance);
        setResolutionTimeByCategory(data.resolutionTimeByCategory);
        setRecurringIssues(data.recurringIssues);

      } catch (err) {
        console.error("Error fetching analytics data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange, buildingFilter]); 

  const getTrendIcon = (trend: string) => {
    if (trend === "down") {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return <div className="h-4 w-4" />;
  };

  const handleExportReport = () => {
    const node = reportRef.current;
    if (!node) {
      console.error("Report element not found!");
      return;
    }

    setIsExporting(true); 

    domtoimage.toPng(node, {
        quality: 0.98,
        bgcolor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      })
      .then(function (dataUrl: string) {
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            const imgWidth = img.width;
            const imgHeight = img.height;
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const ratio = pdfWidth / imgWidth;
            const scaledHeight = imgHeight * ratio;

            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, scaledHeight);
            
            pdf.save(`analytics-report-${new Date().toISOString().slice(0, 10)}.pdf`);
            setIsExporting(false); 
          }
      })
      .catch(function (error: any) {
          console.error('PDF export failed!', error);
          setIsExporting(false); 
      });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userType="manager" currentPage="/manager/analytics" />

      <div ref={reportRef} className="max-w-7xl mx-auto p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push("/manager/dashboard")} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Detailed Analytics</h1>
              <p className="text-gray-500">In-depth maintenance management insights</p>
            </div>
          </div>
          <Button onClick={handleExportReport} disabled={isLoading || isExporting} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center space-x-2 disabled:opacity-50">
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-600">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-600">Building</label>
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    <SelectItem value="A">Building A</SelectItem>
                    <SelectItem value="B">Building B</SelectItem>
                    <SelectItem value="C">Building C</SelectItem>
                    <SelectItem value="D">Building D</SelectItem>
                    <SelectItem value="E">Building E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Issue Trends Card */}
        <Card className="mb-6 shadow-sm">
          <CardHeader><CardTitle>Daily Issue Trends</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (<div className="h-[400px] flex items-center justify-center text-gray-500"><Calendar className="h-8 w-8 mr-2" /> Loading data...</div>) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={detailedTrends} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="reported" stackId="1" stroke="#8b5cf6" fill="#c4b5fd" name="Reported" />
                  <Area type="monotone" dataKey="resolved" stackId="1" stroke="#10b981" fill="#6ee7b7" name="Resolved" />
                  <Area type="monotone" dataKey="urgent" stackId="1" stroke="#ef4444" fill="#fca5a5" name="Urgent" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Performance by Building Card */}
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Performance by Building</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (<div className="h-[300px] flex items-center justify-center text-gray-500"><BarChart3 className="h-8 w-8 mr-2" /> Loading data...</div>) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={buildingPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="building" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Bar dataKey="issues" fill="#6366f1" name="Total Issues" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Avg Resolution Time by Category Card */}
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Avg Resolution Time by Category</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (<div className="h-[300px] flex items-center justify-center text-gray-500"><AlertTriangle className="h-8 w-8 mr-2" /> Loading data...</div>) : (
                <div className="space-y-4">
                  {resolutionTimeByCategory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{item.category}</p>
                        <p className="text-sm text-gray-500">{item.avgHours} hours average</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(item.trend)}
                        <span className="text-sm font-medium text-gray-700">{item.avgHours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recurring Issues Analysis Card */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Recurring Issues Analysis</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (<div className="p-8 text-center text-gray-500">Loading data...</div>) : recurringIssues.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No recurring issues identified</h3>
                <p>No patterns of recurring maintenance issues have been detected yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recurringIssues.map((issue, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{issue.issue}</p>
                      <p className="text-sm text-gray-500">Affected buildings: {issue.buildings.join(", ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{issue.occurrences}</p>
                      <p className="text-sm text-gray-500">occurrences</p>
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
