using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using ResHelp.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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

        // 🔐 Secure password generator (if you want auto Firebase accounts)
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
            if (student == null)
                return BadRequest(new { error = "Request body is empty." });

            if (string.IsNullOrEmpty(student.Email))
                return BadRequest(new { error = "Student email is required." });

            try
            {
                // Generate Firebase password if needed
                string generatedPassword = GenerateSecurePassword();

                // Create Firebase Auth user
                var firebaseUser = await FirebaseAuth.DefaultInstance.CreateUserAsync(new UserRecordArgs
                {
                    Email = student.Email,
                    Password = generatedPassword,
                    DisplayName = $"{student.Name} {student.Surname}"
                });

                // Save to Firestore
                var studentRef = _firestoreDb.Collection("students").Document(firebaseUser.Uid);
                await studentRef.SetAsync(new
                {
                    Name = student.Name,
                    Surname = student.Surname,
                    Email = student.Email,
                    Phone = student.Phone,
                    UserType = "student",
                    Address = student.Address
                });

                return Ok(new
                {
                    message = "Student registered successfully.",
                    id = firebaseUser.Uid,
                    name = student.Name,
                    surname = student.Surname,
                    email = student.Email,
                    phone = student.Phone,
                    address = student.Address
                });
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

        // --- Update Student Profile ---
        [HttpPost("profile")]
        public async Task<IActionResult> UpdateStudent([FromBody] UserDto studentUpdate, [FromHeader(Name = "Authorization")] string authorization)
        {
            if (studentUpdate == null)
                return BadRequest(new { error = "Request body is empty." });

            if (string.IsNullOrEmpty(authorization))
                return Unauthorized(new { error = "Authorization header is missing." });

            try
            {
                // Authenticate user
                var idToken = authorization.Replace("Bearer ", "").Trim();
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

                if (!decodedToken.Claims.TryGetValue("email", out object? tokenEmailObj) || tokenEmailObj == null)
                    return Unauthorized(new { error = "Token does not contain an email." });

                string tokenEmail = tokenEmailObj.ToString()!;

                // Find student document by email
                var studentsCollection = _firestoreDb.Collection("students");
                var querySnapshot = await studentsCollection.WhereEqualTo("Email", tokenEmail).GetSnapshotAsync();

                if (querySnapshot.Count == 0)
                    return NotFound(new { error = $"Authenticated student with email '{tokenEmail}' not found in Firestore." });

                var studentDoc = querySnapshot.Documents[0];
                var updateData = new Dictionary<string, object>();

                // Allowed fields to update
                if (!string.IsNullOrEmpty(studentUpdate.Name)) updateData["Name"] = studentUpdate.Name;
                if (!string.IsNullOrEmpty(studentUpdate.Surname)) updateData["Surname"] = studentUpdate.Surname;
                if (!string.IsNullOrEmpty(studentUpdate.Phone)) updateData["Phone"] = studentUpdate.Phone;
                if (!string.IsNullOrEmpty(studentUpdate.Address)) updateData["Address"] = studentUpdate.Address;

                if (updateData.Count == 0)
                    return BadRequest(new { error = "No fields provided to update." });

                await studentDoc.Reference.UpdateAsync(updateData);

                return Ok(new { message = "Student profile updated successfully." });
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

        // --- Get All Students ---
        [HttpGet("all")]
        public async Task<IActionResult> GetAllStudents()
        {
            try
            {
                var studentsSnapshot = await _firestoreDb.Collection("students").GetSnapshotAsync();
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
                var studentSnapshot = await _firestoreDb.Collection("students")
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
