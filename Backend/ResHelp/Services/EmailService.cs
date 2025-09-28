using System;
using System.Net.Mail;
using System.Net;
using System.Threading.Tasks;

namespace ResHelp.Services
{
    public class EmailService
    {
        private readonly string _smtpHost;
        private readonly int _smtpPort;
        private readonly string _smtpUser;
        private readonly string _smtpPass;
        private readonly bool _enableSsl;

        // Constructor allows configuration via appsettings or environment variables
        public EmailService(string smtpHost, int smtpPort, string smtpUser, string smtpPass, bool enableSsl = true)
        {
            _smtpHost = smtpHost;
            _smtpPort = smtpPort;
            _smtpUser = smtpUser;
            _smtpPass = smtpPass;
            _enableSsl = enableSsl;
        }

        // Default constructor for Gmail (using App Password)
        public EmailService()
        {
            _smtpHost = "smtp.gmail.com";
            _smtpPort = 587; // TLS port
            _smtpUser = "muhleusurp@gmail.com";          // your Gmail
            _smtpPass = "ryxz xaud rpcb xeos";           // App Password
            _enableSsl = true;
        }

        /// <summary>
        /// Sends an email asynchronously. Logs errors if sending fails.
        /// </summary>
        /// <param name="toEmail">Recipient email address</param>
        /// <param name="subject">Email subject</param>
        /// <param name="body">Email body (HTML supported)</param>
        /// <returns></returns>
        public async Task<bool> SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                using (var client = new SmtpClient(_smtpHost, _smtpPort))
                {
                    client.EnableSsl = _enableSsl;
                    client.Credentials = new NetworkCredential(_smtpUser, _smtpPass);
                    client.Timeout = 20000; // 20 seconds timeout

                    using (var mail = new MailMessage())
                    {
                        mail.From = new MailAddress(_smtpUser, "ResHelp Maintenance");
                        mail.To.Add(toEmail);
                        mail.Subject = subject;
                        mail.Body = body;
                        mail.IsBodyHtml = true;

                        await client.SendMailAsync(mail);
                        Console.WriteLine($"Email successfully sent to {toEmail}");
                        return true;
                    }
                }
            }
            catch (SmtpException smtpEx)
            {
                // Gmail-specific SMTP errors
                Console.WriteLine($"SMTP Error sending email to {toEmail}: {smtpEx.StatusCode} - {smtpEx.Message}");
                return false;
            }
            catch (Exception ex)
            {
                // General errors
                Console.WriteLine($"Error sending email to {toEmail}: {ex.Message}");
                return false;
            }
        }
    }
}
