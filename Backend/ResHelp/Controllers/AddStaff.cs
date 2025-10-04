using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using System.Net.Mail;
using System.Net;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ResHelp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AddStaffController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public AddStaffController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        // 🔐 Secure password generator
        private static string GenerateSecurePassword(int length = 12)
        {
            const string validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
            var random = new Random();
            return new string(Enumerable.Repeat(validChars, length)
                                         .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        [HttpPost]
        public async Task<IActionResult> AddStaff([FromBody] UserDto user)
        {
            // Enforce staff user type
            if (user.UserType != "staff")
            {
                user.UserType = "staff";
            }

            // 1️⃣ Generate temporary password
            string generatedPassword = GenerateSecurePassword(12);

            try
            {
                // 2️⃣ Create Firebase user with the generated password
                var firebaseUser = await FirebaseAuth.DefaultInstance.CreateUserAsync(new UserRecordArgs
                {
                    Email = user.Email,
                    Password = generatedPassword,
                    DisplayName = $"{user.Name} {user.Surname}"
                });

                // 3️⃣ Save staff details in Firestore
                var userRef = _firestoreDb.Collection("users").Document(firebaseUser.Uid);
                await userRef.SetAsync(new
                {
                    Name = user.Name,
                    Surname = user.Surname,
                    Email = user.Email,
                    Phone = user.Phone,
                    UserType = user.UserType, // "staff"
                    MaintenanceType = user.MaintenanceType,
                    Address = user.Address
                });

                // 4️⃣ Generate email verification link
                var verificationLink = await FirebaseAuth.DefaultInstance.GenerateEmailVerificationLinkAsync(user.Email);

                // 5️⃣ Send email with credentials + verification link
                using (var client = new SmtpClient("smtp.gmail.com", 587))
                {
                    client.Credentials = new NetworkCredential("muhleusurp@gmail.com", "ryxz xaud rpcb xeos"); // ⚠️ Use your App Password
                    client.EnableSsl = true;

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress("muhleusurp@gmail.com", "ResHelp Manager"),
                        Subject = "Your New Staff Account Credentials",
                        Body = $@"
                            Hello {user.Name},<br/><br/>
                            Your ResHelp staff account has been created.<br/>
                            <b>Email:</b> {user.Email}<br/>
                            <b>Temporary Password:</b> {generatedPassword}<br/><br/>
                            Please verify your email by clicking the link below:<br/>
                            <a href='{verificationLink}'>Verify Email</a><br/><br/>
                            Once verified, please log in and change your password immediately.<br/><br/>
                            Regards,<br/>ResHelp Team
                        ",
                        IsBodyHtml = true
                    };

                    mailMessage.To.Add(user.Email);
                    await client.SendMailAsync(mailMessage);
                }

                // 6️⃣ Return success response
                return Ok(new
                {
                    message = "Staff registered successfully. Credentials and verification link sent via email.",
                    id = firebaseUser.Uid,
                    name = user.Name,
                    surname = user.Surname,
                    email = user.Email,
                    phone = user.Phone,
                    maintenanceType = user.MaintenanceType
                });
            }
            catch (SmtpException smtpEx)
            {
                Console.WriteLine($"SMTP Error: {smtpEx.Message}");
                return StatusCode(500, new { error = $"Email sending failed: {smtpEx.Message}" });
            }
            catch (FirebaseAuthException fex) when (fex.AuthErrorCode == AuthErrorCode.EmailAlreadyExists)
            {
                return BadRequest(new { error = "A user with this email already exists in Firebase." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }
    }
}
