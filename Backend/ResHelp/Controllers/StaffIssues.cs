using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class StaffIssuesController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        // Map staff maintenance type to issue categories
        private readonly Dictionary<string, string[]> MaintenanceCategoryMap = new()
        {
            { "general", new string[] { "cleaning", "locks", "appliances" } },
            { "electrician", new string[] { "electrical" } },
            { "plumber", new string[] { "plumbing" } },
            { "heating_cooling", new string[] { "heating/cooling" } },
            // Add other roles if needed
        };

        public StaffIssuesController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

       [HttpGet("all")]
public async Task<IActionResult> GetStaffIssues([FromHeader(Name = "Authorization")] string authorization)
{
    if (string.IsNullOrEmpty(authorization))
        return Unauthorized(new { error = "Authorization header is missing." });

    try
    {
        // Verify Firebase token
        var idToken = authorization.Replace("Bearer ", "").Trim();
        var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

        string email = decodedToken.Claims["email"]?.ToString() ?? "";
        if (string.IsNullOrEmpty(email))
            return Unauthorized(new { error = "User email not found in token." });

        // Fetch staff user info
        var staffQuery = _firestoreDb.Collection("users").WhereEqualTo("Email", email);
        var staffSnapshot = await staffQuery.GetSnapshotAsync();
        if (staffSnapshot.Count == 0)
            return NotFound(new { error = "Staff user not found." });

        var staffDoc = staffSnapshot.Documents[0];
        string maintenanceType = staffDoc.GetValue<string>("MaintenanceType")?.ToLower() ?? "general";

        // Map maintenance type to issue categories
        if (!MaintenanceCategoryMap.TryGetValue(maintenanceType, out string[] categories))
            categories = new string[] { "general" };

        // Query Firestore for issues in these categories
        var issuesQuery = _firestoreDb.Collection("issues").WhereIn("Category", categories);
        var snapshot = await issuesQuery.GetSnapshotAsync();

        var issues = new List<Dictionary<string, object>>();

        foreach (var doc in snapshot.Documents)
        {
            var issueDict = new Dictionary<string, object>();
            foreach (var kvp in doc.ToDictionary())
            {
                if (kvp.Value is Google.Cloud.Firestore.Timestamp ts)
                    issueDict[kvp.Key] = ts.ToDateTime().ToString("o");
                else
                    issueDict[kvp.Key] = kvp.Value ?? ""; // default empty string if null
            }

            // Get DriverEmail and Status
            string driverEmail = (doc.ContainsField("DriverEmail") && doc.GetValue<string>("DriverEmail") != null)
                ? doc.GetValue<string>("DriverEmail").ToLower()
                : ""; // default to empty string

            string status = (doc.ContainsField("Status") && doc.GetValue<string>("Status") != null)
                ? doc.GetValue<string>("Status").ToLower()
                : "pending"; // default to pending if missing

            
            if (status == "pending" || driverEmail == email.ToLower())
            {
                issues.Add(issueDict);
            }
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


[HttpGet("dashboard")]
public async Task<IActionResult> GetStaffDashboard([FromHeader(Name = "Authorization")] string authorization)
{
    if (string.IsNullOrEmpty(authorization))
        return Unauthorized(new { error = "Authorization header is missing." });

    try
    {
        // Verify Firebase token
        var idToken = authorization.Replace("Bearer ", "").Trim();
        var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
        string email = decodedToken.Claims["email"]?.ToString()?.ToLower() ?? "";

        if (string.IsNullOrEmpty(email))
            return Unauthorized(new { error = "User email not found in token." });

        // Fetch staff info
        var staffQuery = _firestoreDb.Collection("users").WhereEqualTo("Email", email);
        var staffSnapshot = await staffQuery.GetSnapshotAsync();
        if (staffSnapshot.Count == 0)
            return NotFound(new { error = "Staff user not found." });

        var staffDoc = staffSnapshot.Documents[0];
        string maintenanceType = staffDoc.GetValue<string>("MaintenanceType")?.ToLower() ?? "general";

        // Map maintenance type to categories
        if (!MaintenanceCategoryMap.TryGetValue(maintenanceType, out string[] categories))
            categories = new string[] { "general" };

        // Query Firestore for issues in these categories
        var issuesQuery = _firestoreDb.Collection("issues").WhereIn("Category", categories);
        var snapshot = await issuesQuery.GetSnapshotAsync();

        // Initialize lists and counters
        var recentIssues = new List<Dictionary<string, object>>();
        var workingOnIssues = new List<Dictionary<string, object>>();
        int totalIssues = 0, pendingIssues = 0, inProgressIssues = 0, resolvedToday = 0, urgentIssues = 0;

        foreach (var doc in snapshot.Documents)
        {
            var issueDict = new Dictionary<string, object>();
            foreach (var kvp in doc.ToDictionary())
            {
                if (kvp.Value is Google.Cloud.Firestore.Timestamp ts)
                    issueDict[kvp.Key] = ts.ToDateTime().ToString("o");
                else
                    issueDict[kvp.Key] = kvp.Value ?? "";
            }

            // Get DriverEmail and Status safely
            string driverEmail = (doc.ContainsField("DriverEmail") && doc.GetValue<string>("DriverEmail") != null)
                ? doc.GetValue<string>("DriverEmail").ToLower()
                : "";

            string status = (doc.ContainsField("Status") && doc.GetValue<string>("Status") != null)
                ? doc.GetValue<string>("Status").ToLower()
                : "pending";

            bool isUrgent = doc.ContainsField("IsUrgent") && doc.GetValue<bool>("IsUrgent");

            // Include issue if pending OR assigned to this staff
            if (status == "pending" || driverEmail == email)
            {
                recentIssues.Add(issueDict);
                totalIssues++;
                if (status == "pending") pendingIssues++;
                if (status == "in-progress") inProgressIssues++;
                if (status == "resolved")
                {
                    // Check if resolved today
                    if (doc.ContainsField("UpdatedAt") && doc.GetValue<Google.Cloud.Firestore.Timestamp>("UpdatedAt").ToDateTime().Date == DateTime.UtcNow.Date)
                        resolvedToday++;
                }
                if (isUrgent) urgentIssues++;

                // Separate workingOnIssues: in-progress assigned to this staff
                if ((status == "in-progress" || status == "assigned") && driverEmail == email)
                    workingOnIssues.Add(issueDict);
            }
        }

        //Return structured object for frontend
        return Ok(new
        {
            dashboardStats = new
            {
                totalIssues,
                pendingIssues,
                inProgressIssues,
                resolvedToday,
                urgentIssues
            },
            recentIssues,
            workingOnIssues
        });
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



[HttpGet("{id}")]
public async Task<IActionResult> GetStaffIssueById(string id, [FromHeader(Name = "Authorization")] string authorization)
{
    if (string.IsNullOrEmpty(authorization))
        return Unauthorized(new { error = "Authorization header is missing." });

    try
    {
        var idToken = authorization.Replace("Bearer ", "").Trim();
        var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

        string email = decodedToken.Claims["email"]?.ToString() ?? "";
        if (string.IsNullOrEmpty(email))
            return Unauthorized(new { error = "User email not found in token." });

        // Get staff info
        var staffQuery = _firestoreDb.Collection("users").WhereEqualTo("Email", email);
        var staffSnapshot = await staffQuery.GetSnapshotAsync();
        if (staffSnapshot.Count == 0)
            return NotFound(new { error = "Staff user not found." });

        // Get issue by id
        var issueDoc = await _firestoreDb.Collection("issues").Document(id).GetSnapshotAsync();
        if (!issueDoc.Exists)
            return NotFound(new { error = "Issue not found." });

        var issueDict = new Dictionary<string, object>();
        foreach (var kvp in issueDoc.ToDictionary())
        {
            if (kvp.Value is Google.Cloud.Firestore.Timestamp ts)
                issueDict[kvp.Key] = ts.ToDateTime().ToString("o");
            else
                issueDict[kvp.Key] = kvp.Value;
        }

        // Fetch student info by ReporterEmail
        if (issueDict.TryGetValue("ReporterEmail", out var reporterEmailObj))
        {
            string reporterEmail = reporterEmailObj.ToString();
            var studentQuery = _firestoreDb.Collection("users")
                .WhereEqualTo("Email", reporterEmail)
                .WhereEqualTo("UserType", "student");

            var studentSnapshot = await studentQuery.GetSnapshotAsync();
            if (studentSnapshot.Count > 0)
            {
                var studentDoc = studentSnapshot.Documents[0];
                issueDict["StudentName"] = studentDoc.GetValue<string>("Name") ?? "";
                issueDict["StudentSurname"] = studentDoc.GetValue<string>("Surname") ?? "";
                issueDict["StudentAddress"] = studentDoc.GetValue<string>("Address") ?? "";
                issueDict["StudentPhone"] = studentDoc.GetValue<string>("Phone") ?? "";
                issueDict["StudentEmail"] = studentDoc.GetValue<string>("Email") ?? reporterEmail;
            }
        }

        return Ok(issueDict);
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


        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateIssueStatus(
          string id,
          [FromHeader(Name = "Authorization")] string authorization,
          [FromBody] Dictionary<string, string> body)
        {
            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            if (!body.ContainsKey("status"))
                return BadRequest(new { error = "Status is required in request body." });

            try
            {
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

                string email = decodedToken.Claims["email"]?.ToString() ?? "";
                if (string.IsNullOrEmpty(email))
                    return Unauthorized(new { error = "User email not found in token." });

                var staffQuery = _firestoreDb.Collection("users").WhereEqualTo("Email", email);
                var staffSnapshot = await staffQuery.GetSnapshotAsync();
                if (staffSnapshot.Count == 0)
                    return NotFound(new { error = "Staff user not found." });

                var staffDoc = staffSnapshot.Documents[0];
                string name = staffDoc.GetValue<string>("Name") ?? "";
                string surname = staffDoc.GetValue<string>("Surname") ?? "";
                string staffEmail = staffDoc.GetValue<string>("Email") ?? "";
                string address = staffDoc.GetValue<string>("Address") ?? "";
                string phone = staffDoc.GetValue<string>("Phone") ?? "";
                string maintenanceType = staffDoc.GetValue<string>("MaintenanceType") ?? "";

                var issueDoc = _firestoreDb.Collection("issues").Document(id);
                var snapshot = await issueDoc.GetSnapshotAsync();
                if (!snapshot.Exists)
                    return NotFound(new { error = "Issue not found." });

                var updates = new Dictionary<string, object>
        {
            { "Status", body["status"] },
            { "UpdatedAt", Timestamp.GetCurrentTimestamp() }
        };

                if (body["status"] == "assigned")
                {
                    updates["DriverEmail"] = staffEmail;
                    updates["DriverName"] = name;
                    updates["DriverSurname"] = surname;
                    updates["DriverPhone"] = phone;
                    updates["DriverAddress"] = address;
                    updates["AssignedAt"] = Timestamp.GetCurrentTimestamp(); 
                }
                else if (body["status"] == "in progress")
                {
                    updates["DriverEmail"] = staffEmail;
                    updates["DriverName"] = name;
                    updates["DriverSurname"] = surname;
                    updates["DriverPhone"] = phone;
                    updates["DriverAddress"] = address;
                }

                await issueDoc.UpdateAsync(updates);

                return Ok(new { message = "Status updated successfully", status = body["status"] });
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

[HttpGet("history")]
public async Task<IActionResult> GetStaffIssueHistory([FromHeader(Name = "Authorization")] string authorization)
{
    if (string.IsNullOrEmpty(authorization))
        return Unauthorized(new { error = "Authorization header is missing." });

    try
    {
        // Verify Firebase token
        var idToken = authorization.Replace("Bearer ", "").Trim();
        var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

        string email = decodedToken.Claims["email"]?.ToString().ToLower() ?? "";
        if (string.IsNullOrEmpty(email))
            return Unauthorized(new { error = "User email not found in token." });

        // Fetch staff info to ensure user exists
        var staffQuery = _firestoreDb.Collection("users").WhereEqualTo("Email", email);
        var staffSnapshot = await staffQuery.GetSnapshotAsync();
        if (staffSnapshot.Count == 0)
            return NotFound(new { error = "Staff user not found." });

        // Query Firestore for issues assigned to this staff
        var issuesQuery = _firestoreDb.Collection("issues")
            .WhereEqualTo("DriverEmail", email);

        var snapshot = await issuesQuery.GetSnapshotAsync();

        var resolvedIssues = new List<Dictionary<string, object>>();
        double ratingSum = 0;
        int ratingCount = 0;
        int totalResolvedCancelled = 0;

        foreach (var doc in snapshot.Documents)
        {
            string status = (doc.ContainsField("Status") && doc.GetValue<string>("Status") != null)
                ? doc.GetValue<string>("Status").ToLower()
                : "";

            // Only include resolved or cancelled issues
            if (status != "resolved" && status != "cancelled") continue;

            totalResolvedCancelled++;

            // Build issue dictionary
            var issueDict = new Dictionary<string, object>();
            foreach (var kvp in doc.ToDictionary())
            {
                if (kvp.Value is Google.Cloud.Firestore.Timestamp ts)
                    issueDict[kvp.Key] = ts.ToDateTime().ToString("o");
                else
                    issueDict[kvp.Key] = kvp.Value ?? "";
            }

            resolvedIssues.Add(issueDict);

            // Calculate rating if exists
            if (doc.ContainsField("Rating") && doc.GetValue<double?>("Rating") is double rating && rating > 0)
            {
                ratingSum += rating;
                ratingCount++;
            }
        }

        double overallRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

        return Ok(new
        {
            totalResolvedCancelled,
            overallRating,
            ratedCount = ratingCount,
            resolvedIssues
        });
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
