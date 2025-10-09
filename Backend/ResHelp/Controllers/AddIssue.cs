using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("issue")]
    public class AddIssueController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public AddIssueController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

      // -------------------- Add Issue --------------------
// -------------------- Add Issue --------------------
[HttpPost("add")]
public async Task<IActionResult> AddIssue([FromBody] IssueDto issue)
{
    if (issue == null || string.IsNullOrEmpty(issue.ReporterEmail))
        return BadRequest("Issue data and reporter email are required.");

    try
    {
        // --- 1️⃣ Get the user from Firestore ---
        var userSnapshot = await _firestoreDb
            .Collection("users")
            .WhereEqualTo("Email", issue.ReporterEmail)
            .GetSnapshotAsync();

        if (userSnapshot.Documents.Count == 0)
            return BadRequest("No such user exists.");

        var userData = userSnapshot.Documents[0].ToDictionary();
        string reporterName = userData.GetValueOrDefault("Name")?.ToString() ?? issue.ReporterEmail;
        string location = userData.GetValueOrDefault("Address")?.ToString() ?? "";

        // --- 2️⃣ Prepare the issue document ---
        var issueId = Guid.NewGuid().ToString();
        var issueDoc = new Dictionary<string, object>
        {
            { "Id", issueId },
            { "Title", issue.Title },
            { "Description", issue.Description },
            { "Category", issue.Category },
            { "Priority", issue.Priority },
            { "Location", location }, // now uses front-end value
            { "ImageUrl", issue.ImageUrl ?? "" },
            { "IsUrgent", issue.IsUrgent },
            { "ReporterEmail", issue.ReporterEmail },
            { "ReporterName", reporterName },
            { "Status", "Pending" },
            { "ReportedAt", DateTime.UtcNow },
            { "UpdatedAt", DateTime.UtcNow },
            { "Rating", (int?)null }
        };

        var docRef = _firestoreDb.Collection("issues").Document(issueId);
        await docRef.SetAsync(issueDoc);

        // --- 3️⃣ Send confirmation email ---
        using var client = new SmtpClient("smtp.gmail.com", 587)
        {
            Credentials = new NetworkCredential("muhleusurp@gmail.com", "ryxz xaud rpcb xeos"),
            EnableSsl = true
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress("muhleusurp@gmail.com", "ResHelp"),
            Subject = "Issue Report Confirmation",
            Body = $@"
                Hello {reporterName},<br/><br/>
                Your issue has been reported successfully.<br/>
                <b>Title:</b> {issue.Title}<br/>
                <b>Description:</b> {issue.Description}<br/>
                <b>Status:</b> Pending<br/>
                Reported At: {DateTime.UtcNow}<br/><br/>
                Thank you,<br/>ResHelp Team",
            IsBodyHtml = true
        };
        mailMessage.To.Add(issue.ReporterEmail);
        await client.SendMailAsync(mailMessage);

        return Ok(new { message = "Issue added successfully.", id = issueId });
    }
    catch (Exception ex)
    {
        return StatusCode(500, ex.Message);
    }
}


[HttpGet("check")]
public async Task<IActionResult> CheckUserEmail([FromQuery] string email)
{
    var snapshot = await _firestoreDb
        .Collection("users")
        .WhereEqualTo("Email", email)
        .GetSnapshotAsync();

    if (snapshot.Documents.Count == 0)
        return Ok(new { exists = false });

    var userData = snapshot.Documents[0].ToDictionary();
    string userType = userData.GetValueOrDefault("UserType")?.ToString() ?? "";

    return Ok(new
    {
        exists = true,
        userType
    });
}


     // -------------------- Update Issue --------------------
[HttpPut("update/{id}")]
public async Task<IActionResult> UpdateIssue(string id, [FromBody] IssueDto issue)
{
    if (string.IsNullOrEmpty(id))
        return BadRequest("Issue ID is required.");

    if (issue == null)
        return BadRequest("Issue data is required.");

    var docRef = _firestoreDb.Collection("issues").Document(id);
    var snapshot = await docRef.GetSnapshotAsync();

    if (!snapshot.Exists)
        return NotFound("Issue not found.");

    var existing = snapshot.ToDictionary();

    // Optional: Only allow updates for Pending issues
    if (existing.ContainsKey("Status") && existing["Status"]?.ToString() != "Pending")
        return BadRequest("Only issues with status 'Pending' can be updated.");

    var updates = new Dictionary<string, object>
    {
        { "Title", issue.Title },
        { "Description", issue.Description },
        { "Category", issue.Category },
        { "Priority", issue.Priority },
        { "Location", issue.Location },
        { "ImageUrl", issue.ImageUrl ?? "" },
        { "IsUrgent", issue.IsUrgent },
        { "UpdatedAt", DateTime.UtcNow }
    };

    await docRef.UpdateAsync(updates);
    return Ok(new { message = "Issue updated successfully.", id });
}


        // -------------------- Cancel Issue --------------------
[HttpPut("cancel/{id}")]
public async Task<IActionResult> CancelIssue(string id)
{
    if (string.IsNullOrEmpty(id))
        return BadRequest("Issue ID is required.");

    var docRef = _firestoreDb.Collection("issues").Document(id);
    var snapshot = await docRef.GetSnapshotAsync();

    if (!snapshot.Exists)
        return NotFound("Issue not found.");

    // No email check — anyone can cancel
    await docRef.UpdateAsync(new Dictionary<string, object>
    {
        { "Status", "Cancelled" },
        { "UpdatedAt", DateTime.UtcNow }
    });

    return Ok(new { message = "Issue cancelled successfully.", id, status = "Cancelled" });
}

[HttpGet("analytics")] 
public async Task<IActionResult> GetAllIssuesForAnalytics()
{
    try
    {
        var issuesQuery = _firestoreDb.Collection("issues");
        var snapshot = await issuesQuery.GetSnapshotAsync();

        var issuesList = new List<Dictionary<string, object?>>();

        foreach (var doc in snapshot.Documents)
        {
            var issueDict = new Dictionary<string, object?>();

            foreach (var field in doc.ToDictionary())
            {
                issueDict[field.Key] = SanitizeValue(field.Value);
            }
            issuesList.Add(issueDict);
        }

        return Ok(issuesList);
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "An internal server error occurred: " + ex.Message });
    }
}
    private static object? SanitizeValue(object? value)
    {
        if (value is Timestamp ts)
        {
            return ts.ToDateTime().ToUniversalTime().ToString("o");
        }

        if (value is string s && !string.IsNullOrEmpty(s))
        {
            if (DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.RoundtripKind, out var parsedDate))
            {
                return parsedDate.ToUniversalTime().ToString("o");
            }
        }
        return value;
    }

        [HttpGet("get")]
        public async Task<IActionResult> GetAllIssues()
        {
            try
            {
                var issuesSnapshot = await _firestoreDb.Collection("issues").GetSnapshotAsync();
                var issuesList = new List<RequestDto>();

                foreach (var doc in issuesSnapshot.Documents)
                {
                    var data = doc.ToDictionary();
                    issuesList.Add(new RequestDto
                    {
                        Id = data.ContainsKey("Id") ? data["Id"].ToString() : doc.Id,

                        Title = data.ContainsKey("Title") ? data["Title"].ToString() : string.Empty,
                        Description = data.ContainsKey("Description") ? data["Description"].ToString() : string.Empty,
                        Category = data.ContainsKey("Category") ? data["Category"].ToString() : string.Empty,
                        Priority = data.ContainsKey("Priority") ? data["Priority"].ToString() : string.Empty,
                        Location = data.ContainsKey("Location") ? data["Location"].ToString() : string.Empty,

                        IsUrgent = data.ContainsKey("IsUrgent") && Convert.ToBoolean(data["IsUrgent"]),

                        Status = data.ContainsKey("Status") ? data["Status"].ToString() : "Pending",

                        ReportedAt = data.ContainsKey("ReportedAt") && data["ReportedAt"] is Google.Cloud.Firestore.Timestamp ts
                            ? ts.ToDateTime().ToString("o") 
                            : string.Empty, 

                        ReporterEmail = data.ContainsKey("ReporterEmail") ? data["ReporterEmail"].ToString() : string.Empty,
                        ReporterName = data.ContainsKey("ReporterName") ? data["ReporterName"].ToString() : string.Empty,
                    });
                }

                return Ok(issuesList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error: " + ex.Message });
            }
        }
    }
}