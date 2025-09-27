using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("userupdate")] // Changed route to be specific
    public class UserUpdateController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public UserUpdateController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        // 🎯 Endpoint for updating user details, excluding email.
        [HttpPost("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UserDto userProfileUpdate, [FromHeader(Name = "Authorization")] string authorization)
        {
            if (userProfileUpdate == null)
                return BadRequest(new { error = "Request body is empty." });

            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            try
            {
                // 1. Authenticate and authorize the user using the Firebase token.
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

                // Get the current, immutable email from the token
                if (!decodedToken.Claims.TryGetValue("email", out object? emailObj) || emailObj == null)
                    return Unauthorized(new { error = "Token does not contain an email." });

                string tokenEmail = emailObj.ToString()!;
                
                // 2. Locate the user document in Firestore using the verified email.
                var usersCollection = _firestoreDb.Collection("users");
                var querySnapshot = await usersCollection.WhereEqualTo("Email", tokenEmail).GetSnapshotAsync();

                if (querySnapshot.Count == 0)
                    return NotFound(new { error = $"Authenticated user with email '{tokenEmail}' not found in Firestore." });

                var userDoc = querySnapshot.Documents[0];
                var updateData = new Dictionary<string, object>();

                // 3. Collect updates only for allowed fields (excluding Email).
                
                // Fields to update in Firestore
                if (!string.IsNullOrEmpty(userProfileUpdate.Name)) updateData["Name"] = userProfileUpdate.Name;
                if (!string.IsNullOrEmpty(userProfileUpdate.Surname)) updateData["Surname"] = userProfileUpdate.Surname;
                if (!string.IsNullOrEmpty(userProfileUpdate.Phone)) updateData["Phone"] = userProfileUpdate.Phone;
                if (!string.IsNullOrEmpty(userProfileUpdate.Address)) updateData["Address"] = userProfileUpdate.Address;
                if (!string.IsNullOrEmpty(userProfileUpdate.MaintenanceType)) updateData["MaintenanceType"] = userProfileUpdate.MaintenanceType;

                // ⚠️ FINAL SECURITY CHECK: Ensure Email update is strictly ignored 
                // (even if the frontend mistakenly sends it).
                if (userProfileUpdate.Email != null) 
                {
                    // This block does nothing with the email, enforcing the immutable policy.
                    // We can optionally log this attempt or return a specific error, but ignoring it is simpler
                    // since the frontend is instructed to disable the field.
                }

                if (updateData.Count == 0)
                    return BadRequest(new { error = "No fields provided to update." });

                // 4. Apply the updates to Firestore.
                await userDoc.Reference.UpdateAsync(updateData);

                return Ok(new { message = "Profile details updated successfully." });
            }
            catch (FirebaseAuthException ex)
            {
                // Catches issues like an expired or invalid token
                return Unauthorized(new { error = "Authentication failed: " + ex.Message, code = ex.AuthErrorCode });
            }
            catch (Exception ex)
            {
                // Catches any other internal server or database errors
                return StatusCode(500, new { error = "Internal server error: " + ex.Message });
            }
        }
  [HttpPost("staff")]
public async Task<IActionResult> UpdateStaff([FromBody] UserDto staffUpdate, [FromHeader(Name = "Authorization")] string authorization)
{
    if (staffUpdate == null)
        return BadRequest(new { error = "Request body is empty." });

    if (string.IsNullOrEmpty(authorization))
        return Unauthorized(new { error = "Authorization header is missing." });

    try
    {
        // 1. Authenticate the user making the request
        var idToken = authorization.Replace("Bearer ", "").Trim();
        var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

        if (!decodedToken.Claims.TryGetValue("email", out object? userEmailObj) || userEmailObj == null)
            return Unauthorized(new { error = "Token does not contain an email." });

        string userEmail = userEmailObj.ToString()!;

        // 2. Ensure staff email is provided
        if (string.IsNullOrEmpty(staffUpdate.Email))
            return BadRequest(new { error = "Staff email must be provided." });

        // 3. Locate the staff document by email
        var usersCollection = _firestoreDb.Collection("users");
        var staffSnapshot = await usersCollection.WhereEqualTo("Email", staffUpdate.Email).GetSnapshotAsync();

        if (staffSnapshot.Count == 0)
            return NotFound(new { error = $"Staff with email '{staffUpdate.Email}' not found." });

        var staffDoc = staffSnapshot.Documents[0];
        var updateData = new Dictionary<string, object>();

        // Allowed fields for staff update
        if (!string.IsNullOrEmpty(staffUpdate.Name)) updateData["Name"] = staffUpdate.Name;
        if (!string.IsNullOrEmpty(staffUpdate.Surname)) updateData["Surname"] = staffUpdate.Surname;
        if (!string.IsNullOrEmpty(staffUpdate.Phone)) updateData["Phone"] = staffUpdate.Phone;
        if (!string.IsNullOrEmpty(staffUpdate.Address)) updateData["Address"] = staffUpdate.Address;
        if (!string.IsNullOrEmpty(staffUpdate.MaintenanceType)) updateData["MaintenanceType"] = staffUpdate.MaintenanceType;

        // Ensure we don’t accidentally overwrite email
        // Email is only used to locate staff

        if (updateData.Count == 0)
            return BadRequest(new { error = "No fields provided to update." });

        // 4. Apply updates to Firestore
        await staffDoc.Reference.UpdateAsync(updateData);

        return Ok(new { message = $"Staff '{staffUpdate.Email}' updated successfully." });
    }
    catch (FirebaseAuthException ex)
    {
        return Unauthorized(new { error = "Authentication failed: " + ex.Message, code = ex.AuthErrorCode });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "Internal server error: " + ex.Message });
    }
}

[HttpGet("staff/all")]
public async Task<IActionResult> GetAllStaff()
{
    try
    {
        var staffSnapshot = await _firestoreDb.Collection("users")
            .WhereEqualTo("UserType", "staff").GetSnapshotAsync();

        var staffList = new List<UserDto>();
        foreach (var doc in staffSnapshot.Documents)
        {
            var data = doc.ToDictionary();
            staffList.Add(new UserDto
            {
                Name = data.GetValueOrDefault("Name")?.ToString() ?? string.Empty,
                Surname = data.GetValueOrDefault("Surname")?.ToString() ?? string.Empty,
                Email = data.GetValueOrDefault("Email")?.ToString() ?? string.Empty,
                Phone = data.GetValueOrDefault("Phone")?.ToString() ?? string.Empty,
                UserType = data.GetValueOrDefault("UserType")?.ToString() ?? string.Empty,
                Address = data.GetValueOrDefault("Address")?.ToString(),
                MaintenanceType = data.GetValueOrDefault("MaintenanceType")?.ToString()
            });
        }

        return Ok(staffList);
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "Internal server error: " + ex.Message });
    }
}

[HttpDelete("staff/{email}")]
public async Task<IActionResult> DeleteStaff(string email)
{
    if (string.IsNullOrEmpty(email))
        return BadRequest(new { error = "Staff email must be provided." });

    try
    {
        var staffSnapshot = await _firestoreDb.Collection("users")
            .WhereEqualTo("Email", email).GetSnapshotAsync();

        if (staffSnapshot.Count == 0)
            return NotFound(new { error = $"Staff with email '{email}' not found." });

        var staffDoc = staffSnapshot.Documents[0];
        await staffDoc.Reference.DeleteAsync();

        return Ok(new { message = $"Staff '{email}' deleted successfully." });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "Internal server error: " + ex.Message });
    }
}


    }
}