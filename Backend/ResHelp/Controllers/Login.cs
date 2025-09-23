using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class LoginController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public LoginController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginDto login)
        {
            if (login == null || string.IsNullOrEmpty(login.IdToken) || string.IsNullOrEmpty(login.UserType))
            {
                return BadRequest(new { error = "ID Token and user type are required." });
            }

            try
            {
                // Step 1: Verify the ID token from the frontend
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(login.IdToken);
                string uid = decodedToken.Uid;

                // Step 2: Fetch user from Firestore
                var userDoc = await _firestoreDb.Collection("users").Document(uid).GetSnapshotAsync();
                if (!userDoc.Exists)
                {
                    return BadRequest(new { error = "User not found in Firestore." });
                }

                var userData = userDoc.ToDictionary();

                // Step 3: Get userType safely (accept both "UserType" and "userType")
                string firestoreUserType = null;

                if (userData.TryGetValue("userType", out object lowerCaseRole))
                    firestoreUserType = lowerCaseRole.ToString();
                else if (userData.TryGetValue("UserType", out object upperCaseRole))
                    firestoreUserType = upperCaseRole.ToString();

                if (firestoreUserType == null || 
                    firestoreUserType.ToLower() != login.UserType.ToLower())
                {
                    return BadRequest(new { error = "Incorrect email, password, or user role." });
                }

                // Step 4: Return success
                return Ok(new
                {
                    message = "Login successful",
                    uid = uid,
                    userType = firestoreUserType.ToLower(),
                    token = login.IdToken
                });
            }
            catch (FirebaseAuthException ex)
            {
                return Unauthorized(new { error = "Invalid or expired token: " + ex.Message });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { error = "An internal server error occurred: " + ex.Message });
            }
        }
    }
}
