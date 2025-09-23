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
    [Route("[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public ProfileController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile([FromQuery] string uid, [FromHeader(Name = "Authorization")] string authorization)
        {
            if (string.IsNullOrEmpty(uid))
                return BadRequest(new { error = "Query parameter 'uid' is required." });

            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            try
            {
                // Verify token
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

                if (decodedToken.Uid != uid)
                    return Unauthorized(new { error = $"Token UID '{decodedToken.Uid}' does not match requested UID '{uid}'." });

                var userDoc = await _firestoreDb.Collection("users").Document(uid).GetSnapshotAsync();
                if (!userDoc.Exists)
                    return NotFound(new { error = $"User with UID '{uid}' not found in Firestore." });

                var userData = userDoc.ToDictionary();
                if (userData.Count == 0)
                    return NotFound(new { error = "User document exists but contains no data." });

                var userProfile = new UserDto
                {
                    Name = userData.GetValueOrDefault("name")?.ToString() ?? string.Empty,
                    Surname = userData.GetValueOrDefault("surname")?.ToString() ?? string.Empty,
                    Email = userData.GetValueOrDefault("email")?.ToString() ?? string.Empty,
                    Phone = userData.GetValueOrDefault("phone")?.ToString() ?? string.Empty,
                    UserType = userData.GetValueOrDefault("userType")?.ToString() ?? string.Empty,
                    Address = userData.GetValueOrDefault("address")?.ToString(),
                    MaintenanceType = userData.GetValueOrDefault("maintenanceType")?.ToString()
                };

                return Ok(userProfile);
            }
            catch (FirebaseAuthException ex)
            {
                // Token invalid or expired
                return Unauthorized(new { error = "Firebase token error: " + ex.Message, code = ex.AuthErrorCode });
            }
            catch (Exception ex)
            {
                // Any other unexpected error
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
                string uid = decodedToken.Uid;

                var userDoc = _firestoreDb.Collection("users").Document(uid);
                var updateData = new Dictionary<string, object>();

                // Only include non-empty fields
                if (!string.IsNullOrEmpty(userProfileUpdate.Name)) updateData["name"] = userProfileUpdate.Name;
                if (!string.IsNullOrEmpty(userProfileUpdate.Surname)) updateData["surname"] = userProfileUpdate.Surname;
                if (!string.IsNullOrEmpty(userProfileUpdate.Phone)) updateData["phone"] = userProfileUpdate.Phone;
                if (!string.IsNullOrEmpty(userProfileUpdate.Address)) updateData["address"] = userProfileUpdate.Address;
                if (!string.IsNullOrEmpty(userProfileUpdate.MaintenanceType)) updateData["maintenanceType"] = userProfileUpdate.MaintenanceType;

                if (updateData.Count == 0)
                    return BadRequest(new { error = "No fields provided to update." });

                await userDoc.UpdateAsync(updateData);

                return Ok(new { message = "Profile updated successfully." });
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
    }
}
