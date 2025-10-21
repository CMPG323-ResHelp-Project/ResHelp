using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("analytics")]
    public class AnalyticsController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public AnalyticsController(FirestoreDb firestoreDb)
        {
            this._firestoreDb = firestoreDb;
        }

            [HttpGet("detailed")]
            public async Task<IActionResult> GetDetailedAnalytics([FromQuery] string timeRange = "7d", [FromQuery] string building = "all")
            {
                var issuesCollection = _firestoreDb.Collection("issues");
                var snapshot = await issuesCollection.GetSnapshotAsync();

                var allIssues = snapshot.Documents.Select(doc => {
                    var data = doc.ToDictionary();

                    T GetValue<T>(string key)
                    {
                        if (data.TryGetValue(key, out var value) && value is T typedValue)
                        {
                            return typedValue;
                        }
                        return default(T);
                    }
                    return new Issue
                    {
                        Title = GetValue<string>("Title") ?? "",
                        Status = GetValue<string>("Status") ?? "",
                        Priority = GetValue<string>("Priority") ?? "",
                        Category = GetValue<string>("Category") ?? "Uncategorised",
                        Location = GetValue<string>("Location") ?? "",
                        ReportedAt = GetValue<Timestamp>("ReportedAt"),
                        UpdatedAt = GetValue<Timestamp>("UpdatedAt")
                    };
                }).Where(i => i.ReportedAt != default(Timestamp)).ToList();

                var now = DateTime.UtcNow;
                var startDate = now;
                switch (timeRange)
                {
                    case "7d": startDate = now.AddDays(-7); break;
                    case "30d": startDate = now.AddDays(-30); break;
                    case "90d": startDate = now.AddMonths(-3); break;
                    case "1y": startDate = now.AddYears(-1); break;
                }
                var filteredIssues = allIssues.Where(i => i.ReportedAt.ToDateTime() >= startDate).ToList();

                if (building != "all")
                {
                    filteredIssues = filteredIssues.Where(i => {
                        var match = Regex.Match(i.Location, @"Building\s([A-E])", RegexOptions.IgnoreCase);
                        return match.Success && match.Groups[1].Value.Equals(building, StringComparison.OrdinalIgnoreCase);
                    }).ToList();
                }

                // Daily Issue Trends
                var trends = new Dictionary<string, (int reported, int resolved, int urgent)>();
                string[] inactiveStatuses = { "RESOLVED", "CANCELLED" };

                foreach (var issue in filteredIssues)
                {
                    var reportedDateKey = issue.ReportedAt.ToDateTime().ToString("yyyy-MM-dd");
                    if (!trends.ContainsKey(reportedDateKey)) trends[reportedDateKey] = (0, 0, 0);
                    trends[reportedDateKey] = (trends[reportedDateKey].reported + 1, trends[reportedDateKey].resolved, trends[reportedDateKey].urgent);

                    bool isActive = !inactiveStatuses.Contains(issue.Status?.ToUpper());
                    if (issue.Priority?.ToUpper() == "HIGH" && isActive)
                    {
                        trends[reportedDateKey] = (trends[reportedDateKey].reported, trends[reportedDateKey].resolved, trends[reportedDateKey].urgent + 1);
                    }

                    if (!isActive && issue.UpdatedAt != default(Timestamp))
                    {
                        var resolvedDateKey = issue.UpdatedAt.ToDateTime().ToString("yyyy-MM-dd");
                        if (!trends.ContainsKey(resolvedDateKey)) trends[resolvedDateKey] = (0, 0, 0);
                        trends[resolvedDateKey] = (trends[resolvedDateKey].reported, trends[resolvedDateKey].resolved + 1, trends[resolvedDateKey].urgent);
                    }
                }
                var detailedTrends = trends.Select(kvp => new { date = kvp.Key, reported = kvp.Value.reported, resolved = kvp.Value.resolved, urgent = kvp.Value.urgent })
                                           .OrderBy(t => t.date);

                // Building Performance
                var buildingPerformance = filteredIssues
                    .GroupBy(i => {
                        var match = Regex.Match(i.Location, @"Building\s([A-E])", RegexOptions.IgnoreCase);
                        return match.Success ? $"Building {match.Groups[1].Value.ToUpper()}" : "Building Unknown";
                    })
                    .Select(g => new { building = g.Key, issues = g.Count() });

                // Resolution Time By Category
                var resolutionTimeByCategory = filteredIssues
                    .Where(i => i.Status?.ToUpper() == "RESOLVED" && i.UpdatedAt != default(Timestamp))
                    .GroupBy(i => i.Category)
                    .Select(g => {
                        var avgHours = g.Average(i => (i.UpdatedAt.ToDateTime() - i.ReportedAt.ToDateTime()).TotalHours);
                        return new
                        {
                            category = g.Key,
                            avgHours = Math.Round(avgHours, 1),
                            trend = "down" 
                        };
                    });

                // Recurring Issues Analysis
                var recurringIssues = filteredIssues
                    .GroupBy(i => i.Title.Trim())
                    .Where(g => g.Count() > 1)
                    .Select(g => new {
                        issue = g.Key,
                        occurrences = g.Count(),
                        buildings = g.Select(i => {
                            var match = Regex.Match(i.Location, @"Building\s([A-E])", RegexOptions.IgnoreCase);
                            return match.Success ? match.Groups[1].Value.ToUpper() : "Unknown";
                        }).Distinct().ToList()
                    })
                    .OrderByDescending(i => i.occurrences);


                return Ok(new
                {
                    detailedTrends,
                    buildingPerformance,
                    resolutionTimeByCategory,
                    recurringIssues
                });
            }

            [HttpGet("overview")]
        public async Task<IActionResult> GetOverviewStats()
        {
            var issuesCollection = _firestoreDb.Collection("issues");
            var snapshot = await issuesCollection.GetSnapshotAsync();

            var resolutionTimesInHours = new List<double>();
            var responseTimesInHours = new List<double>();
            var ratings = new List<int>();
            int resolvedIssuesCount = 0;

            foreach (var doc in snapshot.Documents)
            {
                var issue = doc.ToDictionary();
                if (issue.GetValueOrDefault("Status")?.ToString()?.ToLower() == "resolved")
                {
                    resolvedIssuesCount++;
                    if (issue.TryGetValue("ReportedAt", out var rAtObj) && rAtObj is Timestamp rAt &&
                        issue.TryGetValue("UpdatedAt", out var uAtObj) && uAtObj is Timestamp uAt)
                    {
                        resolutionTimesInHours.Add((uAt.ToDateTime() - rAt.ToDateTime()).TotalHours);
                    }
                }
                if (issue.TryGetValue("ReportedAt", out var reportedAtObj) && reportedAtObj is Timestamp reportedAt &&
                    issue.TryGetValue("AssignedAt", out var assignedAtObj) && assignedAtObj is Timestamp assignedAt)
                {
                    responseTimesInHours.Add((assignedAt.ToDateTime() - reportedAt.ToDateTime()).TotalHours);
                }
                if (issue.TryGetValue("Rating", out var ratingObj) && ratingObj != null && int.TryParse(ratingObj.ToString(), out int rating))
                {
                    ratings.Add(rating);
                }
            }

            var overview = new
            {
                totalIssues = snapshot.Count,
                resolvedIssues = resolvedIssuesCount,
                avgResponseTime = responseTimesInHours.Any() ? $"{Math.Round(responseTimesInHours.Average(), 1)}h" : "N/A",
                avgResolutionTime = resolutionTimesInHours.Any() ? $"{Math.Round(resolutionTimesInHours.Average(), 1)}h" : "N/A",
                studentSatisfaction = ratings.Any() ? Math.Round(ratings.Average(), 1) : 0,
                activeStaff = 5
            };
            return Ok(overview);
        }

        [HttpGet("monthly-trends")]
        public async Task<IActionResult> GetMonthlyTrends()
        {
            var snapshot = await _firestoreDb.Collection("issues").GetSnapshotAsync();
            var trends = snapshot.Documents
                .Select(doc => doc.ToDictionary())
                .GroupBy(issue => issue.GetValueOrDefault("ReportedAt") is Timestamp ts ? new DateTime(ts.ToDateTime().Year, ts.ToDateTime().Month, 1) : DateTime.MinValue)
                .Where(g => g.Key != DateTime.MinValue)
                .Select(g => new {
                    month = g.Key.ToString("MMM", CultureInfo.InvariantCulture),
                    reported = g.Count(),
                    resolved = g.Count(issue => issue.GetValueOrDefault("Status")?.ToString()?.ToLower() == "resolved"),
                    pending = g.Count(issue => new[] { "pending", "assigned" }.Contains(issue.GetValueOrDefault("Status")?.ToString()?.ToLower()))
                })
                .OrderBy(t => DateTime.ParseExact(t.month, "MMM", CultureInfo.InvariantCulture))
                .ToList();
            return Ok(trends);
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetIssueCategories()
        {
            var snapshot = await _firestoreDb.Collection("issues").GetSnapshotAsync();
            var categoryData = snapshot.Documents
                .GroupBy(doc => doc.ToDictionary().GetValueOrDefault("Category")?.ToString() ?? "Uncategorized")
                .Select(g => new { name = g.Key, value = g.Count() })
                .ToList();
            return Ok(categoryData);
        }

        [HttpGet("staff-performance")]
        public async Task<IActionResult> GetStaffPerformance()
        {
            var snapshot = await _firestoreDb.Collection("issues")
                .WhereNotEqualTo("ResolvedBy", null)
                .GetSnapshotAsync();

            var staffPerformance = snapshot.Documents
                .Where(doc => doc.ToDictionary().GetValueOrDefault("Status")?.ToString()?.ToLower() == "resolved")
                .GroupBy(doc => doc.ToDictionary().GetValueOrDefault("ResolvedBy")?.ToString())
                .Select(group => {
                    var ratings = group
                        .Select(doc => doc.ToDictionary().GetValueOrDefault("Rating"))
                        .Where(r => r != null && int.TryParse(r.ToString(), out _))
                        .Select(r => int.Parse(r.ToString()))
                        .ToList();

                    var resolutionTimes = group.Select(doc => {
                        var issue = doc.ToDictionary();
                        if (issue.TryGetValue("ReportedAt", out var reportedAtObj) && reportedAtObj is Timestamp reportedAt &&
                            issue.TryGetValue("AssignedAt", out var assignedAtObj) && assignedAtObj is Timestamp assignedAt)
                        {
                            return (assignedAt.ToDateTime() - reportedAt.ToDateTime()).TotalHours;
                        }
                        return -1.0; 
                    }).Where(h => h >= 0).ToList(); 

                    return new
                    {
                        name = group.Key,
                        resolved = group.Count(),
                        satisfaction = ratings.Any() ? Math.Round(ratings.Average(), 1) : 0,
                        avgTime = resolutionTimes.Any() ? $"{Math.Round(resolutionTimes.Average(), 1)}h" : "N/A"
                    };
                })
                .Where(s => !string.IsNullOrEmpty(s.name)) 
                .OrderByDescending(s => s.resolved)
                .ToList();

            return Ok(staffPerformance);
        }

        [HttpGet("response-times")]
        public async Task<IActionResult> GetResponseTimes()
        {
            var snapshot = await _firestoreDb.Collection("issues").WhereNotEqualTo("AssignedAt", null).GetSnapshotAsync();
            var responseTimes = new List<double>();
            foreach (var doc in snapshot.Documents)
            {
                var issue = doc.ToDictionary();
                if (issue.TryGetValue("ReportedAt", out var rAtObj) && rAtObj is Timestamp rAt &&
                   issue.TryGetValue("AssignedAt", out var assignedAtObj) && assignedAtObj is Timestamp assignedAt)
                {
                    responseTimes.Add((assignedAt.ToDateTime() - rAt.ToDateTime()).TotalHours);
                }
            }
            var responseTimeData = new[] {
                new { timeRange = "< 1hr", count = responseTimes.Count(t => t < 1) },
                new { timeRange = "1-4hr", count = responseTimes.Count(t => t >= 1 && t < 4) },
                new { timeRange = "4-24hr", count = responseTimes.Count(t => t >= 4 && t < 24) },
                new { timeRange = "> 24hr", count = responseTimes.Count(t => t >= 24) },
            };
            return Ok(responseTimeData);
        }
    }
}

    internal class Issue
    {
        public string Title { get; set; }
        public string Status { get; set; }
        public string Priority { get; set; }
        public string Category { get; set; }
        public string Location { get; set; }
        public Timestamp ReportedAt { get; set; }
        public Timestamp UpdatedAt { get; set; }
    }