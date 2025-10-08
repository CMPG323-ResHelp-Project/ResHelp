using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
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
            if (login == null || string.IsNullOrEmpty(login.UserType))
            {
                return BadRequest(new { error = "User type is required." });
            }

            try
            {
                // 🔑 Step 1: Check for hardcoded Manager/Admin
                if (login.UserType.ToLower() == "manager" || login.UserType.ToLower() == "admin")
                {
                    const string hardcodedEmail = "admin@reshelp.com";
                    const string hardcodedPassword = "Admin@123"; // choose a secure password

                    if (login.Email == hardcodedEmail && login.Password == hardcodedPassword)
                    {
                        return Ok(new
                        {
                            message = "Login successful",
                            uid = "hardcoded-admin-uid",
                            userType = login.UserType.ToLower(),
                            token = "static-token" // optional: replace with JWT if needed
                        });
                    }

                    return Unauthorized(new { error = "Incorrect email or password." });
                }

                // 🔑 Step 2: Normal flow for students/staff
                if (string.IsNullOrEmpty(login.IdToken))
                {
                    return BadRequest(new { error = "ID Token is required for non-admin users." });
                }

                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(login.IdToken);
                string uid = decodedToken.Uid;

                var userDoc = await _firestoreDb.Collection("users").Document(uid).GetSnapshotAsync();
                if (!userDoc.Exists)
                {
                    return BadRequest(new { error = "User not found in Firestore." });
                }

                var userData = userDoc.ToDictionary();

                string firestoreUserType = null;
                if (userData.TryGetValue("userType", out object lowerCaseRole))
                    firestoreUserType = lowerCaseRole.ToString();
                else if (userData.TryGetValue("UserType", out object upperCaseRole))
                    firestoreUserType = upperCaseRole.ToString();

                if (firestoreUserType == null || firestoreUserType.ToLower() != login.UserType.ToLower())
                {
                    return BadRequest(new { error = "Incorrect email or password."});
                }

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
