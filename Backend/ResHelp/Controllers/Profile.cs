using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Net.Mail; 
using System.Net;

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public ProfileController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile([FromQuery] string email, [FromHeader(Name = "Authorization")] string authorization)
        {
            if (string.IsNullOrEmpty(email))
                return BadRequest(new { error = "Query parameter 'email' is required." });

            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            try
            {
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

                // Get email from claims
                if (!decodedToken.Claims.TryGetValue("email", out object? emailObj) || emailObj == null)
                    return Unauthorized(new { error = "Token does not contain an email." });

                string tokenEmail = emailObj.ToString()!;
                if (!string.Equals(tokenEmail, email, StringComparison.OrdinalIgnoreCase))
                    return Unauthorized(new { error = $"Token email '{tokenEmail}' does not match requested email '{email}'." });

                // Fetch user document from Firestore using **Email** field
                var usersCollection = _firestoreDb.Collection("users");
                var querySnapshot = await usersCollection.WhereEqualTo("Email", tokenEmail).GetSnapshotAsync();

                if (querySnapshot.Count == 0)
                    return NotFound(new { error = $"User with email '{tokenEmail}' not found in Firestore." });

                var userDoc = querySnapshot.Documents[0];
                var userData = userDoc.ToDictionary();

                if (userData.Count == 0)
                    return NotFound(new { error = "User document exists but contains no data." });

                var userProfile = new UserDto
                {
                    Name = userData.GetValueOrDefault("Name")?.ToString() ?? string.Empty,
                    Surname = userData.GetValueOrDefault("Surname")?.ToString() ?? string.Empty,
                    Email = userData.GetValueOrDefault("Email")?.ToString() ?? string.Empty, // capital E
                    Phone = userData.GetValueOrDefault("Phone")?.ToString() ?? string.Empty,
                    UserType = userData.GetValueOrDefault("UserType")?.ToString() ?? string.Empty,
                    Address = userData.GetValueOrDefault("Address")?.ToString(),
                    MaintenanceType = userData.GetValueOrDefault("MaintenanceType")?.ToString()
                };

                return Ok(userProfile);
            }
            catch (FirebaseAuthException ex)
            {
                return Unauthorized(new { error = "Firebase token error: " + ex.Message, code = ex.AuthErrorCode });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error: " + ex.Message });
            }
        }

[HttpPost("update")]
public async Task<IActionResult> UpdateProfile([FromBody] UserDto userProfileUpdate, [FromHeader(Name = "Authorization")] string authorization)
{
    if (userProfileUpdate == null)
        return BadRequest(new { error = "Request body is empty." });

    if (string.IsNullOrEmpty(authorization))
        return Unauthorized(new { error = "Authorization header is missing." });

    try
    {
        var idToken = authorization.Replace("Bearer ", "").Trim();
        var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

        if (!decodedToken.Claims.TryGetValue("email", out object? emailObj) || emailObj == null)
            return Unauthorized(new { error = "Token does not contain an email." });

        string oldEmail = emailObj.ToString()!;
        var usersCollection = _firestoreDb.Collection("users");
        var querySnapshot = await usersCollection.WhereEqualTo("Email", oldEmail).GetSnapshotAsync();

        if (querySnapshot.Count == 0)
            return NotFound(new { error = $"User with email '{oldEmail}' not found in Firestore." });

        var userDoc = querySnapshot.Documents[0];
        var updateData = new Dictionary<string, object>();

        // Update Firestore fields
        if (!string.IsNullOrEmpty(userProfileUpdate.Name)) updateData["Name"] = userProfileUpdate.Name;
        if (!string.IsNullOrEmpty(userProfileUpdate.Surname)) updateData["Surname"] = userProfileUpdate.Surname;
        if (!string.IsNullOrEmpty(userProfileUpdate.Phone)) updateData["Phone"] = userProfileUpdate.Phone;
        if (!string.IsNullOrEmpty(userProfileUpdate.Address)) updateData["Address"] = userProfileUpdate.Address;
        if (!string.IsNullOrEmpty(userProfileUpdate.MaintenanceType)) updateData["MaintenanceType"] = userProfileUpdate.MaintenanceType;

        string newEmail = oldEmail;

        // Update email and generate new password if email changed
        if (!string.IsNullOrEmpty(userProfileUpdate.Email) && userProfileUpdate.Email != oldEmail)
        {
            newEmail = userProfileUpdate.Email;
            string newPassword = GenerateRandomPassword(12);

            // Update Firebase Auth
            await FirebaseAuth.DefaultInstance.UpdateUserAsync(new FirebaseAdmin.Auth.UserRecordArgs
            {
                Uid = decodedToken.Uid,
                Email = newEmail,
                Password = newPassword
            });

            updateData["Email"] = newEmail;

            // Send new password to updated email
            using (var client = new SmtpClient("smtp.gmail.com", 587))
            {
                client.Credentials = new NetworkCredential("muhleusurp@gmail.com", "ryxz xaud rpcb xeos");
                client.EnableSsl = true;

                var mailMessage = new MailMessage
                {
                    From = new MailAddress("muhleusurp@gmail.com", "ResHelp"),
                    Subject = "Your account has been updated",
                    Body = $"Hello {userProfileUpdate.Name},<br/><br/>Your email was updated. Here is your new temporary password:<br/><strong>{newPassword}</strong><br/><br/>Please log in and change it immediately.",
                    IsBodyHtml = true
                };
                mailMessage.To.Add(newEmail);
                await client.SendMailAsync(mailMessage);
            }
        }

        if (updateData.Count > 0)
            await userDoc.Reference.UpdateAsync(updateData);

        // --- NEW: Update all issues where DriverEmail == oldEmail ---
        var issuesQuery = _firestoreDb.Collection("issues").WhereEqualTo("DriverEmail", oldEmail);
        var issuesSnapshot = await issuesQuery.GetSnapshotAsync();

        foreach (var issueDoc in issuesSnapshot.Documents)
        {
            var issueUpdate = new Dictionary<string, object>
            {
                ["DriverEmail"] = newEmail,
                ["DriverName"] = userProfileUpdate.Name ?? userDoc.GetValue<string>("Name"),
                ["DriverSurname"] = userProfileUpdate.Surname ?? userDoc.GetValue<string>("Surname"),
                ["DriverPhone"] = userProfileUpdate.Phone ?? userDoc.GetValue<string>("Phone"),
                ["DriverAddress"] = userProfileUpdate.Address ?? userDoc.GetValue<string>("Address")
            };

            await issueDoc.Reference.UpdateAsync(issueUpdate);
        }

        return Ok(new { message = "Profile updated successfully. All assigned issues have been updated accordingly." });
    }
    catch (FirebaseAuthException ex)
    {
        return Unauthorized(new { error = "Firebase token error: " + ex.Message, code = ex.AuthErrorCode });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "Internal server error: " + ex.Message });
    }
}


// Helper function to generate a strong random password
private string GenerateRandomPassword(int length = 12)
{
    const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    var random = new Random();
    return new string(Enumerable.Repeat(chars, length).Select(s => s[random.Next(s.Length)]).ToArray());
}


    }
}