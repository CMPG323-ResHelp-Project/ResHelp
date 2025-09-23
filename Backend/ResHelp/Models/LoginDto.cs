namespace ResHelp.Models
{
    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty; // optional, used in frontend only
        public string UserType { get; set; } = string.Empty; // "student", "staff", "manager"
        public string IdToken { get; set; } = string.Empty; // token from Firebase client SDK
    }
}
