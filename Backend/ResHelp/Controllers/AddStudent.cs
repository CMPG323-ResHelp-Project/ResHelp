using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Net.Mail;


namespace ResHelp.Controllers
{
    [ApiController]
    [Route("studentupdate")] // Specific route for students
    public class StudentsUpdateController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public StudentsUpdateController(FirestoreDb firestoreDb)
        {
            _firestoreDb = firestoreDb;
        }

        //Secure password generator (if needed)
        private static string GenerateSecurePassword(int length = 12)
        {
            const string validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
            var random = new Random();
            return new string(Enumerable.Repeat(validChars, length)
                                         .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        // --- Add Student ---
    [HttpPost("add")] 
public async Task<IActionResult> AddStudent([FromBody] UserDto student)
{
    // Enforce student user type
    if (student.UserType != "student")
    {
        student.UserType = "student";
    }

    // Generate temporary password
    string generatedPassword = GenerateSecurePassword(12);

    try
    {
        // Create Firebase user with the generated password
        var firebaseUser = await FirebaseAuth.DefaultInstance.CreateUserAsync(new UserRecordArgs
        {
            Email = student.Email,
            Password = generatedPassword,
            DisplayName = $"{student.Name} {student.Surname}"
        });

        // Save student details in Firestore
        var studentRef = _firestoreDb.Collection("users").Document(firebaseUser.Uid);
        await studentRef.SetAsync(new
        {
            Name = student.Name,
            Surname = student.Surname,
            Email = student.Email,
            Phone = student.Phone,
            UserType = student.UserType, // "student"
            Address = student.Address // frontend should combine res_name, section, room_number
        });

        // Generate email verification link
        var verificationLink = await FirebaseAuth.DefaultInstance.GenerateEmailVerificationLinkAsync(student.Email);

        // Send email with credentials + verification link
        using (var client = new SmtpClient("smtp.gmail.com", 587))
        {
            client.Credentials = new NetworkCredential("muhleusurp@gmail.com", "ryxz xaud rpcb xeos"); // ⚠️ Use your App Password
            client.EnableSsl = true;

            var mailMessage = new MailMessage
            {
                From = new MailAddress("muhleusurp@gmail.com", "ResHelp Manager"),
                Subject = "Your New Student Account Credentials",
                Body = $@"
                    Hello {student.Name},<br/><br/>
                    Your ResHelp student account has been created.<br/>
                    <b>Email:</b> {student.Email}<br/>
                    <b>Temporary Password:</b> {generatedPassword}<br/><br/>
                    Please verify your email by clicking the link below:<br/>
                    <a href='{verificationLink}'>Verify Email</a><br/><br/>
                    Once verified, please log in and change your password immediately.<br/><br/>
                    Regards,<br/>ResHelp Team
                ",
                IsBodyHtml = true
            };

            mailMessage.To.Add(student.Email);
            await client.SendMailAsync(mailMessage);
        }

        // Return success response
        return Ok(new
        {
            message = "Student registered successfully. Credentials and verification link sent via email.",
            id = firebaseUser.Uid,
            name = student.Name,
            surname = student.Surname,
            email = student.Email,
            phone = student.Phone,
            address = student.Address
        });
    }
    catch (SmtpException smtpEx)
    {
        Console.WriteLine($"SMTP Error: {smtpEx.Message}");
        return StatusCode(500, new { error = $"Email sending failed: {smtpEx.Message}" });
    }
    catch (FirebaseAuthException fex) when (fex.AuthErrorCode == AuthErrorCode.EmailAlreadyExists)
    {
        return BadRequest(new { error = "A student with this email already exists in Firebase." });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
    }
}


 //Endpoint for updating student details, no authorization
[HttpPost("profile")]
public async Task<IActionResult> UpdateStudent([FromBody] UserDto studentUpdate)
{
    if (studentUpdate == null)
        return BadRequest(new { error = "Request body is empty." });

    try
    {
        // Locate the student in Firestore by email (from request payload)
        var usersCollection = _firestoreDb.Collection("users");
        var querySnapshot = await usersCollection.WhereEqualTo("Email", studentUpdate.Email).GetSnapshotAsync();

        if (querySnapshot.Count == 0)
            return NotFound(new { error = $"Student with email '{studentUpdate.Email}' not found in Firestore." });

        var studentDoc = querySnapshot.Documents[0];
        var updateData = new Dictionary<string, object>();

        // Only update allowed fields (exclude email)
        if (!string.IsNullOrEmpty(studentUpdate.Name)) updateData["Name"] = studentUpdate.Name;
        if (!string.IsNullOrEmpty(studentUpdate.Surname)) updateData["Surname"] = studentUpdate.Surname;
        if (!string.IsNullOrEmpty(studentUpdate.Phone)) updateData["Phone"] = studentUpdate.Phone;
        if (!string.IsNullOrEmpty(studentUpdate.Address)) updateData["Address"] = studentUpdate.Address;

        if (updateData.Count == 0)
            return BadRequest(new { error = "No fields provided to update." });

        await studentDoc.Reference.UpdateAsync(updateData);

        return Ok(new { message = "Student profile updated successfully." });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "Internal server error: " + ex.Message });
    }
}


        // --- Get All Students ---
[HttpGet("students/all")]
public async Task<IActionResult> GetAllStudents()
{
    try
    {
        // Filter to only get users with UserType = "student"
        var studentsSnapshot = await _firestoreDb.Collection("users")
            .WhereEqualTo("UserType", "student")
            .GetSnapshotAsync();

        var studentsList = new List<UserDto>();

        foreach (var doc in studentsSnapshot.Documents)
        {
            var data = doc.ToDictionary();
            studentsList.Add(new UserDto
            {
                Name = data.GetValueOrDefault("Name")?.ToString() ?? string.Empty,
                Surname = data.GetValueOrDefault("Surname")?.ToString() ?? string.Empty,
                Email = data.GetValueOrDefault("Email")?.ToString() ?? string.Empty,
                Phone = data.GetValueOrDefault("Phone")?.ToString() ?? string.Empty,
                UserType = data.GetValueOrDefault("UserType")?.ToString() ?? "student",
                Address = data.GetValueOrDefault("Address")?.ToString() ?? string.Empty
            });
        }

        return Ok(studentsList);
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = "Internal server error: " + ex.Message });
    }
}


        // --- Delete Student ---
        [HttpDelete("{email}")]
        public async Task<IActionResult> DeleteStudent(string email)
        {
            if (string.IsNullOrEmpty(email))
                return BadRequest(new { error = "Student email must be provided." });

            try
            {
                var studentSnapshot = await _firestoreDb.Collection("users")
                    .WhereEqualTo("Email", email).GetSnapshotAsync();

                if (studentSnapshot.Count == 0)
                    return NotFound(new { error = $"Student with email '{email}' not found." });

                var studentDoc = studentSnapshot.Documents[0];
                await studentDoc.Reference.DeleteAsync();

                return Ok(new { message = $"Student '{email}' deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error: " + ex.Message });
            }
        }
    }
}
