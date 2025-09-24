using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using System.Net.Mail;
using System.Net;

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
                // 1️⃣ Create Firebase user
                var firebaseUser = await FirebaseAuth.DefaultInstance.CreateUserAsync(new UserRecordArgs
                {
                    Email = user.Email,
                    Password = user.Password,
                    DisplayName = user.Name
                });

                // 2️⃣ Store user in Firestore
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

                // 3️⃣ Generate email verification link
                var verificationLink = await FirebaseAuth.DefaultInstance.GenerateEmailVerificationLinkAsync(user.Email);

                // 4️⃣ Send verification email automatically via Gmail
                using (var client = new SmtpClient("smtp.gmail.com", 587))
                {
                    client.Credentials = new NetworkCredential("muhleusurp@gmail.com", "ryxz xaud rpcb xeos");
                    client.EnableSsl = true;

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress("muhleusurp@gmail.com", "ResHelp"),
                        Subject = "Verify your email",
                        Body = $"Hello {user.Name},<br/><br/>Please verify your email by clicking the link below:<br/><a href='{verificationLink}'>Verify Email</a><br/><br/>Thank you!",
                        IsBodyHtml = true
                    };
                    mailMessage.To.Add(user.Email);

                    await client.SendMailAsync(mailMessage);
                }

                return Ok(new { message = "User registered successfully. A verification email has been sent.", uid = firebaseUser.Uid });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
