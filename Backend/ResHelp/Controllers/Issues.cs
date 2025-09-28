using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using ResHelp.Services;
using System;
using System.Threading.Tasks;
using System.Collections.Generic; // Added for Dictionary use

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class IssuesController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly EmailService _emailService;

        public IssuesController(FirestoreDb firestoreDb , EmailService emailService )
        {
            _firestoreDb = firestoreDb;
            _emailService = emailService;
        }

        [HttpPost("report")]
        public async Task<IActionResult> ReportIssue(
            [FromBody] IssueDto issue,
            [FromHeader(Name = "Authorization")] string authorization)
        {
            if (issue == null)
                return BadRequest(new { error = "Issue data is required." });

            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            try
            {
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
                string uid = decodedToken.Uid;

                // Prepare Firestore document with additional backend fields
                var issueDoc = new
                {
                    Id = Guid.NewGuid().ToString(),      // Backend-generated unique ID
                    Title = issue.Title,
                    Description = issue.Description,
                    Category = issue.Category,
                    Priority = issue.Priority,
                    Location = issue.Location,
                    ImageUrl = issue.ImageUrl,
                    IsUrgent = issue.IsUrgent,
                    ReporterEmail = issue.ReporterEmail,
                    ReportedBy = uid,                    // Firebase UID
                    Status = "Pending",
                    ReportedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    Rating = (int?)null 
                };

                // Save in Firestore
                var docRef = _firestoreDb.Collection("issues").Document(issueDoc.Id);
                await docRef.SetAsync(issueDoc);

                string subject = "Issue Logged Successfully";
                string body = $@"
                    <p>Hi,</p>
                    <p>Your issue <b>{issue.Title}</b> has been logged successfully.</p>
                    <p>Description: {issue.Description}</p>
                    <p>Status: Pending</p>
                    <p>We will notify you once it is resolved.</p>
                    <p>-- ResHelp Maintenance Team</p>";

        await _emailService.SendEmailAsync(issue.ReporterEmail, subject, body);

                return Ok(new { message = "Issue reported successfully. Email sent..", id = issueDoc.Id });
            }
            catch (FirebaseAuthException ex)
            {
                return Unauthorized(new { error = "Invalid token: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

      [HttpGet("all")]
        public async Task<IActionResult> GetAllIssues([FromHeader(Name = "Authorization")] string authorization)
        {
            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            try
            {
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

                // Get user's email from decoded Firebase token
                string email = decodedToken.Claims["email"]?.ToString() ?? "";
                if (string.IsNullOrEmpty(email))
                    return Unauthorized(new { error = "User email not found in token." });

                // Query Firestore for issues where ReporterEmail == email
                var issuesQuery = _firestoreDb.Collection("issues").WhereEqualTo("ReporterEmail", email);
                var snapshot = await issuesQuery.GetSnapshotAsync();

                var issues = new List<Dictionary<string, object>>();

                foreach (var doc in snapshot.Documents)
                {
                    var issueDict = new Dictionary<string, object>();
                    foreach (var kvp in doc.ToDictionary())
                    {
                        if (kvp.Value is Google.Cloud.Firestore.Timestamp ts)
                        {
                            // Convert Firestore Timestamp to ISO string
                            issueDict[kvp.Key] = ts.ToDateTime().ToString("o");
                        }
                        else
                        {
                            issueDict[kvp.Key] = kvp.Value;
                        }
                    }
                    issues.Add(issueDict);
                }

                return Ok(issues);
            }
            catch (FirebaseAuthException ex)
            {
                return Unauthorized(new { error = "Invalid token: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }


                // 🆕 New Endpoint to Update Issue Details
            // 🆕 Update Issue (only allowed if reported by this user & still Pending)
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateIssue(
            string id,
            [FromBody] IssueDto issue,
            [FromHeader(Name = "Authorization")] string authorization)
        {
            if (issue == null)
                return BadRequest(new { error = "Issue data is required." });

            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            try
            {
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
                string uid = decodedToken.Uid;
                string email = decodedToken.Claims["email"]?.ToString() ?? "";

                var docRef = _firestoreDb.Collection("issues").Document(id);
                var snapshot = await docRef.GetSnapshotAsync();

                if (!snapshot.Exists)
                    return NotFound(new { error = $"Issue with ID {id} not found." });

                var existingIssue = snapshot.ToDictionary();
                string reportedByUid = existingIssue.ContainsKey("ReportedBy") ? existingIssue["ReportedBy"]?.ToString() : null;
                string reporterEmail = existingIssue.ContainsKey("ReporterEmail") ? existingIssue["ReporterEmail"]?.ToString() : null;
                string status = existingIssue.ContainsKey("Status") ? existingIssue["Status"]?.ToString() : null;

                // 1. Check Ownership by UID or Email (just like ReportIssue/GetAllIssues consistency)
                if (reportedByUid != uid && reporterEmail != email)
                {
                    return Forbid();
                }

                // 2. Check Status (only Pending can be updated)
                if (status != "Pending")
                {
                    return BadRequest(new { error = $"Only issues with 'Pending' status can be updated. Current status is '{status}'." });
                }

                // 3. Prepare Update Map (only user-editable fields)
                var updates = new Dictionary<string, object>
                {
                    { "Title", issue.Title },
                    { "Description", issue.Description },
                    { "Category", issue.Category },
                    { "Priority", issue.Priority },
                    { "Location", issue.Location },
                    { "ImageUrl", issue.ImageUrl ?? "" }, // optional
                    { "IsUrgent", issue.IsUrgent },
                    { "UpdatedAt", DateTime.UtcNow }
                };

                // 4. Perform the update
                await docRef.UpdateAsync(updates);

                return Ok(new { message = "Issue updated successfully.", id = id });
            }
            catch (FirebaseAuthException ex)
            {
                return Unauthorized(new { error = "Invalid token: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }



        [HttpPost("{id}/rate")]
        public async Task<IActionResult> RateIssue(
            string id,
            [FromBody] RatingDto ratingDto, // { int Rating }
            [FromHeader(Name = "Authorization")] string authorization)
        {
            if (ratingDto == null || ratingDto.Rating < 1 || ratingDto.Rating > 5)
                return BadRequest(new { error = "Rating must be between 1 and 5." });

            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            try
            {
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
                string uid = decodedToken.Uid;
                string email = decodedToken.Claims["email"]?.ToString() ?? "";

                var docRef = _firestoreDb.Collection("issues").Document(id);
                var snapshot = await docRef.GetSnapshotAsync();

                if (!snapshot.Exists)
                    return NotFound(new { error = $"Issue with ID {id} not found." });

                var existingIssue = snapshot.ToDictionary();
                string reportedByUid = existingIssue.ContainsKey("ReportedBy") ? existingIssue["ReportedBy"]?.ToString() : null;
                string status = existingIssue.ContainsKey("Status") ? existingIssue["Status"]?.ToString() : null;

                // Check ownership
                if (reportedByUid != uid)
                    return Forbid();

                // Only allow rating if status is Resolved
                if (status != "Resolved")
                    return BadRequest(new { error = "Only resolved issues can be rated." });

                // Update the rating
                var updates = new Dictionary<string, object>
                {
                    { "Rating", ratingDto.Rating },
                    { "UpdatedAt", DateTime.UtcNow }
                };

                await docRef.UpdateAsync(updates);

                return Ok(new { message = "Issue rated successfully.", id = id, rating = ratingDto.Rating });
            }
            catch (FirebaseAuthException ex)
            {
                return Unauthorized(new { error = "Invalid token: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}