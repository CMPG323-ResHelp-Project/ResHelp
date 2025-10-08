using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
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
                .WhereEqualTo("Status", "Resolved")
                .WhereNotEqualTo("ResolvedBy", null)
                .GetSnapshotAsync();
            var staffPerformance = snapshot.Documents
                .GroupBy(doc => doc.ToDictionary().GetValueOrDefault("ResolvedBy")?.ToString())
                .Select(group => {
                    var ratings = group.Select(doc => doc.ToDictionary().GetValueOrDefault("Rating")).Where(r => r != null && int.TryParse(r.ToString(), out _)).Select(r => int.Parse(r.ToString())).ToList();
                    var resolutionTimes = group.Select(doc => {
                        var issue = doc.ToDictionary();
                        if (issue.TryGetValue("ReportedAt", out var rAtObj) && rAtObj is Timestamp rAt && issue.TryGetValue("UpdatedAt", out var uAtObj) && uAtObj is Timestamp uAt)
                        {
                            return (uAt.ToDateTime() - rAt.ToDateTime()).TotalHours;
                        }
                        return -1.0;
                    }).Where(h => h >= 0).ToList();
                    return new { name = group.Key, resolved = group.Count(), satisfaction = ratings.Any() ? Math.Round(ratings.Average(), 1) : 0, avgTime = resolutionTimes.Any() ? $"{Math.Round(resolutionTimes.Average(), 1)}h" : "N/A" };
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
