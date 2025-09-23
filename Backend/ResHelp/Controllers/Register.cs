using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class RegisterController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public RegisterController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromBody] UserDto user)
        {
            try
            {
                var firebaseUser = await FirebaseAuth.DefaultInstance.CreateUserAsync(new UserRecordArgs
                {
                    Email = user.Email,
                    Password = user.Password,
                    DisplayName = user.Name
                });

                var userRef = _firestoreDb.Collection("users").Document(firebaseUser.Uid);
                await userRef.SetAsync(new
                {
                    Name = user.Name,
                    Surname = user.Surname,
                    Email = user.Email,
                    Phone = user.Phone,
                    UserType = user.UserType,
                    MaintenanceType = user.MaintenanceType,
                    Address = user.Address
                });

                return Ok(new { message = "User registered successfully", uid = firebaseUser.Uid });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
